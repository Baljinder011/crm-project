const { getOpenAIClient } = require('../config/openai');
const {
  getRawContactById,
  upsertLeadAiData,
  createLeadAiEvent,
} = require('../models/leadModel');
const { createFollowUpTask } = require('./leadTaskService');
const { sendLeadAcknowledgementEmail } = require('./emailService');
const { MODEL, buildModelOptions } = require('../ai/modelConfig');

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

function getResponseText(response) {
  if (response.output_text) return response.output_text;

  const messageItem = response.output?.find((item) => item.type === 'message');
  const textItem = messageItem?.content?.find((item) => item.type === 'output_text');
  return textItem?.text || '';
}

function normalizeError(error, fallback = 'Unknown error') {
  return error?.message || fallback;
}

async function sendAcknowledgementSafely(contactId, contact) {
  try {
    if (!contact?.email) {
      await createLeadAiEvent(
        contactId,
        'acknowledgement_email_skipped',
        'failed',
        { message: 'Contact has no email address.' },
        MODEL
      );
      return;
    }

    await sendLeadAcknowledgementEmail({
      to: contact.email,
      name: contact.full_name,
      company: contact.company,
    });

    await createLeadAiEvent(contactId, 'acknowledgement_email_sent', 'success', {}, MODEL);
  } catch (error) {
    await createLeadAiEvent(
      contactId,
      'acknowledgement_email_failed',
      'failed',
      { message: normalizeError(error) },
      MODEL
    );
  }
}

async function classifyLead(contact) {
  const client = getOpenAIClient();

  const response = await client.responses.create({
    ...buildModelOptions(),
    input: [
      {
        role: 'developer',
        content:
          'You are an internal CRM lead-classification assistant. Use only the provided lead details. Do not invent business facts. Return strict JSON only.',
      },
      {
        role: 'user',
        content: `Analyze this lead:\n${JSON.stringify(contact, null, 2)}`,
      },
    ],
    text: {
      format: {
        type: 'json_schema',
        name: 'lead_classification',
        strict: true,
        schema: CLASSIFICATION_SCHEMA,
      },
    },
  });

  const raw = getResponseText(response);

  if (!raw) {
    throw new Error('Empty classification response from OpenAI.');
  }

  return JSON.parse(raw);
}

async function enrichLead(contact, classification) {
  const client = getOpenAIClient();

  const response = await client.responses.create({
    ...buildModelOptions(),
    tools: [{ type: 'web_search' }],
    input: [
      {
        role: 'developer',
        content:
          'You are an internal CRM lead-enrichment assistant. Research only what is necessary to help a sales team. Be careful, conservative, and do not invent facts. Use web search when needed and return strict JSON only.',
      },
      {
        role: 'user',
        content: `Lead details:\n${JSON.stringify(
          contact,
          null,
          2
        )}\n\nClassification:\n${JSON.stringify(
          classification,
          null,
          2
        )}\n\nResearch the company or business context using targeted web search. Focus on what the company likely does, the likely business need, and the best next action for a sales rep.`,
      },
    ],
    text: {
      format: {
        type: 'json_schema',
        name: 'lead_enrichment',
        strict: true,
        schema: ENRICHMENT_SCHEMA,
      },
    },
  });

  const raw = getResponseText(response);

  if (!raw) {
    throw new Error('Empty enrichment response from OpenAI.');
  }

  const enrichment = JSON.parse(raw);

  const toolSources =
    response.output
      ?.filter((item) => item.type === 'web_search_call')
      .flatMap((item) => item?.action?.sources || [])
      .map((source) => ({
        title: source.title || source.url || 'Source',
        url: source.url || '',
      })) || [];

  if (!Array.isArray(enrichment.researchSources) || !enrichment.researchSources.length) {
    enrichment.researchSources = toolSources;
  }

  enrichment.searchMetadata = { toolSources };

  return enrichment;
}

async function runLeadEnrichment(contactId) {
  const contact = await getRawContactById(contactId);

  if (!contact) {
    throw new Error(`Contact ${contactId} not found.`);
  }

  await createLeadAiEvent(contactId, 'enrichment_started', 'success', { contactId }, MODEL);
  await upsertLeadAiData(contactId, {
    status: 'processing',
    errorMessage: null,
  });

  let classification;
  let enrichment = {
    companySummary: 'No public research was needed for this lead.',
    aiSummary: 'Lead was analyzed from the submitted form details only.',
    recommendedAction: 'Review the submitted request and follow up directly.',
    researchSources: [],
    searchMetadata: {},
  };

  try {
    await createLeadAiEvent(contactId, 'classification_started', 'success', {}, MODEL);
    classification = await classifyLead(contact);
    await createLeadAiEvent(contactId, 'classification_completed', 'success', classification, MODEL);

    if (classification.researchNeeded) {
      await createLeadAiEvent(contactId, 'web_research_started', 'success', {}, MODEL);
      enrichment = await enrichLead(contact, classification);
      await createLeadAiEvent(
        contactId,
        'web_research_completed',
        'success',
        enrichment.searchMetadata || {},
        MODEL
      );
    }

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

    await upsertLeadAiData(contactId, finalPayload);
    await createLeadAiEvent(contactId, 'enrichment_completed', 'success', finalPayload, MODEL);

    await createFollowUpTask(contactId, {
      score: classification.score,
      urgency: classification.urgency,
      leadTemperature: classification.leadTemperature,
      recommendedAction: enrichment.recommendedAction,
    });

    return finalPayload;
  } catch (error) {
    const message = normalizeError(error);

    await upsertLeadAiData(contactId, {
      status: 'failed',
      score: classification?.score || 0,
      confidence: classification?.confidence || 0,
      intent: classification?.intent || 'unknown',
      industry: classification?.industry || 'unknown',
      urgency: classification?.urgency || 'medium',
      painPoints: classification?.painPoints || [],
      researchSources: [],
      rawResearch: {
        classification: classification || null,
      },
      errorMessage: message,
      lastEnrichedAt: null,
    });

    await createLeadAiEvent(contactId, 'enrichment_failed', 'failed', { message }, MODEL);

    throw error;
  } finally {
    await sendAcknowledgementSafely(contactId, contact);
  }
}

module.exports = {
  runLeadEnrichment,
};