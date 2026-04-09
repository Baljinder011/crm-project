CREATE TABLE IF NOT EXISTS mail_messages (
  id SERIAL PRIMARY KEY,
  mailbox_email VARCHAR(255) NOT NULL,
  folder VARCHAR(120) NOT NULL DEFAULT 'INBOX',
  uid BIGINT NOT NULL,
  message_id TEXT,
  thread_key TEXT,
  subject TEXT,
  from_name TEXT,
  from_email VARCHAR(255),
  to_emails JSONB DEFAULT '[]'::jsonb,
  cc_emails JSONB DEFAULT '[]'::jsonb,
  received_at TIMESTAMP,
  text_body TEXT,
  html_body TEXT,
  headers JSONB DEFAULT '{}'::jsonb,
  raw_flags JSONB DEFAULT '[]'::jsonb,
  is_spam BOOLEAN NOT NULL DEFAULT false,
  spam_score INTEGER NOT NULL DEFAULT 0,
  spam_reasons JSONB DEFAULT '[]'::jsonb,
  ai_status VARCHAR(30) NOT NULL DEFAULT 'pending',
  category VARCHAR(50),
  company_fit BOOLEAN NOT NULL DEFAULT false,
  lead_score INTEGER NOT NULL DEFAULT 0,
  confidence NUMERIC(4,2) DEFAULT 0,
  should_reply BOOLEAN NOT NULL DEFAULT false,
  matched_services JSONB DEFAULT '[]'::jsonb,
  extracted_requirements JSONB DEFAULT '[]'::jsonb,
  lead_summary TEXT,
  suggested_reply_subject TEXT,
  suggested_reply_html TEXT,
  suggested_reply_text TEXT,
  reply_status VARCHAR(30) NOT NULL DEFAULT 'not_sent',
  replied_at TIMESTAMP,
  reply_message_id TEXT,
  classification JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (mailbox_email, folder, uid)
);

CREATE INDEX IF NOT EXISTS idx_mail_messages_mailbox_received_at
  ON mail_messages (mailbox_email, received_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_mail_messages_category
  ON mail_messages (category, should_reply, reply_status);

CREATE INDEX IF NOT EXISTS idx_mail_messages_from_email
  ON mail_messages (from_email);
