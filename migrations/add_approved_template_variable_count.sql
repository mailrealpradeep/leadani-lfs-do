-- Task #78: declared body-variable count for Meta-approved WhatsApp templates.
-- Nullable means "auto" (use defaults.length); 0..10 means an explicit count.
ALTER TABLE whatsapp_message_templates
  ADD COLUMN IF NOT EXISTS approved_template_variable_count integer;
