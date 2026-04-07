ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS pipeline_stage TEXT NOT NULL DEFAULT 'new';

ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS pipeline_order INTEGER;

UPDATE contacts
SET pipeline_order = ordering.rn
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at DESC, id DESC) - 1 AS rn
  FROM contacts
  WHERE pipeline_order IS NULL
) AS ordering
WHERE contacts.id = ordering.id
  AND contacts.pipeline_order IS NULL;

CREATE INDEX IF NOT EXISTS idx_contacts_pipeline_stage_order
  ON contacts (pipeline_stage, pipeline_order, created_at DESC, id DESC);