-- Saila Intake (Task #116) — keyword-triggered, sequential WhatsApp Q&A
-- Idempotent: safe to re-run on existing DBs that already have part of the schema.

-- 1. whatsapp_message_logs.origin column (bot vs human-takeover detector)
ALTER TABLE whatsapp_message_logs
  ADD COLUMN IF NOT EXISTS origin varchar(8) NOT NULL DEFAULT 'human';

-- 2. saila_intake_flows
CREATE TABLE IF NOT EXISTS saila_intake_flows (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id varchar NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name varchar(255) NOT NULL,
  description text,
  enabled boolean NOT NULL DEFAULT true,
  priority integer NOT NULL DEFAULT 0,
  applied_business_numbers text[] NOT NULL DEFAULT ARRAY[]::text[],
  cancel_keywords text[] NOT NULL DEFAULT ARRAY[]::text[],
  completion_message text,
  fallback_prompt_template text NOT NULL DEFAULT 'Hi, just checking — {question}',
  max_fallback_attempts integer NOT NULL DEFAULT 2,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

-- 3. saila_intake_triggers
CREATE TABLE IF NOT EXISTS saila_intake_triggers (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id varchar NOT NULL REFERENCES saila_intake_flows(id) ON DELETE CASCADE,
  keyword varchar(255) NOT NULL,
  match_mode varchar(16) NOT NULL DEFAULT 'contains',
  created_at timestamp NOT NULL DEFAULT now()
);

-- 4. saila_intake_questions
CREATE TABLE IF NOT EXISTS saila_intake_questions (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id varchar NOT NULL REFERENCES saila_intake_flows(id) ON DELETE CASCADE,
  order_index integer NOT NULL DEFAULT 0,
  primary_prompt text NOT NULL,
  target_field varchar(255) NOT NULL,
  silence_timeout_seconds integer NOT NULL DEFAULT 86400,
  max_fallback_attempts integer,
  question_type varchar(32) NOT NULL DEFAULT 'free_text',
  next_question_config json,
  llm_relevance_check_enabled boolean NOT NULL DEFAULT false,
  relevance_topic_hint text,
  on_off_topic_action varchar(32) NOT NULL DEFAULT 'reask',
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

-- 5. saila_intake_sessions
CREATE TABLE IF NOT EXISTS saila_intake_sessions (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id varchar NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  lead_id varchar NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  flow_id varchar NOT NULL REFERENCES saila_intake_flows(id) ON DELETE CASCADE,
  current_question_index integer NOT NULL DEFAULT 0,
  depth_reached integer NOT NULL DEFAULT 0,
  status varchar(16) NOT NULL DEFAULT 'active',
  fallback_attempts integer NOT NULL DEFAULT 0,
  last_activity_at timestamp NOT NULL DEFAULT now(),
  started_at timestamp NOT NULL DEFAULT now(),
  completed_at timestamp,
  paused_at timestamp,
  paused_until timestamp,
  last_business_number varchar(30),
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS saila_intake_sessions_lead_idx ON saila_intake_sessions(lead_id);
CREATE INDEX IF NOT EXISTS saila_intake_sessions_status_idx ON saila_intake_sessions(company_id, status);
