const nodemailer = require('nodemailer');
const { getOpenAIClient } = require('../config/openai');
const { buildModelOptions, MODEL } = require('../ai/modelConfig');
const {
  getMailMessageById,
  updateMailClassification,
  markReplySent,
  markReplySkipped,
  upsertMailMessage,
  listMailMessages,
} = require('../models/mailModel');
const { fetchRecentInboxMessages, getMailboxConfig } = require('./mailInboxService');

const COMPANY_PROFILE = {
  name: process.env.COMPANY_NAME || 'IndraQ Innovations',
  website: process.env.COMPANY_WEBSITE || 'https://indraq.com/',
  linkedin: process.env.COMPANY_LINKEDIN || 'https://in.linkedin.com/company/indraq-innovations',
  description:
    process.env.COMPANY_DESCRIPTION ||
    'IndraQ Innovations helps businesses grow with CRM implementation and business process automation, including HubSpot, Zoho, Salesforce, web development, app development, cloud apps, graphic designing, and digital marketing.',
  services: [
    'HubSpot',
    'Zoho',
    'Salesforce',
    'Web Development',
    'App Development',
    'Cloud Apps',
    'Graphic Designing',
    'Digital Marketing',
    'Business Process Automation',
  ],
};

const MAIL_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    isSpam: { type: 'boolean' },
    spamScore: { type: 'integer', minimum: 0, maximum: 100 },
    spamReasons: { type: 'array', items: { type: 'string' }, maxItems: 8 },
    category: {
      type: 'string',
      enum: ['lead', 'support', 'job', 'vendor', 'personal', 'newsletter', 'spam', 'other'],
    },
    companyFit: { type: 'boolean' },
    leadScore: { type: 'integer', minimum: 0, maximum: 100 },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    shouldReply: { type: 'boolean' },
    matchedServices: { type: 'array', items: { type: 'string' }, maxItems: 8 },
    extractedRequirements: { type: 'array', items: { type: 'string' }, maxItems: 8 },
    leadSummary: { type: 'string' },
    suggestedReplySubject: { type: 'string' },
    suggestedReplyHtml: { type: 'string' },
    suggestedReplyText: { type: 'string' },
  },
  required: [
    'isSpam',
    'spamScore',
    'spamReasons',
    'category',
    'companyFit',
    'leadScore',
    'confidence',
    'shouldReply',
    'matchedServices',
    'extractedRequirements',
    'leadSummary',
    'suggestedReplySubject',
    'suggestedReplyHtml',
    'suggestedReplyText',
  ],
};

function getResponseText(response) {
  if (response.output_text) return response.output_text;
  const messageItem = response.output?.find((item) => item.type === 'message');
  const textItem = messageItem?.content?.find((item) => item.type === 'output_text');
  return textItem?.text || '';
}

function getReplyThreshold() {
  return Number(process.env.MAIL_AUTO_REPLY_CONFIDENCE || 0.88);
}

