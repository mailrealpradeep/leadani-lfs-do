-- Extend whatsapp_message_logs to support outgoing messages
ALTER TABLE whatsapp_message_logs
  ALTER COLUMN webhook_request_id DROP NOT NULL;

ALTER TABLE whatsapp_message_logs
  ADD COLUMN IF NOT EXISTS direction VARCHAR(16) NOT NULL DEFAULT 'incoming';

ALTER TABLE whatsapp_message_logs
  ADD COLUMN IF NOT EXISTS lead_id VARCHAR REFERENCES leads(id) ON DELETE SET NULL;

ALTER TABLE whatsapp_message_logs
  ADD COLUMN IF NOT EXISTS sent_by_user_id VARCHAR REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_whatsapp_message_logs_direction
  ON whatsapp_message_logs (company_id, direction, processed_at DESC);

CREATE INDEX IF NOT EXISTS idx_whatsapp_message_logs_lead
  ON whatsapp_message_logs (lead_id);

CREATE INDEX IF NOT EXISTS idx_whatsapp_message_logs_sent_by
  ON whatsapp_message_logs (sent_by_user_id);
