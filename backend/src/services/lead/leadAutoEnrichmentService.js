const { listAutoEnrichmentCandidates } = require('../../models/contactModel');
const { enqueueLeadEnrichment } = require('./leadQueueService');

let autoEnrichmentTimer = null;
let isRunning = false;

async function scanAndQueuePendingLeadEnrichment() {
  if (isRunning) return { queued: 0, skipped: true };

  isRunning = true;

  try {
    const batchSize = Number(process.env.LEAD_AUTO_ENRICH_BATCH_SIZE || 25);
    const contactIds = await listAutoEnrichmentCandidates(batchSize);

    let queued = 0;

    for (const contactId of contactIds) {
      try {
        await enqueueLeadEnrichment(contactId, 'auto_on_new_lead');
        queued += 1;
      } catch (error) {
        console.error(`Auto-enrichment queue failed for contact ${contactId}:`, error.message);
      }
    }

    return { queued, skipped: false };
  } finally {
    isRunning = false;
  }
}

function startLeadAutoEnrichmentScheduler() {
  if (autoEnrichmentTimer) return autoEnrichmentTimer;

  const intervalMs = Number(process.env.LEAD_AUTO_ENRICH_INTERVAL_MS || 5000);

  scanAndQueuePendingLeadEnrichment().catch((error) => {
    console.error('Initial auto-enrichment scan failed:', error.message);
  });

  autoEnrichmentTimer = setInterval(() => {
    scanAndQueuePendingLeadEnrichment().catch((error) => {
      console.error('Auto-enrichment scan failed:', error.message);
    });
  }, intervalMs);

  if (typeof autoEnrichmentTimer.unref === 'function') {
    autoEnrichmentTimer.unref();
  }

  console.log(`Lead auto-enrichment scheduler started. Polling every ${intervalMs}ms.`);

  return autoEnrichmentTimer;
}

module.exports = {
  scanAndQueuePendingLeadEnrichment,
  startLeadAutoEnrichmentScheduler,
};
