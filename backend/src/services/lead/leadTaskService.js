const { upsertLeadTask } = require('../../models/leadModel');

function buildPriority(score = 0, urgency = 'medium') {
  if (score >= 80 || urgency === 'high') return 'high';
  if (score >= 50) return 'medium';
  return 'low';
}

function getDueDate(priority) {
  const now = new Date();

  if (priority === 'high') {
    now.setHours(now.getHours() + 2);
    return now;
  }

  if (priority === 'medium') {
    now.setHours(now.getHours() + 8);
    return now;
  }

  now.setDate(now.getDate() + 1);
  return now;
}

async function createFollowUpTask(contactId, enrichment) {
  const priority = buildPriority(enrichment.score, enrichment.urgency);

  const title =
    priority === 'high'
      ? 'Call this lead quickly and review the AI brief'
      : priority === 'medium'
      ? 'Review the AI brief and send a follow-up today'
      : 'Review this lead and decide next outreach step';

  return upsertLeadTask(contactId, {
    type: 'follow_up',
    title,
    priority,
    dueAt: getDueDate(priority),
    assignedTo: null,
  });
}

module.exports = { createFollowUpTask };