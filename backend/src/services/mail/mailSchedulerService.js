const {
  syncInbox,
  processRecentPendingMails,
  autoReplyEligibleMails,
} = require('./mailAgentService');

let intervalRef = null;
let tickRunning = false;

function startMailScheduler() {
  const enabled = String(process.env.RUN_MAIL_AGENT_SCHEDULER || 'false') === 'true';
  if (!enabled || intervalRef) return;

  const intervalMs = Number(process.env.MAIL_AGENT_INTERVAL_MS || 120000);

  const tick = async () => {
    if (tickRunning) {
      console.warn('[MAIL_SCHEDULER][SKIP] Previous tick still running.');
      return;
    }

    tickRunning = true;

    try {
      await syncInbox();
      await processRecentPendingMails(Number(process.env.MAIL_PROCESS_LIMIT || 25));

      if (String(process.env.RUN_MAIL_AGENT_AUTO_REPLY || 'false') === 'true') {
        await autoReplyEligibleMails(Number(process.env.MAIL_AUTO_REPLY_LIMIT || 10));
      }
    } catch (error) {
      console.error('[MAIL_SCHEDULER][ERROR]', error.message);
    } finally {
      tickRunning = false;
    }
  };

  tick();
  intervalRef = setInterval(tick, intervalMs);

  if (typeof intervalRef.unref === 'function') {
    intervalRef.unref();
  }

  console.log(`Mail agent scheduler started. Interval: ${intervalMs}ms`);

  return intervalRef;
}

module.exports = { startMailScheduler };