const { asyncHandler } = require('../utils/asyncHandler');
const {
  getAllContacts,
  getContactById,
  updateContactPipeline,
} = require('../models/contactModel');
const { getLeadAiEvents } = require('../models/leadModel');
const { enqueueLeadEnrichment } = require('../services/lead/leadQueueService');

exports.getContacts = asyncHandler(async (_req, res) => {
  const contacts = await getAllContacts();

  const summary = contacts.reduce(
    (acc, contact) => {
      acc.total += 1;
      if (contact.ai?.status === 'completed') acc.completed += 1;
      if (contact.ai?.status === 'processing' || contact.ai?.status === 'queued') acc.processing += 1;
      if (contact.ai?.status === 'failed') acc.failed += 1;
      if ((contact.ai?.score || 0) >= 80) acc.hot += 1;
      return acc;
    },
    { total: 0, completed: 0, processing: 0, failed: 0, hot: 0 }
  );

  res.status(200).json({
    success: true,
    summary,
    contacts,
  });
});

exports.getContactDetail = asyncHandler(async (req, res) => {
  const contactId = Number(req.params.id);
  const contact = await getContactById(contactId);

  if (!contact) {
    const error = new Error('Contact not found.');
    error.statusCode = 404;
    throw error;
  }

  res.status(200).json({
    success: true,
    contact,
  });
});

exports.getContactAiEvents = asyncHandler(async (req, res) => {
  const contactId = Number(req.params.id);
  const contact = await getContactById(contactId);

  if (!contact) {
    const error = new Error('Contact not found.');
    error.statusCode = 404;
    throw error;
  }

  const limit = Number(req.query.limit || 100);
  const events = await getLeadAiEvents(contactId, limit);

  res.status(200).json({
    success: true,
    events,
  });
});

exports.enrichContact = asyncHandler(async (req, res) => {
  const contactId = Number(req.params.id);
  const contact = await getContactById(contactId);

  if (!contact) {
    const error = new Error('Contact not found.');
    error.statusCode = 404;
    throw error;
  }

  const currentStatus = contact.ai?.status;

  if (currentStatus === 'processing' || currentStatus === 'queued') {
    return res.status(409).json({
      success: false,
      message: `AI is already ${currentStatus} for this contact.`,
    });
  }

  const job = await enqueueLeadEnrichment(contactId, req.user?.email || 'manual');

  res.status(202).json({
    success: true,
    message: 'Contact enrichment queued successfully.',
    jobId: job.id,
  });
});

exports.enrichAllContacts = asyncHandler(async (req, res) => {
  const contacts = await getAllContacts();
  const candidates = contacts.filter(
    (contact) => contact.ai?.status !== 'processing' && contact.ai?.status !== 'queued'
  );

  const jobs = await Promise.all(
    candidates.map((contact) =>
      enqueueLeadEnrichment(contact.id, req.user?.email || 'bulk_manual')
    )
  );

  res.status(202).json({
    success: true,
    message: `${jobs.length} contact enrichment jobs queued successfully.`,
    count: jobs.length,
  });
});

exports.updatePipeline = asyncHandler(async (req, res) => {
  const contactId = Number(req.params.id);
  const { stage, order } = req.body || {};

  const allowedStages = new Set(['new', 'scheduled', 'negotiation', 'proposal', 'won', 'lost']);

  if (!allowedStages.has(stage)) {
    const error = new Error('Invalid pipeline stage.');
    error.statusCode = 400;
    throw error;
  }

  if (!Number.isInteger(order) || order < 0) {
    const error = new Error('Invalid pipeline order.');
    error.statusCode = 400;
    throw error;
  }

  const updated = await updateContactPipeline(contactId, stage, order);

  if (!updated) {
    const error = new Error('Contact not found.');
    error.statusCode = 404;
    throw error;
  }

  res.status(200).json({
    success: true,
    pipeline: updated,
  });
});