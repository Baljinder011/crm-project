CREATE TABLE IF NOT EXISTS lead_ai_data (
  id SERIAL PRIMARY KEY,
  contact_id INTEGER NOT NULL UNIQUE REFERENCES contacts(id) ON DELETE CASCADE,
  status VARCHAR(30) NOT NULL DEFAULT 'queued',
  intent VARCHAR(120),
  industry VARCHAR(120),
  urgency VARCHAR(30),
  score INTEGER DEFAULT 0,
  confidence NUMERIC(4,2) DEFAULT 0,
  company_summary TEXT,
  ai_summary TEXT,
  pain_points JSONB DEFAULT '[]'::jsonb,
  recommended_action TEXT,
  research_sources JSONB DEFAULT '[]'::jsonb,
  raw_research JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,
  last_enriched_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS lead_tasks (
  id SERIAL PRIMARY KEY,
  contact_id INTEGER NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL DEFAULT 'follow_up',
  title VARCHAR(255) NOT NULL,
  priority VARCHAR(20) NOT NULL DEFAULT 'medium',
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  due_at TIMESTAMP,
  assigned_to VARCHAR(120),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS lead_ai_events (
  id SERIAL PRIMARY KEY,
  contact_id INTEGER NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  step_name VARCHAR(60) NOT NULL,
  status VARCHAR(20) NOT NULL,
  model VARCHAR(60),
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_lead_ai_data_contact_id ON lead_ai_data(contact_id);
CREATE INDEX IF NOT EXISTS idx_lead_tasks_contact_id ON lead_tasks(contact_id);
CREATE INDEX IF NOT EXISTS idx_lead_tasks_status ON lead_tasks(status);
CREATE INDEX IF NOT EXISTS idx_lead_ai_events_contact_id ON lead_ai_events(contact_id);