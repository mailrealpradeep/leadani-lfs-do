-- Saila Intake (Task #124) — rapid-reply race + short-timeout fallback fix
-- Idempotent: safe to re-run.

-- 1. Track when the bot last sent a question for each session, so the engine can
--    (a) ignore lead messages whose WhatsApp timestamp predates the prompt and
--    (b) coalesce rapid same-question follow-ups.
ALTER TABLE saila_intake_sessions
  ADD COLUMN IF NOT EXISTS last_question_sent_at timestamp;

-- 2. Persist the WhatsApp-reported send time on each inbound log so the engine
--    can compare against last_question_sent_at.
ALTER TABLE whatsapp_message_logs
  ADD COLUMN IF NOT EXISTS wa_message_timestamp timestamp;
