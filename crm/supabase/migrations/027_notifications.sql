-- ============================================================
-- NOTIFICACIONES
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  -- Recipient — the agent this notification is for.
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'conversation_assigned'
    CHECK (type IN ('conversation_assigned')),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  -- Quién generó la notificación. NULL significa que fue una
  -- automatización / el sistema y no un compañero conectado.
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  body TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications(user_id)
  WHERE read_at IS NULL;
-- Identidad de réplica completa para que los eventos UPDATE de Realtime
-- incluyan los valores anteriores de las columnas. Sin esto, payload.old
-- solo contiene la clave primaria, lo que hace imposible determinar
-- si una fila estaba sin leer antes de la actualización.
ALTER TABLE notifications REPLICA IDENTITY FULL;

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Los destinatarios pueden leer sus propias notificaciones y
-- marcarlas como leídas.
-- No existe una política INSERT/DELETE para el cliente:
-- las filas son creadas exclusivamente por la función trigger
-- SECURITY DEFINER que se encuentra a continuación.
DROP POLICY IF EXISTS notifications_select ON notifications;
DROP POLICY IF EXISTS notifications_update ON notifications;
CREATE POLICY notifications_select ON notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Solo las actualizaciones de read_at son relevantes desde el cliente;
-- se restringe mediante una política de seguridad a nivel de columnas
-- para evitar que otros campos puedan ser modificados.
CREATE POLICY notifications_update ON notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Restringir exclusivamente a la columna read_at mediante privilegios
-- a nivel de columna para impedir que los clientes sobrescriban title,
-- body u otros campos inmutables.
REVOKE UPDATE ON notifications FROM authenticated;

GRANT UPDATE (read_at) ON notifications TO authenticated;

-- ============================================================
-- TRIGGER — notificar cuando se asigna una conversación
-- ============================================================
CREATE OR REPLACE FUNCTION notify_conversation_assigned()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contact_name TEXT;
  v_actor_name TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.assigned_agent_id IS NULL THEN
      RETURN NEW;
    END IF;
  ELSE
    IF NEW.assigned_agent_id IS NULL
       OR NEW.assigned_agent_id IS NOT DISTINCT FROM OLD.assigned_agent_id THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Omitir la autoasignación — no hay nada que notificar al agente.
  IF auth.uid() IS NOT NULL AND auth.uid() = NEW.assigned_agent_id THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(NULLIF(name, ''), phone) INTO v_contact_name
  FROM contacts WHERE id = NEW.contact_id;

  IF auth.uid() IS NOT NULL THEN
    SELECT full_name INTO v_actor_name
    FROM profiles WHERE user_id = auth.uid();
  END IF;

  INSERT INTO notifications (
    account_id, user_id, type, conversation_id, contact_id,
    actor_user_id, title, body
  ) VALUES (
    NEW.account_id,
    NEW.assigned_agent_id,
    'conversation_assigned',
    NEW.id,
    NEW.contact_id,
    auth.uid(),
    'Nueva conversación asignada',
    COALESCE(v_actor_name, 'Alguien') || ' te asignó una conversación con '
      || COALESCE(v_contact_name, 'un contacto')
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Nunca permitir que un fallo al crear una notificación
  -- bloquee la asignación de la conversación.
  RAISE WARNING 'Failed to create assignment notification for conversation %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

ALTER FUNCTION notify_conversation_assigned() OWNER TO postgres;

DROP TRIGGER IF EXISTS on_conversation_assigned ON conversations;
CREATE TRIGGER on_conversation_assigned
  AFTER INSERT OR UPDATE OF assigned_agent_id ON conversations
  FOR EACH ROW EXECUTE FUNCTION notify_conversation_assigned();

-- ============================================================
-- ACTIVAR REALTIME
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  END IF;
END $$;
