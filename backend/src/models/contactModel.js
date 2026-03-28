const { pool } = require('../config/db');

async function getAllContacts() {
  const query = `
    SELECT
      id,
      full_name,
      company,
      email,
      phone,
      address,
      message,
      created_at
    FROM contacts
    ORDER BY created_at DESC, id DESC
  `;

  const { rows } = await pool.query(query);
  return rows;
}

module.exports = {
  getAllContacts,
};