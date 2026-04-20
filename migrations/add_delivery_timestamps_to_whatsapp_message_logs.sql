-- Track when each outgoing WhatsApp message transitioned to delivered / read /
-- failed. Surfaced in the lead drawer and the Message Logs page so operators
-- can see how quickly a customer engaged.
-- Idempotent: safe to re-run.

ALTER TABLE whatsapp_message_logs
  ADD COLUMN IF NOT EXISTS delivered_at timestamp;

ALTER TABLE whatsapp_message_logs
  ADD COLUMN IF NOT EXISTS read_at timestamp;

ALTER TABLE whatsapp_message_logs
  ADD COLUMN IF NOT EXISTS failed_at timestamp;
