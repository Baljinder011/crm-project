const { syncInbox, processRecentPendingMails, autoReplyEligibleMails } = require('./mailAgentService');

let intervalRef = null;

function startMailScheduler() {
  const enabled = String(process.env.RUN_MAIL_AGENT_SCHEDULER || 'false') === 'true';
  if (!enabled || intervalRef) return;

  const intervalMs = Number(process.env.MAIL_AGENT_INTERVAL_MS || 120000);

  const tick = async () => {
    try {
      await syncInbox();
      await processRecentPendingMails(Number(process.env.MAIL_PROCESS_LIMIT || 25));
      if (String(process.env.RUN_MAIL_AGENT_AUTO_REPLY || 'false') === 'true') {
        await autoReplyEligibleMails(Number(process.env.MAIL_AUTO_REPLY_LIMIT || 10));
      }
    } catch (error) {
      console.error('Mail agent scheduler error:', error.message);
    }
  };

  tick();
  intervalRef = setInterval(tick, intervalMs);
  console.log(`Mail agent scheduler started. Interval: ${intervalMs}ms`);
}

module.exports = { startMailScheduler };
