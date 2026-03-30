require('dotenv').config();
const { Worker } = require('bullmq');
const { createRedisConnection } = require('../config/redis');
const { LEAD_ENRICHMENT_QUEUE } = require('../services/leadQueueService');
const { runLeadEnrichment } = require('../services/leadAiService');

let workerInstance = null;

function startLeadEnrichmentWorker() {
  if (workerInstance) return workerInstance;

  workerInstance = new Worker(
    LEAD_ENRICHMENT_QUEUE,
    async (job) => {
      const { contactId } = job.data;
      return runLeadEnrichment(contactId);
    },
    {
      connection: createRedisConnection(),
      concurrency: Number(process.env.LEAD_AI_WORKER_CONCURRENCY || 2),
    }
  );

  workerInstance.on('ready', () => {
    console.log('Lead enrichment worker is ready.');
  });

  workerInstance.on('completed', (job) => {
    console.log(`Lead enrichment completed for job ${job.id}`);
  });

  workerInstance.on('failed', (job, error) => {
    console.error(`Lead enrichment failed for job ${job?.id}:`, error.message);
  });

  workerInstance.on('error', (error) => {
    console.error('Lead enrichment worker error:', error.message);
  });

  return workerInstance;
}

if (require.main === module) {
  startLeadEnrichmentWorker();
}

module.exports = { startLeadEnrichmentWorker };