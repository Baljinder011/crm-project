const Redis = require('ioredis');

let connection = null;

function createRedisConnection() {
  if (connection) return connection;

  connection = new Redis({
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: Number(process.env.REDIS_PORT || 6379),
    password: process.env.REDIS_PASSWORD || undefined,
    db: Number(process.env.REDIS_DB || 0),
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });

  connection.on('error', (error) => {
    console.error('Redis error:', error.message);
  });

  return connection;
}

module.exports = { createRedisConnection };