const { pool } = require('../config/db');

async function createPasswordResetToken({ userId, tokenHash, expiresAt }) {
  const query = `
    INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
    VALUES ($1, $2, $3)
    RETURNING id, user_id, token_hash, expires_at, used_at, created_at
  `;
  const { rows } = await pool.query(query, [userId, tokenHash, expiresAt]);
  return rows[0];
}

async function invalidateActivePasswordResetTokens(userId) {
  const query = `
    UPDATE password_reset_tokens
    SET used_at = NOW()
    WHERE user_id = $1 AND used_at IS NULL AND expires_at > NOW()
  `;
  await pool.query(query, [userId]);
}

async function findValidPasswordResetToken(tokenHash) {
  const query = `
    SELECT prt.id, prt.user_id, prt.token_hash, prt.expires_at, prt.used_at,
           u.id AS user_id_ref, u.name, u.email, u.password_hash, u.is_active
    FROM password_reset_tokens prt
    INNER JOIN users u ON u.id = prt.user_id
    WHERE prt.token_hash = $1
      AND prt.used_at IS NULL
      AND prt.expires_at > NOW()
    LIMIT 1
  `;
  const { rows } = await pool.query(query, [tokenHash]);
  return rows[0] || null;
}

async function markPasswordResetTokenUsed(tokenId) {
  const query = `
    UPDATE password_reset_tokens
    SET used_at = NOW()
    WHERE id = $1
  `;
  await pool.query(query, [tokenId]);
}

module.exports = {
  createPasswordResetToken,
  invalidateActivePasswordResetTokens,
  findValidPasswordResetToken,
  markPasswordResetTokenUsed,
};