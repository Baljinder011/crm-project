const { pool } = require('../config/db');

async function findUserByEmail(email) {
  const query = `
    SELECT id, name, email, password_hash, is_active, created_at, updated_at
    FROM users
    WHERE email = $1
    LIMIT 1
  `;
  const { rows } = await pool.query(query, [email]);
  return rows[0] || null;
}

async function findUserById(id) {
  const query = `
    SELECT id, name, email, is_active, created_at, updated_at
    FROM users
    WHERE id = $1
    LIMIT 1
  `;
  const { rows } = await pool.query(query, [id]);
  return rows[0] || null;
}

async function createUser({ name, email, passwordHash }) {
  const query = `
    INSERT INTO users (name, email, password_hash)
    VALUES ($1, $2, $3)
    RETURNING id, name, email, is_active, created_at, updated_at
  `;
  const values = [name, email, passwordHash];
  const { rows } = await pool.query(query, values);
  return rows[0];
}

async function updateUserPassword(userId, passwordHash) {
  const query = `
    UPDATE users
    SET password_hash = $2, updated_at = NOW()
    WHERE id = $1
    RETURNING id, name, email, is_active, created_at, updated_at
  `;
  const { rows } = await pool.query(query, [userId, passwordHash]);
  return rows[0] || null;
}

module.exports = {
  findUserByEmail,
  findUserById,
  createUser,
  updateUserPassword,
};