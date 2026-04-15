const { asyncHandler } = require('../utils/asyncHandler');
const { listLeads, getLeadById } = require('../models/leadModel');
const { enqueueLeadEnrichment } = require('../services/lead/leadQueueService');

exports.getLeads = asyncHandler(async (_req, res) => {
  const leads = await listLeads();

  const summary = leads.reduce(
    (acc, lead) => {
      acc.total += 1;
      if (lead.ai.status === 'completed') acc.completed += 1;
      if (lead.ai.status === 'processing' || lead.ai.status === 'queued') acc.processing += 1;
      if (lead.ai.status === 'failed') acc.failed += 1;
      if (lead.ai.score >= 80) acc.hot += 1;
      return acc;
    },
    { total: 0, completed: 0, processing: 0, failed: 0, hot: 0 }
  );

  res.status(200).json({
    success: true,
    summary,
    leads,
  });
});

exports.getLeadDetail = asyncHandler(async (req, res) => {
  const lead = await getLeadById(Number(req.params.id));

  if (!lead) {
    const error = new Error('Lead not found.');
    error.statusCode = 404;
    throw error;
  }

  res.status(200).json({
    success: true,
    lead,
  });
});

exports.enrichLead = asyncHandler(async (req, res) => {
  const contactId = Number(req.params.id);
  const lead = await getLeadById(contactId);

  if (!lead) {
    const error = new Error('Lead not found.');
    error.statusCode = 404;
    throw error;
  }

  const job = await enqueueLeadEnrichment(contactId, req.user?.email || 'manual');

  res.status(202).json({
    success: true,
    message: 'Lead enrichment queued successfully.',
    jobId: job.id,
  });
});

exports.enrichAllLeads = asyncHandler(async (req, res) => {
  const leads = await listLeads();
  const candidates = leads.filter((lead) => lead.ai.status !== 'processing');

  const jobs = await Promise.all(
    candidates.map((lead) => enqueueLeadEnrichment(lead.id, req.user?.email || 'bulk_manual'))
  );

  res.status(202).json({
    success: true,
    message: `${jobs.length} lead enrichment jobs queued successfully.`,
    count: jobs.length,
  });
});