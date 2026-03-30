const { getOpenAIClient } = require('../config/openai');
const { buildModelOptions } = require('./modelConfig');
const { CLASSIFICATION_SCHEMA, ENRICHMENT_SCHEMA } = require('./schemas');
const { buildClassificationMessages, buildEnrichmentMessages } = require('./prompts');
const {
  getWebSearchTools,
  getWebSearchInclude,
  extractResponseText,
  extractWebSources,
} = require('./tools');

async function classifyLead(contact) {
  const client = getOpenAIClient();

  const response = await client.responses.create({
    ...buildModelOptions(),
    input: buildClassificationMessages(contact),
    text: {
      format: {
        type: 'json_schema',
        name: 'lead_classification',
        strict: true,
        schema: CLASSIFICATION_SCHEMA,
      },
      verbosity: 'low',
    },
  });

  return JSON.parse(extractResponseText(response));
}

async function enrichLead(contact, classification) {
  const client = getOpenAIClient();

  const companyHint = [contact.company, contact.email?.split('@')?.[1], contact.address]
    .filter(Boolean)
    .join(' | ');

  const response = await client.responses.create({
    ...buildModelOptions(),
    tools: getWebSearchTools(),
    include: getWebSearchInclude(),
    input: buildEnrichmentMessages(contact, classification),
    text: {
      format: {
        type: 'json_schema',
        name: 'lead_enrichment',
        strict: true,
        schema: ENRICHMENT_SCHEMA,
      },
      verbosity: 'low',
    },
  });

  const enrichment = JSON.parse(extractResponseText(response));
  const toolSources = extractWebSources(response);

  if (!enrichment.researchSources?.length) {
    enrichment.researchSources = toolSources;
  }

  enrichment.searchMetadata = {
    companyHint,
    toolSources,
  };

  return enrichment;
}

module.exports = {
  classifyLead,
  enrichLead,
};