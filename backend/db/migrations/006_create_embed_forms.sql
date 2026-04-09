CREATE TABLE IF NOT EXISTS embed_forms (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  public_key VARCHAR(120) NOT NULL UNIQUE,
  user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  notify_email VARCHAR(255),
  allowed_domains JSONB NOT NULL DEFAULT '[]'::jsonb,
  field_mapping JSONB NOT NULL DEFAULT '{}'::jsonb,
  success_message TEXT DEFAULT 'Thank you. We received your message.',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS source_domain TEXT,
  ADD COLUMN IF NOT EXISTS embed_form_id INTEGER REFERENCES embed_forms(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS extra_data JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_embed_forms_public_key ON embed_forms(public_key);
CREATE INDEX IF NOT EXISTS idx_contacts_embed_form_id ON contacts(embed_form_id);