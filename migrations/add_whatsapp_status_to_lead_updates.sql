-- Track WhatsApp delivery/read receipts on outgoing lead_updates rows.
-- Idempotent: safe to re-run.

ALTER TABLE lead_updates
  ADD COLUMN IF NOT EXISTS whatsapp_message_id varchar(255);

ALTER TABLE lead_updates
  ADD COLUMN IF NOT EXISTS whatsapp_status varchar(32);

ALTER TABLE lead_updates
  ADD COLUMN IF NOT EXISTS whatsapp_status_at timestamp;

ALTER TABLE lead_updates
  ADD COLUMN IF NOT EXISTS whatsapp_error text;

CREATE INDEX IF NOT EXISTS lead_updates_wa_message_id_idx
  ON lead_updates (whatsapp_message_id);
