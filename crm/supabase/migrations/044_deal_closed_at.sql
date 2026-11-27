-- ============================================================
-- 044 — deals.closed_at: when a deal was actually won or lost.
--
-- The dashboard and the pipeline analytics used `updated_at` as the
-- close date, so editing an old won deal (value, contact, notes…)
-- made it count again as "won this month". `closed_at` is stamped
-- only when the status changes to won/lost, and cleared on reopen.
-- ============================================================

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

DROP TRIGGER IF EXISTS deals_set_closed_at ON deals;
CREATE TRIGGER deals_set_closed_at
  BEFORE INSERT OR UPDATE OF status ON deals
  FOR EACH ROW EXECUTE FUNCTION set_deal_closed_at();

-- Backfill: for deals already closed, `updated_at` is the best record
-- we have of the close moment. Disable the updated_at trigger so the
-- backfill itself doesn't stamp every closed deal with today's date.
ALTER TABLE deals DISABLE TRIGGER set_updated_at;
UPDATE deals
   SET closed_at = COALESCE(updated_at, created_at)
 WHERE status IN ('won', 'lost')
   AND closed_at IS NULL;
ALTER TABLE deals ENABLE TRIGGER set_updated_at;

CREATE INDEX IF NOT EXISTS idx_deals_closed_at
  ON deals (account_id, closed_at)
  WHERE closed_at IS NOT NULL;
