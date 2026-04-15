const {
  getRawContactById,
  upsertLeadAiData,
} = require('../models/leadModel');
const { createFollowUpTask } = require('./leadTaskService');
const { sendLeadAcknowledgementEmail } = require('./emailService');
const { MODEL } = require('../ai/modelConfig');
const {
  callRawLlm,
  callRawLlmForJson,
  askWebsite,
  scrapeWebsite,
  crawlWebsite,
  RAW_LLM_ENDPOINT,
  FIRECRAWL_SCRAPE_ENDPOINT,
  FIRECRAWL_CRAWL_ENDPOINT,
  AI_AGENT_ENDPOINT,
} = require('../config/aiClient');

const CLASSIFICATION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    intent: { type: 'string' },
    industry: { type: 'string' },
    urgency: { type: 'string', enum: ['low', 'medium', 'high'] },
    leadTemperature: { type: 'string', enum: ['cold', 'warm', 'hot'] },
    researchNeeded: { type: 'boolean' },
    score: { type: 'integer', minimum: 0, maximum: 100 },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    painPoints: {
      type: 'array',
      items: { type: 'string' },
      maxItems: 5,
    },
  },
  required: [
    'intent',
    'industry',
    'urgency',
    'leadTemperature',
    'researchNeeded',
    'score',
    'confidence',
    'painPoints',
  ],
};

const ENRICHMENT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    companySummary: { type: 'string' },
    aiSummary: { type: 'string' },
    recommendedAction: { type: 'string' },
    researchSources: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          title: { type: 'string' },
          url: { type: 'string' },
        },
        required: ['title', 'url'],
      },
      maxItems: 8,
    },
  },
  required: ['companySummary', 'aiSummary', 'recommendedAction', 'researchSources'],
};

function logStep(contactId, step, extra = {}) {
  console.log(`[LEAD-AI][${contactId}][${step}]`, extra);
}

function logError(contactId, step, error) {
  console.error(`[LEAD-AI][${contactId}][${step}][FAILED]`, {
    message: error?.message || 'Unknown error',
    stack: error?.stack || null,
  });
}

function schemaInstruction(name, schema) {
  return [
    `Return valid JSON only for schema: ${name}.`,
    'Do not return markdown.',
    'Do not return code fences.',
    'Do not add explanation text outside JSON.',
    `Schema:\n${JSON.stringify(schema, null, 2)}`,
  ].join('\n\n');
}

