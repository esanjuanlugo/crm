-- ============================================================
-- 045 — System stages: every pipeline ends with "Perdida" (lost)
-- and "Ganada" (won), and the stage decides deals.status.
--
-- Before this, deals.status (open/won/lost) was independent of the
-- stage, and "Ganada"/"Perdida" were ordinary stages (Perdida even
-- got a 90 % probability in the weighted value). Now:
--   * pipeline_stages.kind is 'open' | 'won' | 'lost';
--   * each pipeline has exactly one 'lost' and one 'won' stage,
--     created automatically, impossible to delete, recolor or
--     re-kind (renaming is allowed);
--   * a trigger derives deals.status from the stage kind on every
--     insert / stage change, so every writer (board, deal form,
--     automations, imports) gets the same rule.
--
-- Safe to re-run: every step is IF NOT EXISTS / CREATE OR REPLACE /
-- DROP … IF EXISTS, and the data steps only touch rows that are not
-- already in the target state.
--
-- No BEGIN/COMMIT here on purpose: both runners already make a
-- migration atomic (the VPS script uses psql --single-transaction and
-- the Supabase Management API runs a multi-statement query as one
-- implicit transaction). An explicit COMMIT inside the file would end
-- that transaction early and split the migration from its
-- schema_migrations record.
-- ============================================================

-- ---- 0. deals.closed_at (self-contained) --------------------------
-- Same column, function and backfill as 044, repeated here because a
-- database can have 044 recorded as applied without its contents (a
-- version-number clash): this migration must not depend on it.
ALTER TABLE deals
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION set_deal_closed_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status IN ('won', 'lost') THEN
    IF TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status THEN
      NEW.closed_at := COALESCE(
        CASE WHEN TG_OP = 'INSERT' THEN NEW.closed_at END,
        NOW()
      );
    END IF;
  ELSE
    NEW.closed_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

-- Backfill without touching updated_at (USER = every non-internal
-- trigger on deals; FK checks stay on).
ALTER TABLE deals DISABLE TRIGGER USER;
UPDATE deals
   SET closed_at = COALESCE(updated_at, created_at)
 WHERE status IN ('won', 'lost')
   AND closed_at IS NULL;
ALTER TABLE deals ENABLE TRIGGER USER;

CREATE INDEX IF NOT EXISTS idx_deals_closed_at
  ON deals (account_id, closed_at)
  WHERE closed_at IS NOT NULL;

-- ---- 1. Column + constraints ------------------------------------
ALTER TABLE pipeline_stages
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'open';

ALTER TABLE pipeline_stages
  DROP CONSTRAINT IF EXISTS pipeline_stages_kind_check;
ALTER TABLE pipeline_stages
  ADD CONSTRAINT pipeline_stages_kind_check CHECK (kind IN ('open', 'won', 'lost'));

-- ---- 2. Data: convert / create the system stages -----------------
-- Existing stages named "Ganada"/"Perdida" (case and accent
-- insensitive, plus a few synonyms) become the system stages instead
-- of creating duplicates. If a pipeline has several, the one with the
-- highest position wins; the rest stay as ordinary stages.
DO $$
DECLARE
  p RECORD;
  won_id UUID;
  lost_id UUID;
  n_open INT;
BEGIN
  FOR p IN SELECT id FROM pipelines LOOP
    SELECT id INTO won_id FROM pipeline_stages
     WHERE pipeline_id = p.id AND kind = 'won' LIMIT 1;
    IF won_id IS NULL THEN
      SELECT id INTO won_id FROM pipeline_stages
       WHERE pipeline_id = p.id
         AND lower(trim(translate(name, 'áéíóúÁÉÍÓÚ', 'aeiouAEIOU')))
             IN ('ganada', 'ganado', 'ganadas', 'ganados', 'won', 'closed won', 'cerrada ganada')
       ORDER BY position DESC, created_at DESC
       LIMIT 1;
    END IF;

    SELECT id INTO lost_id FROM pipeline_stages
     WHERE pipeline_id = p.id AND kind = 'lost' LIMIT 1;
    IF lost_id IS NULL THEN
      SELECT id INTO lost_id FROM pipeline_stages
       WHERE pipeline_id = p.id
         AND id IS DISTINCT FROM won_id
         AND lower(trim(translate(name, 'áéíóúÁÉÍÓÚ', 'aeiouAEIOU')))
             IN ('perdida', 'perdido', 'perdidas', 'perdidos', 'lost', 'closed lost', 'cerrada perdida')
       ORDER BY position DESC, created_at DESC
       LIMIT 1;
    END IF;

    IF won_id IS NULL THEN
      INSERT INTO pipeline_stages (pipeline_id, name, color, position, kind)
      VALUES (p.id, 'Ganada', '#22c55e', 100001, 'won')
      RETURNING id INTO won_id;
    END IF;
    IF lost_id IS NULL THEN
      INSERT INTO pipeline_stages (pipeline_id, name, color, position, kind)
      VALUES (p.id, 'Perdida', '#ef4444', 100000, 'lost')
      RETURNING id INTO lost_id;
    END IF;

    UPDATE pipeline_stages SET kind = 'won',  color = '#22c55e' WHERE id = won_id;
    UPDATE pipeline_stages SET kind = 'lost', color = '#ef4444' WHERE id = lost_id;

    -- Positions: ordinary stages 0..n-1 in their current order, then
    -- Perdida (n), then Ganada (n+1).
    WITH ordered AS (
      SELECT id, row_number() OVER (ORDER BY position, created_at) - 1 AS rn
        FROM pipeline_stages
       WHERE pipeline_id = p.id AND kind = 'open'
    )
    UPDATE pipeline_stages s SET position = o.rn FROM ordered o WHERE s.id = o.id;

    SELECT count(*) INTO n_open FROM pipeline_stages
     WHERE pipeline_id = p.id AND kind = 'open';
    UPDATE pipeline_stages SET position = n_open     WHERE id = lost_id;
    UPDATE pipeline_stages SET position = n_open + 1 WHERE id = won_id;
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_pipeline_stages_one_system_kind
  ON pipeline_stages (pipeline_id, kind)
  WHERE kind <> 'open';

