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
    return existingJob;
  }

  await upsertLeadAiData(normalizedContactId, {
    status: 'queued',
    errorMessage: null,
  });

  await createLeadAiEvent(
    normalizedContactId,
    'enrichment_queued',
    'success',
    { requestedBy },
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
