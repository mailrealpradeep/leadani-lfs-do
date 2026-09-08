-- Saila Intake: record the customer WhatsApp number on each session so the
-- fallback tick has a recipient. Idempotent: safe to re-run. Also applied
-- automatically at boot by ensureIntakeSessionCustomerPhoneColumn() in
-- server/migrations.ts.
ALTER TABLE saila_intake_sessions
  ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(30);
