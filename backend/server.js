require('dotenv').config();
const app = require('./src/app');
const { pool, testDatabaseConnection } = require('./src/config/db');
const { startLeadEnrichmentWorker } = require('./src/workers/leadEnrichmentWorker');
const { startLeadAutoEnrichmentScheduler } = require('./src/services/leadAutoEnrichmentService');
const { runMigrations } = require('./runMigrations');

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await testDatabaseConnection();
    await runMigrations();

    const server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

    if (String(process.env.RUN_LEAD_WORKER || 'true') !== 'false') {
      startLeadEnrichmentWorker();
    }

    if (String(process.env.RUN_LEAD_AUTO_ENRICH_SCHEDULER || 'true') !== 'false') {
      startLeadAutoEnrichmentScheduler();
    }

    const shutdown = async (signal) => {
      console.log(`\n${signal} received. Closing server...`);
      server.close(async () => {
        try {
          await pool.end();
          console.log('Database pool closed.');
          process.exit(0);
        } catch (error) {
          console.error('Error while closing database pool:', error.message);
          process.exit(1);
        }
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
}

startServer();
