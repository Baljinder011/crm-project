const nodemailer = require('nodemailer');
const { callRawLlmForJson } = require('../config/aiClient');
const { MODEL } = require('../ai/modelConfig');
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

function schemaInstruction(name, schema) {
  return [
    `Return valid JSON only for schema: ${name}.`,
    'No markdown. No code fences. No explanation.',
    `Schema:\n${JSON.stringify(schema, null, 2)}`,
  ].join('\n\n');
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

  const safeTextBody = truncateText(message.textBody || '', 3000);
  const safeHtmlBodyText = truncateText(stripHtml(message.htmlBody || ''), 3000);

  const result = await callRawLlmForJson(
    [
      {
        role: 'system',
        content:
          'You are an email triage and sales-reply assistant. Be conservative. Only mark shouldReply=true when the email is clearly a genuine inbound lead, clearly relevant to the company profile, and a reply can be useful and safe. Never treat newsletters, job applications, support complaints, vendor pitches, personal notes, or ambiguous emails as auto-reply leads.',
      },
      {
        role: 'user',
        content: [
          schemaInstruction('mail_classification', MAIL_SCHEMA),
          JSON.stringify(
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
        ].join('\n\n'),
      },
    ],
    {
      model: MODEL,
      temperature: 0.2,
    }
  );

  const parsed = result.json;
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
      source: 'local_ai',
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

async function processMailMessage(messageId) {
  const message = await getMailMessageById(messageId);

  if (!message) {
    throw new Error(`Mail message ${messageId} not found.`);
  }

  const classification = await classifyMail(message);

  await updateMailClassification(messageId, {
    aiStatus: classification.aiStatus,
    isSpam: classification.isSpam,
    spamScore: classification.spamScore,
    spamReasons: classification.spamReasons,
    category: classification.category,
    companyFit: classification.companyFit,
    leadScore: classification.leadScore,
    confidence: classification.confidence,
    shouldReply: classification.shouldReply,
    matchedServices: classification.matchedServices,
    extractedRequirements: classification.extractedRequirements,
    leadSummary: classification.leadSummary,
    suggestedReplySubject: classification.suggestedReplySubject,
    suggestedReplyHtml: classification.suggestedReplyHtml,
    suggestedReplyText: classification.suggestedReplyText,
    classification,
  });

  return classification;
}

async function processRecentPendingMails(limit = 25) {
  const mails = await listMailMessages({
    limit,
    aiStatus: 'pending',
  });

  const results = [];

  for (const mail of mails) {
    try {
      const result = await processMailMessage(mail.id);
      results.push({ id: mail.id, ok: true, result });
    } catch (error) {
      await updateMailClassification(mail.id, {
        aiStatus: 'failed',
        classification: {
          error: error.message,
          model: MODEL,
        },
      });

      results.push({ id: mail.id, ok: false, error: error.message });
    }
  }

  return results;
}

async function sendReply(messageId) {
  const message = await getMailMessageById(messageId);

  if (!message) {
    throw new Error(`Mail message ${messageId} not found.`);
  }

  if (!message.shouldReply) {
    await markReplySkipped(messageId, 'AI marked this message as not eligible for auto reply.');
    return { skipped: true };
  }

  if (!message.fromEmail) {
    await markReplySkipped(messageId, 'Sender email missing.');
    return { skipped: true };
  }

  const transporter = getTransporter();
  const mailbox = getMailboxConfig();

  const fromName = process.env.MAIL_FROM_NAME || COMPANY_PROFILE.name;
  const fromAddress = process.env.MAIL_FROM || mailbox.mailboxEmail;

  await transporter.sendMail({
    from: `"${fromName}" <${fromAddress}>`,
    to: message.fromEmail,
    subject: message.suggestedReplySubject || `Re: ${message.subject || 'Your inquiry'}`,
    text: message.suggestedReplyText || '',
    html: message.suggestedReplyHtml || '',
    replyTo: fromAddress,
    inReplyTo: message.messageIdHeader || undefined,
    references: message.messageIdHeader || undefined,
  });

  await markReplySent(messageId);

  return { sent: true };
}

async function autoReplyEligibleMails(limit = 10) {
  const mails = await listMailMessages({
    limit,
    shouldReply: true,
    replyStatus: 'pending',
  });

  const results = [];

  for (const mail of mails) {
    try {
      const result = await sendReply(mail.id);
      results.push({ id: mail.id, ok: true, result });
    } catch (error) {
      await markReplySkipped(mail.id, error.message);
      results.push({ id: mail.id, ok: false, error: error.message });
    }
  }

  return results;
}

module.exports = {
  syncInbox,
  processMailMessage,
  processRecentPendingMails,
  autoReplyEligibleMails,
  sendReply,
};