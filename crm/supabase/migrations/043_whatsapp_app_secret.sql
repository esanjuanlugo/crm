-- 043: App Secret de Meta por conexion de WhatsApp.
--
-- Cada cuenta (dueno) puede usar su propia app de Meta. Para validar la
-- firma del webhook (x-hub-signature-256) se usa la clave secreta guardada
-- aqui (cifrada igual que access_token) y, si no hay, META_APP_SECRET del
-- servidor como respaldo.

ALTER TABLE whatsapp_config
  ADD COLUMN IF NOT EXISTS app_secret TEXT;

COMMENT ON COLUMN whatsapp_config.app_secret IS
  'Meta App Secret cifrado (AES-GCM, mismo esquema que access_token). Opcional: si es NULL se usa META_APP_SECRET.';
