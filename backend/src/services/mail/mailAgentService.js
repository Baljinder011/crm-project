const nodemailer = require('nodemailer');
const {
  callRawLlmForJson,
  askWebsite,
  scrapeWebsite,
  RAW_LLM_ENDPOINT,
  FIRECRAWL_SCRAPE_ENDPOINT,
  AI_AGENT_ENDPOINT,
} = require('../../config/aiClient');
const { MODEL } = require('../../ai/modelConfig');
const {
  getMailMessageById,
  updateMailClassification,
  markReplySent,
  markReplySkipped,
  upsertMailMessage,
  listMailMessages,
} = require('../../models/mailModel');
const { fetchRecentInboxMessages, getMailboxConfig } = require('./mailInboxService');

const COMPANY_PROFILE = {
  name: process.env.COMPANY_NAME || 'IndraQ Innovations',
  website: process.env.COMPANY_WEBSITE || 'https://indraq.com/',
  linkedin:
    process.env.COMPANY_LINKEDIN ||
    'https://in.linkedin.com/company/indraq-innovations',
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

const PUBLIC_EMAIL_DOMAINS = new Set([
  'gmail.com',
  'googlemail.com',
  'yahoo.com',
  'outlook.com',
  'hotmail.com',
  'live.com',
  'icloud.com',
  'proton.me',
  'protonmail.com',
  'aol.com',
  'zoho.com',
  'yandex.com',
  'mail.com',
]);

function schemaInstruction(name, schema) {
  return [
    `Return valid JSON only for schema: ${name}.`,
    'No markdown. No code fences. No explanation.',
    `Schema:\n${JSON.stringify(schema, null, 2)}`,
  ].join('\n\n');
}

function getReplyThreshold() {
  return Number(process.env.MAIL_AUTO_REPLY_CONFIDENCE || 0.85);
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

function normalizeDomain(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0]
    .split(':')[0];
}

function getCompanyDomain() {
  return normalizeDomain(COMPANY_PROFILE.website);
}

function getSenderDomain(message) {
  const email = String(message?.fromEmail || '').toLowerCase().trim();
  if (!email.includes('@')) return '';
  return email.split('@')[1];
}

function isPublicEmailDomain(domain = '') {
  return PUBLIC_EMAIL_DOMAINS.has(normalizeDomain(domain));
}

function isOwnCompanyDomain(domain = '') {
  const ownDomain = getCompanyDomain();
  return Boolean(domain) && normalizeDomain(domain) === ownDomain;
}

function deriveSenderWebsite(message) {
  const domain = normalizeDomain(getSenderDomain(message));

  if (!domain) return null;
  if (isPublicEmailDomain(domain)) return null;
  if (isOwnCompanyDomain(domain)) return null;

  return `https://${domain}`;
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

function dedupeSources(sources = [], limit = 5) {
  const seen = new Set();
  const output = [];

  for (const source of sources) {
    const title = String(source?.title || '').trim();
    const url = String(source?.url || '').trim();
    const key = `${title}|${url}`;

    if (!title && !url) continue;
    if (seen.has(key)) continue;

    seen.add(key);
    output.push({
      title: title || url || 'Source',
      url,
    });

    if (output.length >= limit) break;
  }

  return output;
}

function buildSenderResearchQuestion(message) {
  return [
    'Research this sender company for inbound email triage.',
    'Keep it conservative and fact-based.',
    'Tell me:',
    '1. what the company likely does',
    '2. whether it appears business-relevant for CRM, automation, web/app development, cloud apps, or digital services',
    '3. any useful context for deciding if this inbound email is a real lead',
    '4. what kind of reply would make sense',
    '',
    `Inbound email context:\n${JSON.stringify({
      fromName: message.fromName,
      fromEmail: message.fromEmail,
      subject: message.subject,
      bodyPreview: truncateText(message.textBody || stripHtml(message.htmlBody || ''), 1200),
    }, null, 2)}`,
  ].join('\n');
}

async function researchSenderCompany(message) {
  const candidateUrl = deriveSenderWebsite(message);

  if (!candidateUrl) {
    return {
      candidateUrl: null,
      homepageSummary: '',
      agentSummary: '',
      sources: [],
    };
  }

  console.log('[MAIL-AI][RESEARCH][START]', {
    sender: message.fromEmail,
    candidateUrl,
    scrapeEndpoint: FIRECRAWL_SCRAPE_ENDPOINT,
    agentEndpoint: AI_AGENT_ENDPOINT,
  });

  let homepageSummary = '';
  let agentSummary = '';
  const sources = [];

  try {
    const scrapeResult = await scrapeWebsite(candidateUrl, { timeoutMs: 15000 });
    homepageSummary = truncateText(scrapeResult?.markdown || '', 1200);

    if (homepageSummary) {
      sources.push({
        title: scrapeResult?.title || 'Homepage',
        url: scrapeResult?.url || candidateUrl,
      });
    }
  } catch (error) {
    console.warn('[MAIL-AI][RESEARCH][SCRAPE_FAILED]', {
      sender: message.fromEmail,
      candidateUrl,
      error: error.message,
    });
  }

  try {
    const agentResult = await askWebsite(
      candidateUrl,
      buildSenderResearchQuestion(message),
      { timeoutMs: 25000 }
    );

    agentSummary = truncateText(agentResult?.answer || '', 1600);

    if (agentSummary) {
      sources.push({
        title: 'AI Agent analysis',
        url: candidateUrl,
      });
    }
  } catch (error) {
    console.warn('[MAIL-AI][RESEARCH][AGENT_FAILED]', {
      sender: message.fromEmail,
      candidateUrl,
      error: error.message,
    });
  }

  const finalSources = dedupeSources(sources, 5);

  console.log('[MAIL-AI][RESEARCH][DONE]', {
    sender: message.fromEmail,
    candidateUrl,
    homepageSummaryPreview: homepageSummary.slice(0, 160),
    agentSummaryPreview: agentSummary.slice(0, 160),
    sourceCount: finalSources.length,
  });

  return {
    candidateUrl,
    homepageSummary,
    agentSummary,
    sources: finalSources,
  };
}

function buildFallbackClassification(message, heuristicSpamReasons, research) {
  const text = `${message.subject || ''} ${message.textBody || ''} ${stripHtml(message.htmlBody || '')}`.toLowerCase();

  const hasBusinessIntent =
    /crm|hubspot|zoho|salesforce|website|web app|webapp|app development|automation|digital marketing|software|erp|integration|service|quote|proposal|pricing|demo|consultation|business/.test(
      text
    );

  const isSpam = heuristicSpamReasons.includes('system_sender') ||
    heuristicSpamReasons.includes('obvious_spam_keywords');

  const category = isSpam
    ? 'spam'
    : hasBusinessIntent
      ? 'lead'
      : /unsubscribe|newsletter|offer|discount|sale/.test(text)
        ? 'newsletter'
        : 'other';

  const companyFit = Boolean(research?.candidateUrl) || hasBusinessIntent;
const confidence = category === 'lead' ? (companyFit ? 0.78 : 0.55) : 0.4;
const leadScore = category === 'lead' ? (companyFit ? 72 : 42) : 0;
const shouldReply =
  category === 'lead' &&
  companyFit &&
  !isSpam;

  const leadSummary = category === 'lead'
    ? 'Potential inbound lead detected using fallback classification.'
    : isSpam
      ? 'Marked as spam by fallback classification.'
      : 'No strong lead signal was detected using fallback classification.';

  const suggestedReplySubject = shouldReply
    ? `Re: ${message.subject || 'Your inquiry'}`
    : '';

  const suggestedReplyText = shouldReply
    ? `Hi ${message.fromName || 'there'},\n\nThank you for reaching out. We reviewed your message and would be glad to understand your requirements better. Please share a bit more detail about your goals, timeline, and the kind of solution you are looking for.\n\nBest regards,\n${COMPANY_PROFILE.name}`
    : '';

  const suggestedReplyHtml = shouldReply
    ? `<div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6;">
        <p>Hi ${message.fromName || 'there'},</p>
        <p>Thank you for reaching out. We reviewed your message and would be glad to understand your requirements better.</p>
        <p>Please share a bit more detail about your goals, timeline, and the kind of solution you are looking for.</p>
        <p>Best regards,<br />${COMPANY_PROFILE.name}</p>
      </div>`
    : '';

  return {
    isSpam,
    spamScore: isSpam ? 95 : heuristicSpamReasons.includes('too_many_links') ? 55 : 15,
    spamReasons: heuristicSpamReasons,
    category,
    companyFit,
    leadScore,
    confidence,
    shouldReply,
    matchedServices: [],
    extractedRequirements: [],
    leadSummary,
    suggestedReplySubject,
    suggestedReplyHtml,
    suggestedReplyText,
  };
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
        endpoint: RAW_LLM_ENDPOINT,
      },
    };
  }

  const safeTextBody = truncateText(message.textBody || '', 3000);
  const safeHtmlBodyText = truncateText(stripHtml(message.htmlBody || ''), 3000);
  const senderResearch = await researchSenderCompany(message);

  try {
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
                senderResearch,
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
        timeoutMs: 45000,
      }
    );

    const parsed = result.json || {};
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
      isSpam,
      spamScore: Number(parsed.spamScore || 0),
      spamReasons: Array.isArray(parsed.spamReasons) ? parsed.spamReasons : heuristicSpamReasons,
      category: parsed.category || 'other',
      companyFit,
      leadScore: Number(parsed.leadScore || 0),
      confidence,
      shouldReply,
      matchedServices: Array.isArray(parsed.matchedServices) ? parsed.matchedServices : [],
      extractedRequirements: Array.isArray(parsed.extractedRequirements)
        ? parsed.extractedRequirements
        : [],
      leadSummary: parsed.leadSummary || '',
      suggestedReplySubject: parsed.suggestedReplySubject || '',
      suggestedReplyHtml: parsed.suggestedReplyHtml || '',
      suggestedReplyText: parsed.suggestedReplyText || '',
      aiStatus: 'completed',
      classification: {
        ...parsed,
        source: 'local_ai',
        model: MODEL,
        endpoint: RAW_LLM_ENDPOINT,
        threshold: getReplyThreshold(),
        heuristicSpamReasons,
        senderResearch,
      },
    };
  } catch (error) {
    console.error('[MAIL-AI][CLASSIFICATION][FAILED]', {
      messageId: message.id,
      fromEmail: message.fromEmail,
      subject: message.subject,
      error: error.message,
    });

    const fallback = buildFallbackClassification(message, heuristicSpamReasons, senderResearch);

    return {
      ...fallback,
      aiStatus: 'completed',
      classification: {
        ...fallback,
        source: 'fallback',
        model: MODEL,
        endpoint: RAW_LLM_ENDPOINT,
        threshold: getReplyThreshold(),
        heuristicSpamReasons,
        senderResearch,
        fallbackReason: error.message,
      },
    };
  }
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

  const updated = await updateMailClassification(messageId, {
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
    classification: classification.classification,
  });

  return updated;
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
          endpoint: RAW_LLM_ENDPOINT,
        },
      });

      results.push({ id: mail.id, ok: false, error: error.message });
    }
  }

  return results;
}