function clampNumber(value, min, max, fallback) {
  const n = Number(value);
  if (Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function toStringArray(value, max = 5) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .slice(0, max);
}

function cleanText(value = '') {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function trimToSentenceBoundary(text, maxLength = 500) {
  const safe = cleanText(text);
  if (!safe) return '';
  if (safe.length <= maxLength) return safe;

  const sliced = safe.slice(0, maxLength);
  const lastBoundary = Math.max(
    sliced.lastIndexOf('. '),
    sliced.lastIndexOf('! '),
    sliced.lastIndexOf('? ')
  );

  if (lastBoundary > 120) {
    return sliced.slice(0, lastBoundary + 1).trim();
  }

  return `${sliced.trim()}...`;
}

function dedupeSources(sources = [], limit = 8) {
  const seen = new Set();
  const output = [];

  for (const source of sources) {
    const title = cleanText(source?.title || '');
    const url = cleanText(source?.url || '');
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

function hasMeaningfulBusinessSignal(contact) {
  const text = cleanText(
    `${contact?.company || ''} ${contact?.message || ''} ${contact?.address || ''}`
  ).toLowerCase();

  if (!text) return false;

  return /crm|hubspot|zoho|salesforce|website|web site|webapp|web app|app|mobile app|software|erp|digital|marketing|automation|support|setup|integration|business|company|service|solution|development|custom/.test(
    text
  );
}

function defaultClassification(contact) {
  const text = cleanText(`${contact?.message || ''} ${contact?.company || ''}`).toLowerCase();

  let urgency = 'medium';
  if (/urgent|asap|immediately|quickly|today/.test(text)) urgency = 'high';
  if (/later|future|explore/.test(text)) urgency = 'low';

  const researchNeeded =
    hasMeaningfulBusinessSignal(contact) ||
    Boolean(contact?.company) ||
    Boolean(contact?.email);

  return {
    intent: 'general_inquiry',
    industry: contact?.company ? 'business' : 'unknown',
    urgency,
    leadTemperature: 'warm',
    researchNeeded,
    score: contact?.message || contact?.company ? 45 : 20,
    confidence: 0.35,
    painPoints: [],
  };
}

function normalizeClassification(data, contact) {
  const fallback = defaultClassification(contact);
  const safe = data && typeof data === 'object' ? data : {};

  return {
    intent: String(safe.intent || fallback.intent),
    industry: String(safe.industry || fallback.industry),
    urgency: ['low', 'medium', 'high'].includes(String(safe.urgency || '').toLowerCase())
      ? String(safe.urgency).toLowerCase()
      : fallback.urgency,
    leadTemperature: ['cold', 'warm', 'hot'].includes(String(safe.leadTemperature || '').toLowerCase())
      ? String(safe.leadTemperature).toLowerCase()
      : fallback.leadTemperature,
    researchNeeded:
      typeof safe.researchNeeded === 'boolean'
        ? safe.researchNeeded || fallback.researchNeeded
        : fallback.researchNeeded,
    score: Math.round(clampNumber(safe.score, 0, 100, fallback.score)),
    confidence: clampNumber(safe.confidence, 0, 1, fallback.confidence),
    painPoints: toStringArray(safe.painPoints, 5),
  };
}

function defaultEnrichment(classification, websiteContext = {}) {
  const websiteSummary = trimToSentenceBoundary(websiteContext.websiteResearch, 900);

  if (websiteSummary) {
    return {
      companySummary:
        trimToSentenceBoundary(
          websiteContext.homepageSummary ||
            websiteContext.agentSummary ||
            websiteSummary,
          550
        ) || 'Website research was captured successfully.',
      aiSummary:
        trimToSentenceBoundary(websiteSummary, 900) ||
        'Website research was available, but structured enrichment fell back to a safe summary.',
      recommendedAction:
        classification.urgency === 'high'
          ? 'Reach out quickly with a short discovery call and confirm requirements.'
          : 'Use the researched company context in a personalized follow-up email and qualify the lead before proposing a solution.',
      researchSources: websiteContext.toolSources || [],
    };
  }

  return {
    companySummary: 'Limited company information is available from the lead details provided.',
    aiSummary:
      'This lead was enriched using a fallback-safe path. Review the submitted details before outreach.',
    recommendedAction:
      classification.urgency === 'high'
        ? 'Reach out quickly with a short discovery call and confirm requirements.'
        : 'Send a short follow-up email and qualify the lead before proposing a solution.',
    researchSources: websiteContext.toolSources || [],
  };
}

function normalizeEnrichment(data, classification, websiteContext = {}) {
  const fallback = defaultEnrichment(classification, websiteContext);
  const safe = data && typeof data === 'object' ? data : {};

  return {
    companySummary: String(safe.companySummary || fallback.companySummary),
    aiSummary: String(safe.aiSummary || fallback.aiSummary),
    recommendedAction: String(safe.recommendedAction || fallback.recommendedAction),
    researchSources: Array.isArray(safe.researchSources) && safe.researchSources.length
      ? dedupeSources(
          safe.researchSources.map((item) => ({
            title: String(item?.title || '').trim(),
            url: String(item?.url || '').trim(),
          })),
          8
        )
      : fallback.researchSources,
  };
}

async function tryStructuredJson(messages, options, contactId, label) {
  try {
    const result = await callRawLlmForJson(messages, options);
    logStep(contactId, `${label}_json_ok`, {
      preview: String(result.text || '').slice(0, 300),
    });
    return {
      ok: true,
      json: result.json,
      text: result.text,
      error: null,
    };
  } catch (error) {
    logError(contactId, `${label}_json_failed`, error);

    try {
      const raw = await callRawLlm(messages, options);
      logStep(contactId, `${label}_raw_ok`, {
        preview: String(raw.text || '').slice(0, 300),
      });

      return {
        ok: false,
        json: null,
        text: raw.text,
        error,
      };
    } catch (rawError) {
      logError(contactId, `${label}_raw_failed`, rawError);

      return {
        ok: false,
        json: null,
        text: '',
        error: rawError,
      };
    }
  }
}

function deriveWebsiteCandidates(contact) {
  const candidates = new Set();

  const explicitValues = [
    contact?.website,
    contact?.companyWebsite,
    contact?.company_website,
  ].filter(Boolean);

  explicitValues.forEach((value) => {
    const trimmed = String(value).trim();
    if (!trimmed) return;

    if (/^https?:\/\//i.test(trimmed)) {
      candidates.add(trimmed);
    } else {
      candidates.add(`https://${trimmed}`);
    }
  });

  const email = String(contact?.email || '').toLowerCase().trim();
  const domain = email.includes('@') ? email.split('@')[1] : '';

  const blockedDomains = new Set([
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
  ]);

  if (domain && !blockedDomains.has(domain)) {
    candidates.add(`https://${domain}`);
    candidates.add(`https://www.${domain}`);
  }

  return [...candidates];
}

function shouldRunWebsiteResearch(contact, classification) {
  const candidates = deriveWebsiteCandidates(contact);
  if (candidates.length) return true;
  if (classification?.researchNeeded) return true;
  return hasMeaningfulBusinessSignal(contact);
}

function buildResearchQuestion(contact, classification) {
  return [
    'Research this company website for a CRM sales team.',
    'Return a practical business understanding, not fluff.',
    'Cover these points clearly:',
    '1. What the company does',
    '2. Main services or products',
    '3. Likely business size or market positioning if inferable from site content',
    '4. Likely digital, CRM, automation, website, ERP, or marketing needs',
    '5. Buying signals from the lead message',
    '6. Best next outreach action',
    '',
    'Stay conservative. Do not invent facts that are not supported by the website or lead details.',
    '',
    `Lead details:\n${JSON.stringify(contact, null, 2)}`,
    `Classification:\n${JSON.stringify(classification, null, 2)}`,
  ].join('\n');
}

function buildWebsiteResearchText({ homepage, crawlPages, agentAnswer }) {
  const sections = [];

  if (homepage?.markdown) {
    sections.push(
      `Homepage (${homepage.title || homepage.url}):\n${trimToSentenceBoundary(homepage.markdown, 2000)}`
    );
  }

  if (Array.isArray(crawlPages) && crawlPages.length) {
    const pageSummaries = crawlPages
      .slice(0, 5)
      .map(
        (page) =>
          `- ${page.title || page.url}: ${trimToSentenceBoundary(page.markdown, 500)}`
      )
      .join('\n');

    if (pageSummaries) {
      sections.push(`Internal pages:\n${pageSummaries}`);
    }
  }

  if (agentAnswer) {
    sections.push(`AI agent analysis:\n${trimToSentenceBoundary(agentAnswer, 2500)}`);
  }

  return sections.join('\n\n').trim();
}

async function runWebsiteResearch(contact, classification, contactId) {
  const candidates = deriveWebsiteCandidates(contact);

  logStep(contactId, 'web_research_candidates', {
    scraperEndpoint: FIRECRAWL_SCRAPE_ENDPOINT,
    crawlEndpoint: FIRECRAWL_CRAWL_ENDPOINT,
    agentEndpoint: AI_AGENT_ENDPOINT,
    candidates,
  });

  for (const url of candidates) {
    let homepage = null;
    let crawl = { pages: [] };
    let agentResult = null;

    try {
      logStep(contactId, 'web_research_attempt_started', { url });

      try {
        homepage = await scrapeWebsite(url, { timeoutMs: 18000 });
        logStep(contactId, 'web_scrape_success', {
          url,
          title: homepage.title,
          markdownPreview: String(homepage.markdown || '').slice(0, 200),
        });
      } catch (error) {
        logError(contactId, `web_scrape_failed:${url}`, error);
      }

      try {
        crawl = await crawlWebsite(url, {
          timeoutMs: 30000,
          pollIntervalMs: 2000,
          maxPolls: 6,
        });

        if (crawl?.pages?.length) {
          logStep(contactId, 'web_crawl_success', {
            url,
            pageCount: crawl.pages.length,
          });
        }
      } catch (error) {
        logError(contactId, `web_crawl_failed:${url}`, error);
      }

      try {
        agentResult = await askWebsite(url, buildResearchQuestion(contact, classification), {
          timeoutMs: 30000,
        });

        logStep(contactId, 'web_agent_success', {
          url,
          answerPreview: String(agentResult.answer || '').slice(0, 300),
        });
      } catch (error) {
        logError(contactId, `web_agent_failed:${url}`, error);
      }

      const sources = dedupeSources(
        [
          homepage
            ? {
                title: homepage.title || 'Homepage',
                url: homepage.url || url,
              }
            : null,
          ...(crawl?.pages || []).map((page) => ({
            title: page.title || page.url || 'Page',
            url: page.url || '',
          })),
          {
            title: 'AI Agent analysis',
            url,
          },
        ].filter(Boolean),
        8
      );

      const websiteResearch = buildWebsiteResearchText({
        homepage,
        crawlPages: crawl?.pages || [],
        agentAnswer: agentResult?.answer || '',
      });

      if (websiteResearch) {
        return {
          candidateUrl: url,
          homepageSummary: homepage?.markdown
            ? trimToSentenceBoundary(homepage.markdown, 700)
            : '',
          agentSummary: trimToSentenceBoundary(agentResult?.answer || '', 900),
          websiteResearch,
          toolSources: sources,
        };
      }
    } catch (error) {
      logError(contactId, `web_research_attempt_failed:${url}`, error);
    }
  }

  logStep(contactId, 'web_research_skipped_after_failures');

  return {
    candidateUrl: null,
    homepageSummary: '',
    agentSummary: '',
    websiteResearch: '',
    toolSources: [],
  };
}

async function sendAcknowledgementSafely(contactId, contact) {
  try {
    if (!contact?.email) {
      logStep(contactId, 'ack_mail_skipped', { reason: 'no_email' });
      return;
    }

    logStep(contactId, 'ack_mail_started');
    await sendLeadAcknowledgementEmail({
      to: contact.email,
      name: contact.full_name,
      company: contact.company,
    });
    logStep(contactId, 'ack_mail_sent');
  } catch (error) {
    logError(contactId, 'ack_mail_failed', error);
  }
}

async function classifyLead(contact, contactId) {
  logStep(contactId, 'classification_request_prepared', {
    endpoint: RAW_LLM_ENDPOINT,
    model: MODEL,
  });

  const messages = [
    {
      role: 'system',
      content:
        'You are an internal CRM lead-classification assistant. Use only the submitted lead details. Be conservative. Never invent facts.',
    },
    {
      role: 'user',
      content: [
        schemaInstruction('lead_classification', CLASSIFICATION_SCHEMA),
        `Analyze this lead:\n${JSON.stringify(contact, null, 2)}`,
      ].join('\n\n'),
    },
  ];

  const result = await tryStructuredJson(
    messages,
    { model: MODEL, temperature: 0.1, timeoutMs: 45000 },
    contactId,
    'classification'
  );

  if (result.json) {
    return normalizeClassification(result.json, contact);
  }

  const fallback = defaultClassification(contact);

  logStep(contactId, 'classification_hard_fallback_used', {
    fallback,
    reason: result.error?.message || 'raw/model failure',
  });

  return fallback;
}

async function enrichLead(contact, classification, contactId) {
  const websiteContext = shouldRunWebsiteResearch(contact, classification)
    ? await runWebsiteResearch(contact, classification, contactId)
    : {
        candidateUrl: null,
        homepageSummary: '',
        agentSummary: '',
        websiteResearch: '',
        toolSources: [],
      };

  logStep(contactId, 'enrichment_request_prepared', {
    endpoint: RAW_LLM_ENDPOINT,
    model: MODEL,
    researchUsed: Boolean(websiteContext.websiteResearch),
    candidateUrl: websiteContext.candidateUrl,
  });

  const messages = [
    {
      role: 'system',
      content:
        'You are an internal CRM lead-enrichment assistant. Be careful, useful, and conservative. Never invent facts. Use the provided website research as evidence and write practical sales guidance.',
    },
    {
      role: 'user',
      content: [
        schemaInstruction('lead_enrichment', ENRICHMENT_SCHEMA),
        `Lead details:\n${JSON.stringify(contact, null, 2)}`,
        `Classification:\n${JSON.stringify(classification, null, 2)}`,
        `Website research:\n${websiteContext.websiteResearch || 'No website research available.'}`,
        `Research sources:\n${JSON.stringify(websiteContext.toolSources, null, 2)}`,
      ].join('\n\n'),
    },
  ];

  const result = await tryStructuredJson(
    messages,
    { model: MODEL, temperature: 0.2, timeoutMs: 60000 },
    contactId,
    'enrichment'
  );

  const enrichment = result.json
    ? normalizeEnrichment(result.json, classification, websiteContext)
    : defaultEnrichment(classification, websiteContext);

  if (!result.json) {
    logStep(contactId, 'enrichment_hard_fallback_used', {
      reason: result.error?.message || 'raw/model failure',
      enrichment,
    });
  }

  enrichment.searchMetadata = {
    candidateUrl: websiteContext.candidateUrl,
    toolSources: enrichment.researchSources,
    websiteResearch: websiteContext.websiteResearch,
    homepageSummary: websiteContext.homepageSummary,
    agentSummary: websiteContext.agentSummary,
  };

  return enrichment;
}

async function runLeadEnrichment(contactId) {
  const numericContactId = Number(contactId);
  const contact = await getRawContactById(numericContactId);

  if (!contact) {
    throw new Error(`Contact ${numericContactId} not found.`);
  }

  logStep(numericContactId, 'enrichment_started');

  await upsertLeadAiData(numericContactId, {
    status: 'processing',
    errorMessage: null,
  });

  let classification = defaultClassification(contact);
  let enrichment = defaultEnrichment(classification);

  try {
    classification = await classifyLead(contact, numericContactId);
    logStep(numericContactId, 'classification_completed', classification);

    enrichment = await enrichLead(contact, classification, numericContactId);
    logStep(numericContactId, 'enrichment_completed_raw', enrichment.searchMetadata || {});

    const finalPayload = {
      status: 'completed',
      intent: classification.intent,
      industry: classification.industry,
      urgency: classification.urgency,
      score: classification.score,
      confidence: classification.confidence,
      companySummary: enrichment.companySummary,
      aiSummary: enrichment.aiSummary,
      painPoints: classification.painPoints,
      recommendedAction: enrichment.recommendedAction,
      researchSources: enrichment.researchSources,
      rawResearch: {
        classification,
        enrichment: enrichment.searchMetadata || {},
      },
      errorMessage: null,
      lastEnrichedAt: new Date(),
    };

    await upsertLeadAiData(numericContactId, finalPayload);
    logStep(numericContactId, 'db_update_completed');

    try {
      await createFollowUpTask(numericContactId, {
        score: classification.score,
        urgency: classification.urgency,
        leadTemperature: classification.leadTemperature,
        recommendedAction: enrichment.recommendedAction,
      });
      logStep(numericContactId, 'follow_up_task_completed');
    } catch (taskError) {
      logError(numericContactId, 'follow_up_task_failed_non_critical', taskError);
    }

    return finalPayload;
  } catch (error) {
    logError(numericContactId, 'runLeadEnrichment', error);

    try {
      await upsertLeadAiData(numericContactId, {
        status: 'completed',
        score: classification?.score || 20,
        confidence: classification?.confidence || 0.2,
        intent: classification?.intent || 'general_inquiry',
        industry: classification?.industry || 'unknown',
        urgency: classification?.urgency || 'medium',
        companySummary:
          enrichment?.companySummary ||
          'Lead enrichment fell back to a conservative summary.',
        aiSummary:
          enrichment?.aiSummary ||
          'AI endpoint failed, so fallback enrichment was saved instead of marking the lead unusable.',
        painPoints: classification?.painPoints || [],
        recommendedAction:
          enrichment?.recommendedAction ||
          'Review this lead manually and contact them with a short qualification email.',
        researchSources: enrichment?.researchSources || [],
        rawResearch: {
          classification: classification || null,
          enrichment: enrichment?.searchMetadata || null,
          fallbackFailure: {
            message: error?.message || 'Unknown error',
            stack: error?.stack || null,
          },
        },
        errorMessage: null,
        lastEnrichedAt: new Date(),
      });
    } catch (writeError) {
      logError(numericContactId, 'fallback_db_write_failed', writeError);
      throw writeError;
    }

    return {
      status: 'completed',
      intent: classification?.intent || 'general_inquiry',
      industry: classification?.industry || 'unknown',
      urgency: classification?.urgency || 'medium',
      score: classification?.score || 20,
      confidence: classification?.confidence || 0.2,
    };
  } finally {
    await sendAcknowledgementSafely(numericContactId, contact);
  }
}

module.exports = {
  runLeadEnrichment,
};