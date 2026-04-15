require('dotenv').config();
const app = require('./src/app');
const { pool, testDatabaseConnection } = require('./src/config/db');
const { startLeadEnrichmentWorker } = require('./src/workers/leadEnrichmentWorker');
const { startLeadAutoEnrichmentScheduler } = require('./src/services/lead/leadAutoEnrichmentService');
const { startMailScheduler } = require('./src/services/mail/mailSchedulerService');
const {
  RAW_LLM_ENDPOINT,
  FIRECRAWL_SCRAPE_ENDPOINT,
  FIRECRAWL_CRAWL_ENDPOINT,
  AI_AGENT_ENDPOINT,
  AI_MODEL,
} = require('./src/config/aiClient');

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await testDatabaseConnection();

    const server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log('[AI][CONFIG]', {
        rawEndpoint: RAW_LLM_ENDPOINT,
        rawModel: AI_MODEL,
        scrapeEndpoint: FIRECRAWL_SCRAPE_ENDPOINT,
        crawlEndpoint: FIRECRAWL_CRAWL_ENDPOINT,
        agentEndpoint: AI_AGENT_ENDPOINT,
      });
    });

    if (String(process.env.RUN_LEAD_WORKER || 'true') !== 'false') {
      startLeadEnrichmentWorker();
    }

    if (String(process.env.RUN_LEAD_AUTO_ENRICH_SCHEDULER || 'true') !== 'false') {
      startLeadAutoEnrichmentScheduler();
    }

    startMailScheduler();

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