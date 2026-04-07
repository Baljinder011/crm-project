const { pool } = require('../config/db');
const { safeJsonParse } = require('../utils/safeJsonParse');

function getDefaultAiState() {
  return {
    status: 'not_started',
    intent: null,
    industry: null,
    urgency: null,
    score: 0,
    confidence: 0,
    company_summary: '',
    ai_summary: '',
    recommended_action: '',
    pain_points: [],
    research_sources: [],
    raw_research: {},
    last_enriched_at: null,
    error_message: null,
  };
}

function mapContactRow(row, options = {}) {
  if (!row) return null;

  const hasAiTables = Boolean(options.hasAiTables);

  return {
    id: row.id,
    full_name: row.full_name,
    company: row.company,
    email: row.email,
    phone: row.phone,
    address: row.address,
    message: row.message,
    created_at: row.created_at,
    pipeline_stage: row.pipeline_stage || 'new',
    pipeline_order:
      typeof row.pipeline_order === 'number'
        ? row.pipeline_order
        : row.pipeline_order !== null && row.pipeline_order !== undefined
          ? Number(row.pipeline_order)
          : null,
    ai: hasAiTables
      ? {
          status: row.ai_status || 'not_started',
          intent: row.intent || null,
          industry: row.industry || null,
          urgency: row.urgency || null,
          score: Number(row.score || 0),
          confidence: Number(row.confidence || 0),
          company_summary: row.company_summary || '',
          ai_summary: row.ai_summary || '',
          recommended_action: row.recommended_action || '',
          pain_points: safeJsonParse(row.pain_points, []),
          research_sources: safeJsonParse(row.research_sources, []),
          raw_research: safeJsonParse(row.raw_research, {}),
          last_enriched_at: row.last_enriched_at || null,
          error_message: row.error_message || null,
        }
      : getDefaultAiState(),
    task:
      hasAiTables && row.task_id
        ? {
            id: row.task_id,
            title: row.task_title,
            type: row.task_type,
            priority: row.task_priority,
            status: row.task_status,
            due_at: row.task_due_at,
            assigned_to: row.task_assigned_to,
          }
        : null,
  };
}

async function checkAiTablesExist() {
  const { rows } = await pool.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('lead_ai_data', 'lead_tasks')
  `);

  const tableNames = rows.map((row) => row.table_name);

  return {
    leadAiDataExists: tableNames.includes('lead_ai_data'),
    leadTasksExists: tableNames.includes('lead_tasks'),
  };
}

async function getAllContacts() {
  const { leadAiDataExists, leadTasksExists } = await checkAiTablesExist();
  const hasAiTables = leadAiDataExists && leadTasksExists;

  if (!hasAiTables) {
    const { rows } = await pool.query(`
      SELECT
        c.id,
        c.full_name,
        c.company,
        c.email,
        c.phone,
        c.address,
        c.message,
        c.created_at,
        c.pipeline_stage,
        c.pipeline_order
      FROM contacts c
      ORDER BY c.created_at DESC, c.id DESC
    `);

    return rows.map((row) => mapContactRow(row, { hasAiTables: false }));
  }

  const query = `
    SELECT
      c.id,
      c.full_name,
      c.company,
      c.email,
      c.phone,
      c.address,
      c.message,
      c.created_at,
      c.pipeline_stage,
      c.pipeline_order,
      aid.status AS ai_status,
      aid.intent,
      aid.industry,
      aid.urgency,
      aid.score,
      aid.confidence,
      aid.company_summary,
      aid.ai_summary,
      aid.recommended_action,
      aid.pain_points,
      aid.research_sources,
      aid.raw_research,
      aid.last_enriched_at,
      aid.error_message,
      t.id AS task_id,
      t.title AS task_title,
      t.type AS task_type,
      t.priority AS task_priority,
      t.status AS task_status,
      t.due_at AS task_due_at,
      t.assigned_to AS task_assigned_to
    FROM contacts c
    LEFT JOIN lead_ai_data aid ON aid.contact_id = c.id
    LEFT JOIN LATERAL (
      SELECT *
      FROM lead_tasks lt
      WHERE lt.contact_id = c.id
      ORDER BY lt.created_at DESC, lt.id DESC
      LIMIT 1
    ) t ON true
    ORDER BY c.created_at DESC, c.id DESC
  `;

  const { rows } = await pool.query(query);
  return rows.map((row) => mapContactRow(row, { hasAiTables: true }));
}

async function getContactById(contactId) {
  const { leadAiDataExists, leadTasksExists } = await checkAiTablesExist();
  const hasAiTables = leadAiDataExists && leadTasksExists;

  if (!hasAiTables) {
    const { rows } = await pool.query(
      `
        SELECT
          c.id,
          c.full_name,
          c.company,
      c.email,
      c.phone,
      c.address,
      c.message,
      c.created_at,
      c.pipeline_stage,
      c.pipeline_order
        FROM contacts c
        WHERE c.id = $1
        LIMIT 1
      `,
      [contactId]
    );

    return mapContactRow(rows[0], { hasAiTables: false });
  }

  const query = `
    SELECT
      c.id,
      c.full_name,
      c.company,
      c.email,
      c.phone,
      c.address,
      c.message,
      c.created_at,
      c.pipeline_stage,
      c.pipeline_order,
      aid.status AS ai_status,
      aid.intent,
      aid.industry,
      aid.urgency,
      aid.score,
      aid.confidence,
      aid.company_summary,
      aid.ai_summary,
      aid.recommended_action,
      aid.pain_points,
      aid.research_sources,
      aid.raw_research,
      aid.last_enriched_at,
      aid.error_message,
      t.id AS task_id,
      t.title AS task_title,
      t.type AS task_type,
      t.priority AS task_priority,
      t.status AS task_status,
      t.due_at AS task_due_at,
      t.assigned_to AS task_assigned_to
    FROM contacts c
    LEFT JOIN lead_ai_data aid ON aid.contact_id = c.id
    LEFT JOIN LATERAL (
      SELECT *
      FROM lead_tasks lt
      WHERE lt.contact_id = c.id
      ORDER BY lt.created_at DESC, lt.id DESC
      LIMIT 1
    ) t ON true
    WHERE c.id = $1
    LIMIT 1
  `;

  const { rows } = await pool.query(query, [contactId]);
  return mapContactRow(rows[0], { hasAiTables: true });
}

async function updateContactPipeline(contactId, stage, order) {
  const { rows } = await pool.query(
    `
      UPDATE contacts
      SET pipeline_stage = $2,
          pipeline_order = $3
      WHERE id = $1
      RETURNING id, pipeline_stage, pipeline_order
    `,
    [contactId, stage, order]
  );

  return rows[0] || null;
}

async function listAutoEnrichmentCandidates(limit = 25) {
  const safeLimit = Number.isInteger(limit) && limit > 0 ? limit : 25;

  const { rows } = await pool.query(
    `
      SELECT c.id
      FROM contacts c
      LEFT JOIN lead_ai_data aid ON aid.contact_id = c.id
      WHERE aid.contact_id IS NULL OR aid.status = 'not_started'
      ORDER BY c.created_at ASC, c.id ASC
      LIMIT $1
    `,
    [safeLimit]
  );

  return rows.map((row) => Number(row.id)).filter(Number.isFinite);
}

module.exports = {
  getAllContacts,
  getContactById,
  updateContactPipeline,
  listAutoEnrichmentCandidates,
};