async function sendReply(messageId, overrides = {}) {
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

  console.log('[MAIL-AUTO-REPLY][TRY]', {
  messageId,
  shouldReply: message.shouldReply,
  fromEmail: message.fromEmail,
  subject: message.subject,
  replyStatus: message.replyStatus,
});

  const transporter = getTransporter();
  const mailbox = getMailboxConfig();

  const fromName = process.env.MAIL_FROM_NAME || COMPANY_PROFILE.name;
  const fromAddress = process.env.MAIL_FROM || mailbox.mailboxEmail;

  await transporter.sendMail({
    from: `"${fromName}" <${fromAddress}>`,
    to: message.fromEmail,
    subject:
      overrides.subject ||
      message.suggestedReplySubject ||
      `Re: ${message.subject || 'Your inquiry'}`,
    text: overrides.text || message.suggestedReplyText || '',
    html: overrides.html || message.suggestedReplyHtml || '',
    replyTo: fromAddress,
    inReplyTo: message.messageId || undefined,
    references: message.messageId || undefined,
  });

  await markReplySent(messageId);

  return { sent: true };
}

async function autoReplyEligibleMails(limit = 10) {
  const mails = await listMailMessages({
    limit,
    shouldReply: true,
    replyStatus: 'not_sent',
  });

  console.log('[MAIL-AUTO-REPLY][SCAN]', {
  limit,
  count: mails.length,
  ids: mails.map((mail) => mail.id),
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

async function processMailById(messageId) {
  return processMailMessage(messageId);
}

async function sendReplyForMail(messageId, overrides = {}) {
  return sendReply(messageId, overrides);
}

module.exports = {
  COMPANY_PROFILE,
  syncInbox,
  processMailMessage,
  processMailById,
  processRecentPendingMails,
  autoReplyEligibleMails,
  sendReply,
  sendReplyForMail,
};