require('dotenv').config();
const { Worker } = require('bullmq');
const { createRedisConnection } = require('../config/redis');
const { LEAD_ENRICHMENT_QUEUE } = require('../services/leadQueueService');
const { runLeadEnrichment } = require('../services/leadAiService');
const { upsertLeadAiData, getLeadById } = require('../models/leadModel');

let workerInstance = null;

function startLeadEnrichmentWorker() {
  if (workerInstance) return workerInstance;

  workerInstance = new Worker(
    LEAD_ENRICHMENT_QUEUE,
    async (job) => {
      const { contactId, requestedBy } = job.data;

      console.log('[WORKER][START]', {
        jobId: job.id,
        contactId,
        requestedBy,
        attemptsMade: job.attemptsMade,
      });

      return runLeadEnrichment(contactId);
    },
    {
      connection: createRedisConnection(),
      concurrency: Number(process.env.LEAD_AI_WORKER_CONCURRENCY || 2),
    }
  );

  workerInstance.on('ready', () => {
    console.log('[WORKER][READY] Lead enrichment worker is ready.');
  });

  workerInstance.on('completed', async (job) => {
    console.log('[WORKER][COMPLETED]', {
      jobId: job.id,
      contactId: job?.data?.contactId,
      attemptsMade: job.attemptsMade,
    });
  });

  workerInstance.on('failed', async (job, error) => {
    const contactId = Number(job?.data?.contactId);

    console.error('[WORKER][FAILED]', {
      jobId: job?.id || null,
      contactId,
      attemptsMade: job?.attemptsMade ?? null,
      message: error?.message || 'Unknown worker error',
      stack: error?.stack || null,
    });

    if (!contactId) return;

    try {
      const lead = await getLeadById(contactId);

      // Critical guard:
      // if service already saved a completed result, do NOT overwrite it.
      if (lead?.ai?.status === 'completed') {
        console.log('[WORKER][FAILED_BUT_ALREADY_COMPLETED]', {
          contactId,
          jobId: job?.id || null,
        });
        return;
      }

      await upsertLeadAiData(contactId, {
        status: 'failed',
        intent: lead?.ai?.intent || 'unknown',
        industry: lead?.ai?.industry || 'unknown',
        urgency: lead?.ai?.urgency || 'medium',
        score: lead?.ai?.score || 0,
        confidence: lead?.ai?.confidence || 0,
        companySummary: lead?.ai?.companySummary || null,
        aiSummary: lead?.ai?.aiSummary || null,
        painPoints: lead?.ai?.painPoints || [],
        recommendedAction: lead?.ai?.recommendedAction || null,
        researchSources: lead?.ai?.researchSources || [],
        rawResearch: {
          ...(lead?.ai?.rawResearch || {}),
          workerFailure: {
            jobId: job?.id || null,
            attemptsMade: job?.attemptsMade ?? null,
            failedReason: error?.message || 'Unknown worker error',
            stack: error?.stack || null,
          },
        },
        errorMessage: error?.message || 'Lead enrichment worker failed.',
        lastEnrichedAt: lead?.ai?.lastEnrichedAt || null,
      });
    } catch (writeError) {
      console.error('[WORKER][FAILED_TO_UPDATE_DB]', {
        contactId,
        message: writeError.message,
        stack: writeError.stack || null,
      });
    }
  });

  workerInstance.on('error', (error) => {
    console.error('[WORKER][ERROR]', {
      message: error.message,
      stack: error.stack || null,
    });
  });

  return workerInstance;
}

if (require.main === module) {
  startLeadEnrichmentWorker();
}

module.exports = { startLeadEnrichmentWorker };