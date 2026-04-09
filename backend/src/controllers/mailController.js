const { asyncHandler } = require('../utils/asyncHandler');
const { listMailMessages, getMailMessageById, getMailSummary } = require('../models/mailModel');
const {
  syncInbox,
  processMailById,
  processRecentPendingMails,
  sendReplyForMail,
  autoReplyEligibleMails,
  COMPANY_PROFILE,
} = require('../services/mailAgentService');

exports.getMailSummary = asyncHandler(async (_req, res) => {
  const summary = await getMailSummary();
  res.status(200).json({ success: true, companyProfile: COMPANY_PROFILE, summary });
});

exports.getInboxMails = asyncHandler(async (req, res) => {
  const mails = await listMailMessages({
    mailboxEmail: req.query.mailboxEmail,
    folder: req.query.folder,
    category: req.query.category,
    replyStatus: req.query.replyStatus,
    search: req.query.search,
    isSpam:
      typeof req.query.isSpam === 'string' ? String(req.query.isSpam) === 'true' : undefined,
    shouldReply:
      typeof req.query.shouldReply === 'string'
        ? String(req.query.shouldReply) === 'true'
        : undefined,
    limit: req.query.limit,
  });

  res.status(200).json({ success: true, count: mails.length, mails });
});

exports.getMailDetail = asyncHandler(async (req, res) => {
  const mail = await getMailMessageById(Number(req.params.id));
  if (!mail) {
    const error = new Error('Mail not found.');
    error.statusCode = 404;
    throw error;
  }
  res.status(200).json({ success: true, mail });
});

exports.syncInbox = asyncHandler(async (_req, res) => {
  const synced = await syncInbox();
  res.status(200).json({ success: true, message: 'Inbox synced successfully.', count: synced.length, synced });
});

exports.processInbox = asyncHandler(async (req, res) => {
  const processed = await processRecentPendingMails(Number(req.body?.limit || req.query?.limit || 25));
  res.status(200).json({ success: true, message: 'Inbox processed successfully.', count: processed.length, processed });
});

exports.processMail = asyncHandler(async (req, res) => {
  const mail = await processMailById(Number(req.params.id));
  res.status(200).json({ success: true, mail });
});

exports.replyMail = asyncHandler(async (req, res) => {
  const mail = await sendReplyForMail(Number(req.params.id), {
    subject: req.body?.subject,
    text: req.body?.text,
    html: req.body?.html,
  });
  res.status(200).json({ success: true, message: 'Reply processed.', mail });
});

exports.autoReply = asyncHandler(async (req, res) => {
  const sent = await autoReplyEligibleMails(Number(req.body?.limit || req.query?.limit || 15));
  res.status(200).json({ success: true, message: 'Eligible replies sent.', count: sent.length, sent });
});
