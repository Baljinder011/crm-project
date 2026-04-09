const { pool } = require('../config/db');
const { safeJsonParse } = require('../utils/safeJsonParse');

function mapMailRow(row) {
  if (!row) return null;

  return {
    id: row.id,
    mailboxEmail: row.mailbox_email,
    folder: row.folder,
    uid: Number(row.uid),
    messageId: row.message_id,
    threadKey: row.thread_key,
    subject: row.subject || '',
    fromName: row.from_name || '',
    fromEmail: row.from_email || '',
    toEmails: safeJsonParse(row.to_emails, []),
    ccEmails: safeJsonParse(row.cc_emails, []),
    receivedAt: row.received_at,
    textBody: row.text_body || '',
    htmlBody: row.html_body || '',
    headers: safeJsonParse(row.headers, {}),
    flags: safeJsonParse(row.raw_flags, []),
    isSpam: Boolean(row.is_spam),
    spamScore: Number(row.spam_score || 0),
    spamReasons: safeJsonParse(row.spam_reasons, []),
    aiStatus: row.ai_status || 'pending',
    category: row.category || null,
    companyFit: Boolean(row.company_fit),
    leadScore: Number(row.lead_score || 0),
    confidence: Number(row.confidence || 0),
    shouldReply: Boolean(row.should_reply),
    matchedServices: safeJsonParse(row.matched_services, []),
    extractedRequirements: safeJsonParse(row.extracted_requirements, []),
    leadSummary: row.lead_summary || '',
    suggestedReplySubject: row.suggested_reply_subject || '',
    suggestedReplyHtml: row.suggested_reply_html || '',
    suggestedReplyText: row.suggested_reply_text || '',
    replyStatus: row.reply_status || 'not_sent',
    repliedAt: row.replied_at || null,
    replyMessageId: row.reply_message_id || null,
    classification: safeJsonParse(row.classification, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function upsertMailMessage(payload) {
  const query = `
    INSERT INTO mail_messages (
      mailbox_email, folder, uid, message_id, thread_key, subject, from_name, from_email,
      to_emails, cc_emails, received_at, text_body, html_body, headers, raw_flags, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8,
      $9::jsonb, $10::jsonb, $11, $12, $13, $14::jsonb, $15::jsonb, CURRENT_TIMESTAMP
    )
    ON CONFLICT (mailbox_email, folder, uid)
    DO UPDATE SET
      message_id = EXCLUDED.message_id,
      thread_key = EXCLUDED.thread_key,
      subject = EXCLUDED.subject,
      from_name = EXCLUDED.from_name,
      from_email = EXCLUDED.from_email,
      to_emails = EXCLUDED.to_emails,
      cc_emails = EXCLUDED.cc_emails,
      received_at = EXCLUDED.received_at,
      text_body = EXCLUDED.text_body,
      html_body = EXCLUDED.html_body,
      headers = EXCLUDED.headers,
      raw_flags = EXCLUDED.raw_flags,
      updated_at = CURRENT_TIMESTAMP
    RETURNING *
  `;

  const values = [
    payload.mailboxEmail,
    payload.folder || 'INBOX',
    payload.uid,
    payload.messageId || null,
    payload.threadKey || null,
    payload.subject || null,
    payload.fromName || null,
    payload.fromEmail || null,
    JSON.stringify(payload.toEmails || []),
    JSON.stringify(payload.ccEmails || []),
    payload.receivedAt || null,
    payload.textBody || null,
    payload.htmlBody || null,
    JSON.stringify(payload.headers || {}),
    JSON.stringify(payload.flags || []),
  ];

  const { rows } = await pool.query(query, values);
  return mapMailRow(rows[0]);
}

async function updateMailClassification(id, payload) {
  const query = `
    UPDATE mail_messages
    SET is_spam = $2,
        spam_score = $3,
        spam_reasons = $4::jsonb,
        ai_status = $5,
        category = $6,
        company_fit = $7,
        lead_score = $8,
        confidence = $9,
        should_reply = $10,
        matched_services = $11::jsonb,
        extracted_requirements = $12::jsonb,
        lead_summary = $13,
        suggested_reply_subject = $14,
        suggested_reply_html = $15,
        suggested_reply_text = $16,
        classification = $17::jsonb,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING *
  `;

  const values = [
    id,
    Boolean(payload.isSpam),
    payload.spamScore || 0,
    JSON.stringify(payload.spamReasons || []),
    payload.aiStatus || 'completed',
    payload.category || null,
    Boolean(payload.companyFit),
    payload.leadScore || 0,
    payload.confidence || 0,
    Boolean(payload.shouldReply),
    JSON.stringify(payload.matchedServices || []),
    JSON.stringify(payload.extractedRequirements || []),
    payload.leadSummary || null,
    payload.suggestedReplySubject || null,
    payload.suggestedReplyHtml || null,
    payload.suggestedReplyText || null,
    JSON.stringify(payload.classification || {}),
  ];

  const { rows } = await pool.query(query, values);
  return mapMailRow(rows[0]);
}

async function markReplySent(id, replyMessageId) {
  const { rows } = await pool.query(
    `
      UPDATE mail_messages
      SET reply_status = 'sent',
          replied_at = CURRENT_TIMESTAMP,
          reply_message_id = $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `,
    [id, replyMessageId || null]
  );

  return mapMailRow(rows[0]);
}

async function markReplySkipped(id, reason) {
  const { rows } = await pool.query(
    `
      UPDATE mail_messages
      SET reply_status = 'skipped',
          classification = COALESCE(classification, '{}'::jsonb) || jsonb_build_object('skipReason', $2),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `,
    [id, reason || 'skipped']
  );

  return mapMailRow(rows[0]);
}

async function getMailMessageById(id) {
  const { rows } = await pool.query(
    `SELECT * FROM mail_messages WHERE id = $1 LIMIT 1`,
    [id]
  );
  return mapMailRow(rows[0]);
}

async function listMailMessages(filters = {}) {
  const clauses = [];
  const values = [];

  if (filters.mailboxEmail) {
    values.push(filters.mailboxEmail);
    clauses.push(`mailbox_email = $${values.length}`);
  }

  if (filters.folder) {
    values.push(filters.folder);
    clauses.push(`folder = $${values.length}`);
  }

  if (filters.category) {
    values.push(filters.category);
    clauses.push(`category = $${values.length}`);
  }

  if (filters.replyStatus) {
    values.push(filters.replyStatus);
    clauses.push(`reply_status = $${values.length}`);
  }

  if (typeof filters.isSpam === 'boolean') {
    values.push(filters.isSpam);
    clauses.push(`is_spam = $${values.length}`);
  }

  if (typeof filters.shouldReply === 'boolean') {
    values.push(filters.shouldReply);
    clauses.push(`should_reply = $${values.length}`);
  }

  if (filters.search) {
    values.push(`%${filters.search}%`);
    clauses.push(`(subject ILIKE $${values.length} OR from_email ILIKE $${values.length} OR COALESCE(text_body, '') ILIKE $${values.length})`);
  }

  const limit = Number(filters.limit || 50);
  values.push(limit);
  const limitPlaceholder = `$${values.length}`;

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const query = `
    SELECT *
    FROM mail_messages
    ${where}
    ORDER BY received_at DESC NULLS LAST, id DESC
    LIMIT ${limitPlaceholder}
  `;

  const { rows } = await pool.query(query, values);
  return rows.map(mapMailRow);
}

async function getMailSummary() {
  const { rows } = await pool.query(`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE is_spam = true)::int AS spam,
      COUNT(*) FILTER (WHERE category = 'lead')::int AS leads,
      COUNT(*) FILTER (WHERE should_reply = true AND reply_status = 'not_sent')::int AS pending_replies,
      COUNT(*) FILTER (WHERE reply_status = 'sent')::int AS sent
    FROM mail_messages
  `);

  return rows[0] || { total: 0, spam: 0, leads: 0, pending_replies: 0, sent: 0 };
}

module.exports = {
  upsertMailMessage,
  updateMailClassification,
  markReplySent,
  markReplySkipped,
  getMailMessageById,
  listMailMessages,
  getMailSummary,
};
