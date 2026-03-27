const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is missing in environment variables.');
}

const isProduction = process.env.NODE_ENV === 'production';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isProduction ? { rejectUnauthorized: false } : false,
});

async function testDatabaseConnection() {
  const client = await pool.connect();
  try {
    await client.query('SELECT NOW()');
    console.log('PostgreSQL connected successfully.');
  } finally {
    client.release();
  }
}

module.exports = { pool, testDatabaseConnection };