function stripHtml(html = '') {
  return String(html)
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanText(text = '') {
  return String(text)
    .replace(/=\r?\n/g, '')
    .replace(/=0D/gi, ' ')
    .replace(/=0A/gi, ' ')
    .replace(/=09/gi, ' ')
    .replace(/\u0000/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncateText(text = '', max = 3000) {
  const cleaned = cleanText(text);
  if (cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, max)}...`;
}

function getHardSpamHeuristics(message) {
  const reasons = [];
  const fromEmail = String(message.fromEmail || '').toLowerCase();
  const subject = String(message.subject || '').toLowerCase();
  const body = `${message.textBody || ''} ${stripHtml(message.htmlBody || '')}`.toLowerCase();

  if (!fromEmail) reasons.push('missing_sender');
  if (/mailer-daemon|postmaster|noreply|no-reply/.test(fromEmail)) reasons.push('system_sender');
  if (/viagra|casino|crypto|loan approved|adult|bet now/.test(`${subject} ${body}`)) {
    reasons.push('obvious_spam_keywords');
  }
  if ((body.match(/https?:\/\//g) || []).length > 10) reasons.push('too_many_links');
  if (body.length < 10) reasons.push('too_short');

  return reasons;
}

async function classifyMail(message) {
  const heuristicSpamReasons = getHardSpamHeuristics(message);

  if (
    heuristicSpamReasons.includes('system_sender') ||
    heuristicSpamReasons.includes('obvious_spam_keywords')
  ) {
    return {
      isSpam: true,
      spamScore: 95,
      spamReasons: heuristicSpamReasons,
      category: 'spam',
      companyFit: false,
      leadScore: 0,
      confidence: 0.99,
      shouldReply: false,
      matchedServices: [],
      extractedRequirements: [],
      leadSummary: 'Marked as spam by hard heuristics.',
      suggestedReplySubject: '',
      suggestedReplyHtml: '',
      suggestedReplyText: '',
      aiStatus: 'completed',
      classification: {
        source: 'heuristics',
        model: MODEL,
      },
    };
  }

  const client = getOpenAIClient();
  const safeTextBody = truncateText(message.textBody || '', 3000);
  const safeHtmlBodyText = truncateText(stripHtml(message.htmlBody || ''), 3000);

  const response = await client.responses.create({
    ...buildModelOptions(),
    max_output_tokens: 500,
    input: [
      {
        role: 'developer',
        content:
          'You are an email triage and sales-reply assistant. Be conservative. Only mark shouldReply=true when the email is clearly a genuine inbound lead, clearly relevant to the company profile, and a reply can be useful and safe. Never treat newsletters, job applications, support complaints, vendor pitches, personal notes, or ambiguous emails as auto-reply leads. Return strict JSON only.',
      },
      {
        role: 'user',
        content: JSON.stringify(
          {
            companyProfile: COMPANY_PROFILE,
            instructions: {
              objective:
                'Find genuine inbound lead emails relevant to the company and draft a useful, short, human-sounding first reply.',
              replyTone: 'professional, warm, concise, business development oriented',
              mustAvoid: [
                'inventing services or pricing',
                'making commitments or deadlines',
                'claiming certainty when requirements are unclear',
                'replying to spam or irrelevant emails',
              ],
            },
            email: {
              subject: message.subject,
              fromName: message.fromName,
              fromEmail: message.fromEmail,
              receivedAt: message.receivedAt,
              textBody: safeTextBody,
              htmlBodyText: safeHtmlBodyText,
            },
            heuristicSpamReasons,
          },
          null,
          2
        ),
      },
    ],
    text: {
      format: {
        type: 'json_schema',
        name: 'mail_classification',
        strict: true,
        schema: MAIL_SCHEMA,
      },
    },
  });

  const parsed = JSON.parse(getResponseText(response));
  const companyFit = Boolean(parsed.companyFit);
  const confidence = Number(parsed.confidence || 0);
  const isSpam = Boolean(parsed.isSpam);

  const shouldReply =
    Boolean(parsed.shouldReply) &&
    !isSpam &&
    parsed.category === 'lead' &&
    companyFit &&
    confidence >= getReplyThreshold();

  return {
    ...parsed,
    shouldReply,
    aiStatus: 'completed',
    classification: {
      ...parsed,
      source: 'openai',
      model: MODEL,
      threshold: getReplyThreshold(),
      heuristicSpamReasons,
    },
  };
}

function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT || 587) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

async function syncInbox() {
  const messages = await fetchRecentInboxMessages();
  const saved = [];

  for (const message of messages) {
    const row = await upsertMailMessage(message);
    saved.push(row);
  }

  return saved;
}

async function processMailById(id) {
  const mail = await getMailMessageById(id);
  if (!mail) throw new Error('Mail not found.');

  const result = await classifyMail(mail);
  return updateMailClassification(id, result);
}

async function processRecentPendingMails(limit = 25) {
  const items = await listMailMessages({ limit, replyStatus: 'not_sent' });
  const processed = [];

  for (const item of items) {
    if (item.aiStatus === 'completed' && item.category) {
      processed.push(item);
      continue;
    }

    processed.push(await processMailById(item.id));
  }

  return processed;
}

async function sendReplyForMail(id, options = {}) {
  const mail = await getMailMessageById(id);
  if (!mail) throw new Error('Mail not found.');

  if (mail.replyStatus === 'sent') {
    return mail;
  }

  const processed = mail.aiStatus === 'completed' ? mail : await processMailById(id);

  if (!processed.shouldReply) {
    return markReplySkipped(id, 'not_safe_for_auto_reply');
  }

  if (!processed.fromEmail) {
    return markReplySkipped(id, 'missing_recipient');
  }

  const transporter = getTransporter();
  const mailbox = getMailboxConfig();
  const fromName = process.env.MAIL_FROM_NAME || COMPANY_PROFILE.name;
  const fromAddress = process.env.MAIL_FROM || mailbox.mailboxEmail;

  const info = await transporter.sendMail({
    from: `${fromName} <${fromAddress}>`,
    to: processed.fromEmail,
    subject: options.subject || processed.suggestedReplySubject || `Re: ${processed.subject}`,
    text: options.text || processed.suggestedReplyText || undefined,
    html: options.html || processed.suggestedReplyHtml || undefined,
    inReplyTo: processed.messageId || undefined,
    references: processed.threadKey || processed.messageId || undefined,
  });

  return markReplySent(id, info.messageId || null);
}

async function autoReplyEligibleMails(limit = 15) {
  const processed = await processRecentPendingMails(limit);
  const sent = [];

  for (const mail of processed) {
    if (mail.shouldReply && mail.replyStatus === 'not_sent') {
      sent.push(await sendReplyForMail(mail.id));
    }
  }

  return sent;
}

module.exports = {
  COMPANY_PROFILE,
  syncInbox,
  processMailById,
  processRecentPendingMails,
  sendReplyForMail,
  autoReplyEligibleMails,
};