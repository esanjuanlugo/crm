-- ============================================================
-- 041_ai_custom_provider.sql — "Other" (OpenAI-compatible) AI provider
--
-- Lets an account point the AI assistant at any OpenAI-compatible
-- endpoint (Groq, OpenRouter, Together, Mistral, ...) by typing a
-- provider name, a Base URL and a model. Existing 'openai' and
-- 'anthropic' rows are untouched.
--
--   ai_configs.provider_name  — display name for the custom provider
--   ai_configs.base_url       — OpenAI-compatible base URL (https)
--   provider CHECKs           — now also allow 'custom'
--                               (ai_configs and ai_usage_log)
--
-- Idempotent — safe to run multiple times.
-- ============================================================

ALTER TABLE ai_configs
  ADD COLUMN IF NOT EXISTS provider_name text,
  ADD COLUMN IF NOT EXISTS base_url      text;

-- Drop whatever CHECK currently restricts `provider` (auto-generated
-- names differ between environments), then re-add the wider ones.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT conrelid::regclass AS tbl, conname
    FROM pg_constraint
    WHERE contype = 'c'
      AND conrelid IN ('ai_configs'::regclass, 'ai_usage_log'::regclass)
      AND pg_get_constraintdef(oid) ILIKE '%provider%'
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', r.tbl, r.conname);
  END LOOP;
END $$;

ALTER TABLE ai_configs
  ADD CONSTRAINT ai_configs_provider_check
    CHECK (provider IN ('openai', 'anthropic', 'custom')),
  ADD CONSTRAINT ai_configs_custom_requires_url
    CHECK (provider <> 'custom' OR (provider_name IS NOT NULL AND base_url IS NOT NULL));

ALTER TABLE ai_usage_log
  ADD CONSTRAINT ai_usage_log_provider_check
    CHECK (provider IN ('openai', 'anthropic', 'custom'));
