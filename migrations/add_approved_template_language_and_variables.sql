-- Adds language code and positional body variables to whatsapp_message_templates
-- so admins can configure Meta-approved templates for sending outside the
-- 24-hour window, and so the send pipeline can substitute body parameters.

ALTER TABLE whatsapp_message_templates
  ADD COLUMN IF NOT EXISTS approved_template_language VARCHAR(20) NOT NULL DEFAULT 'en_US',
  ADD COLUMN IF NOT EXISTS approved_template_variables TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
