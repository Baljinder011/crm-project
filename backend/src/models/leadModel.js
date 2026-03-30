const { pool } = require('../config/db');
const { safeJsonParse } = require('../utils/safeJsonParse');

function mapLeadRow(row) {
  if (!row) return null;

  return {
    id: row.id,
    fullName: row.full_name,
    company: row.company,
    email: row.email,
    phone: row.phone,
    address: row.address,
    message: row.message,
    createdAt: row.created_at,
    ai: {
      status: row.ai_status || 'not_started',
      intent: row.intent || null,
      industry: row.industry || null,
      urgency: row.urgency || null,
      score: Number(row.score || 0),
      confidence: Number(row.confidence || 0),
      companySummary: row.company_summary || '',
      aiSummary: row.ai_summary || '',
      recommendedAction: row.recommended_action || '',
      painPoints: safeJsonParse(row.pain_points, []),
      researchSources: safeJsonParse(row.research_sources, []),
      rawResearch: safeJsonParse(row.raw_research, {}),
      lastEnrichedAt: row.last_enriched_at || null,
      errorMessage: row.error_message || null,
    },
    task: row.task_id
      ? {
          id: row.task_id,
          title: row.task_title,
          type: row.task_type,
          priority: row.task_priority,
          status: row.task_status,
          dueAt: row.task_due_at,
          assignedTo: row.task_assigned_to,
        }
      : null,
  };
}

async function listLeads() {
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
  return rows.map(mapLeadRow);
}

async function getLeadById(contactId) {
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
  return mapLeadRow(rows[0]);
}

async function getRawContactById(contactId) {
  const { rows } = await pool.query(
    `
      SELECT id, full_name, company, email, phone, address, message, created_at
      FROM contacts
      WHERE id = $1
      LIMIT 1
    `,
    [contactId]
  );

  return rows[0] || null;
}

async function upsertLeadAiData(contactId, payload) {
  const query = `
    INSERT INTO lead_ai_data (
      contact_id,
      status,
      intent,
      industry,
      urgency,
      score,
      confidence,
      company_summary,
      ai_summary,
      pain_points,
      recommended_action,
      research_sources,
      raw_research,
      error_message,
      last_enriched_at,
      updated_at
    )
    VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11, $12::jsonb, $13::jsonb, $14, $15, CURRENT_TIMESTAMP
    )
    ON CONFLICT (contact_id)
    DO UPDATE SET
      status = EXCLUDED.status,
      intent = EXCLUDED.intent,
      industry = EXCLUDED.industry,
      urgency = EXCLUDED.urgency,
      score = EXCLUDED.score,
      confidence = EXCLUDED.confidence,
      company_summary = EXCLUDED.company_summary,
      ai_summary = EXCLUDED.ai_summary,
      pain_points = EXCLUDED.pain_points,
      recommended_action = EXCLUDED.recommended_action,
      research_sources = EXCLUDED.research_sources,
      raw_research = EXCLUDED.raw_research,
      error_message = EXCLUDED.error_message,
      last_enriched_at = EXCLUDED.last_enriched_at,
      updated_at = CURRENT_TIMESTAMP
    RETURNING *
  `;

  const values = [
    contactId,
    payload.status,
    payload.intent || null,
    payload.industry || null,
    payload.urgency || null,
    payload.score || 0,
    payload.confidence || 0,
    payload.companySummary || null,
    payload.aiSummary || null,
    JSON.stringify(payload.painPoints || []),
    payload.recommendedAction || null,
    JSON.stringify(payload.researchSources || []),
    JSON.stringify(payload.rawResearch || {}),
    payload.errorMessage || null,
    payload.lastEnrichedAt || null,
  ];

  const { rows } = await pool.query(query, values);
  return rows[0];
}

async function upsertLeadTask(contactId, task) {
  const { rows } = await pool.query(
    `
      SELECT id
      FROM lead_tasks
      WHERE contact_id = $1 AND type = $2 AND status = 'pending'
      ORDER BY created_at DESC, id DESC
      LIMIT 1
    `,
    [contactId, task.type || 'follow_up']
  );

  if (rows[0]) {
    const { rows: updatedRows } = await pool.query(
      `
        UPDATE lead_tasks
        SET title = $2,
            priority = $3,
            due_at = $4,
            assigned_to = $5,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `,
      [rows[0].id, task.title, task.priority, task.dueAt, task.assignedTo || null]
    );

    return updatedRows[0];
  }

  const { rows: insertedRows } = await pool.query(
    `
      INSERT INTO lead_tasks (contact_id, type, title, priority, due_at, assigned_to)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `,
    [contactId, task.type || 'follow_up', task.title, task.priority, task.dueAt, task.assignedTo || null]
  );

  return insertedRows[0];
}

async function createLeadAiEvent(contactId, stepName, status, details = {}, model = null) {
  await pool.query(
    `
      INSERT INTO lead_ai_events (contact_id, step_name, status, model, details)
      VALUES ($1, $2, $3, $4, $5::jsonb)
    `,
    [contactId, stepName, status, model, JSON.stringify(details || {})]
  );
}

module.exports = {
  listLeads,
  getLeadById,
  getRawContactById,
  upsertLeadAiData,
  upsertLeadTask,
  createLeadAiEvent,
};