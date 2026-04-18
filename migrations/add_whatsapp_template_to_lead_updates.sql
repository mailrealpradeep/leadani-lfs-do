-- Store structured details for outgoing WhatsApp approved-template sends
-- so the lead history drawer can render them as a proper card
-- (template name + language badges and a list of resolved variables)
-- instead of relying on the rendered remark text.
--
-- Idempotent: safe to re-run.

ALTER TABLE lead_updates
  ADD COLUMN IF NOT EXISTS whatsapp_template json;
