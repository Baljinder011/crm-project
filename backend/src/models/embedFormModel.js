const crypto = require('crypto');
const { pool } = require('../config/db');

function generatePublicKey() {
  return crypto.randomBytes(18).toString('hex');
}

async function createEmbedForm({
  name,
  userId,
  notifyEmail,
  allowedDomains = [],
  fieldMapping = {},
  successMessage,
}) {
  const publicKey = generatePublicKey();

  const { rows } = await pool.query(
    `
      INSERT INTO embed_forms (
        name,
        public_key,
        user_id,
        notify_email,
        allowed_domains,
        field_mapping,
        success_message
      )
      VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7)
      RETURNING *
    `,
    [
      name,
      publicKey,
      userId || null,
      notifyEmail || null,
      JSON.stringify(allowedDomains),
      JSON.stringify(fieldMapping),
      successMessage || 'Thank you. We received your message.',
    ]
  );

  return rows[0];
}

async function listEmbedForms(userId) {
  const values = [];
  let where = '';

  if (userId) {
    values.push(userId);
    where = `WHERE user_id = $1`;
  }

  const { rows } = await pool.query(
    `
      SELECT *
      FROM embed_forms
      ${where}
      ORDER BY created_at DESC, id DESC
    `,
    values
  );

  return rows;
}

async function getEmbedFormByPublicKey(publicKey) {
  const { rows } = await pool.query(
    `
      SELECT *
      FROM embed_forms
      WHERE public_key = $1
      LIMIT 1
    `,
    [publicKey]
  );

  return rows[0] || null;
}

async function getEmbedFormById(id) {
  const { rows } = await pool.query(
    `
      SELECT *
      FROM embed_forms
      WHERE id = $1
      LIMIT 1
    `,
    [id]
  );

  return rows[0] || null;
}

async function createEmbeddedContact({
  fullName,
  email,
  phone,
  company,
  address,
  message,
  sourceDomain,
  embedFormId,
  extraData = {},
}) {
  const { rows } = await pool.query(
    `
      INSERT INTO contacts (
        full_name,
        company,
        email,
        phone,
        address,
        message,
        source,
        source_domain,
        embed_form_id,
        extra_data
      )
      VALUES ($1,$2,$3,$4,$5,$6,'embed_script',$7,$8,$9::jsonb)
      RETURNING *
    `,
    [
      fullName,
      company || null,
      email || null,
      phone || null,
      address || null,
      message || null,
      sourceDomain || null,
      embedFormId || null,
      JSON.stringify(extraData || {}),
    ]
  );

  return rows[0];
}

module.exports = {
  createEmbedForm,
  listEmbedForms,
  getEmbedFormByPublicKey,
  getEmbedFormById,
  createEmbeddedContact,
};