-- ---- 3. Data: align deals with the new model ---------------------
-- Won/lost deals sitting in other stages move to the matching system
-- stage; deals in the system stages get the matching status. The
-- close date of a deal whose status changes here is its last edit
-- (same reasoning as the 044 backfill), so the fix doesn't make every
-- deal count as "won this month".
-- USER = every non-internal trigger (updated_at, the 044 closed_at
-- trigger and, on a re-run, the ones below); FK checks stay on.
ALTER TABLE deals DISABLE TRIGGER USER;

DO $$
DECLARE
  moved_won INT;
  moved_lost INT;
  fixed_status INT;
BEGIN
  UPDATE deals d
     SET stage_id = s.id
    FROM pipeline_stages s
   WHERE s.pipeline_id = d.pipeline_id
     AND s.kind = 'won'
     AND d.status = 'won'
     AND d.stage_id <> s.id;
  GET DIAGNOSTICS moved_won = ROW_COUNT;

  UPDATE deals d
     SET stage_id = s.id
    FROM pipeline_stages s
   WHERE s.pipeline_id = d.pipeline_id
     AND s.kind = 'lost'
     AND d.status = 'lost'
     AND d.stage_id <> s.id;
  GET DIAGNOSTICS moved_lost = ROW_COUNT;

  UPDATE deals d
     SET status = CASE s.kind WHEN 'won' THEN 'won' WHEN 'lost' THEN 'lost' ELSE 'open' END,
         closed_at = CASE WHEN s.kind IN ('won', 'lost')
                          THEN COALESCE(d.updated_at, d.created_at) END
    FROM pipeline_stages s
   WHERE s.id = d.stage_id
     AND d.status IS DISTINCT FROM
         CASE s.kind WHEN 'won' THEN 'won' WHEN 'lost' THEN 'lost' ELSE 'open' END;
  GET DIAGNOSTICS fixed_status = ROW_COUNT;

  RAISE NOTICE '045: % deals moved to Ganada, % to Perdida, % statuses aligned',
    moved_won, moved_lost, fixed_status;
END $$;

ALTER TABLE deals ENABLE TRIGGER USER;

-- ---- 4. Trigger: stage decides deals.status -----------------------
-- BEFORE triggers fire in name order, so "deals_10_…" sets the status
-- before "deals_20_set_closed_at" stamps the close date.
CREATE OR REPLACE FUNCTION set_deal_status_from_stage()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  stage_kind TEXT;
BEGIN
  SELECT kind INTO stage_kind FROM pipeline_stages WHERE id = NEW.stage_id;
  NEW.status := CASE stage_kind
    WHEN 'won' THEN 'won'
    WHEN 'lost' THEN 'lost'
    ELSE 'open'
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS deals_10_status_from_stage ON deals;
CREATE TRIGGER deals_10_status_from_stage
  BEFORE INSERT OR UPDATE OF stage_id, status ON deals
  FOR EACH ROW EXECUTE FUNCTION set_deal_status_from_stage();

-- The 044 trigger only fired on UPDATE OF status; a move that only
-- sets stage_id must stamp / clear closed_at too.
DROP TRIGGER IF EXISTS deals_set_closed_at ON deals;
DROP TRIGGER IF EXISTS deals_20_set_closed_at ON deals;
CREATE TRIGGER deals_20_set_closed_at
  BEFORE INSERT OR UPDATE OF status, stage_id ON deals
  FOR EACH ROW EXECUTE FUNCTION set_deal_closed_at();

-- ---- 5. Trigger: protect system stages -----------------------------
CREATE OR REPLACE FUNCTION protect_system_stage()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    -- Deleting the whole pipeline cascades here after the pipeline
    -- row is gone: allow that, refuse deleting the stage on its own.
    IF OLD.kind <> 'open'
       AND EXISTS (SELECT 1 FROM pipelines WHERE id = OLD.pipeline_id) THEN
      RAISE EXCEPTION 'System stages (won/lost) cannot be deleted'
        USING ERRCODE = 'check_violation';
    END IF;
    RETURN OLD;
  END IF;

  -- UPDATE: kind is immutable; system stages keep their fixed color.
  NEW.kind := OLD.kind;
  IF NEW.kind = 'won' THEN
    NEW.color := '#22c55e';
  ELSIF NEW.kind = 'lost' THEN
    NEW.color := '#ef4444';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS pipeline_stages_protect_system ON pipeline_stages;
CREATE TRIGGER pipeline_stages_protect_system
  BEFORE UPDATE OR DELETE ON pipeline_stages
  FOR EACH ROW EXECUTE FUNCTION protect_system_stage();

-- ---- 6. Trigger: new pipelines get the system stages ---------------
-- SECURITY DEFINER so it works whatever role inserted the pipeline;
-- it only ever touches the new pipeline's own stages.
CREATE OR REPLACE FUNCTION create_system_stages()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO pipeline_stages (pipeline_id, name, color, position, kind)
  VALUES
    (NEW.id, 'Perdida', '#ef4444', 100000, 'lost'),
    (NEW.id, 'Ganada',  '#22c55e', 100001, 'won')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS pipelines_create_system_stages ON pipelines;
CREATE TRIGGER pipelines_create_system_stages
  AFTER INSERT ON pipelines
  FOR EACH ROW EXECUTE FUNCTION create_system_stages();
