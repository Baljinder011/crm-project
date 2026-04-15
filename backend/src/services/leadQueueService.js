const { Queue } = require('bullmq');
const { createRedisConnection } = require('../config/redis');
const { upsertLeadAiData, createLeadAiEvent } = require('../models/leadModel');
const { MODEL } = require('../ai/modelConfig');

const LEAD_ENRICHMENT_QUEUE = 'lead-enrichment';

let queue = null;

function getLeadEnrichmentQueue() {
  if (!queue) {
    queue = new Queue(LEAD_ENRICHMENT_QUEUE, {
      connection: createRedisConnection(),
      defaultJobOptions: {
        attempts: 3,
        removeOnComplete: 100,
        removeOnFail: 100,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      },
    });
  }

  return queue;
}

async function enqueueLeadEnrichment(contactId, requestedBy = 'system') {
  const normalizedContactId = Number(contactId);
  const leadQueue = getLeadEnrichmentQueue();
  const jobId = `contact-${normalizedContactId}`;

  const existingJob = await leadQueue.getJob(jobId);

  if (existingJob) {
    const state = await existingJob.getState();

    // only reuse if job is genuinely active/waiting/delayed
    if (['waiting', 'active', 'delayed', 'prioritized', 'waiting-children'].includes(state)) {
      await createLeadAiEvent(
        normalizedContactId,
        'enrichment_queue_reused',
        'success',
        {
          requestedBy,
          jobId,
          state,
        },
        MODEL
      );

      return existingJob;
    }

    // remove stale completed/failed job so manual retry actually creates a fresh one
    try {
      await existingJob.remove();

      await createLeadAiEvent(
        normalizedContactId,
        'stale_enrichment_job_removed',
        'success',
        {
          requestedBy,
          jobId,
          previousState: state,
        },
        MODEL
      );
    } catch (error) {
      await createLeadAiEvent(
        normalizedContactId,
        'stale_enrichment_job_remove_failed',
        'failed',
        {
          requestedBy,
          jobId,
          previousState: state,
          message: error?.message || 'Failed to remove stale job',
        },
        MODEL
      );
    }
  }

  await upsertLeadAiData(normalizedContactId, {
    status: 'queued',
    errorMessage: null,
  });

  await createLeadAiEvent(
    normalizedContactId,
    'enrichment_queued',
    'success',
    { requestedBy, jobId },
    MODEL
  );

  return leadQueue.add(
    'enrich-contact',
    { contactId: normalizedContactId, requestedBy },
    {
      jobId,
    }
  );
}

module.exports = {
  LEAD_ENRICHMENT_QUEUE,
  getLeadEnrichmentQueue,
  enqueueLeadEnrichment,
};