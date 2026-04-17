CREATE TABLE IF NOT EXISTS whatsapp_message_templates (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id VARCHAR NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  call_response VARCHAR(40) NOT NULL,
  template_type VARCHAR(20) NOT NULL DEFAULT 'freeform',
  body_text TEXT NOT NULL DEFAULT '',
  approved_template_name VARCHAR(200) NOT NULL DEFAULT '',
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_message_templates_company_call_response_unique
  ON whatsapp_message_templates (company_id, call_response);
