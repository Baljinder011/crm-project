const { callRawLlmForJson, askWebsite } = require('../config/aiClient');
const { MODEL } = require('./modelConfig');
const { CLASSIFICATION_SCHEMA, ENRICHMENT_SCHEMA } = require('./schemas');
const { buildClassificationMessages, buildEnrichmentMessages } = require('./prompts');

function schemaToInstruction(name, schema) {
  return [
    `Return valid JSON only for schema: ${name}.`,
    'Do not include markdown, explanation, or code fences.',
    `Schema:\n${JSON.stringify(schema, null, 2)}`,
  ].join('\n\n');
}

async function classifyLead(contact) {
  const response = await callRawLlmForJson(
    [
      {
        role: 'system',
        content:
          'You are an internal CRM lead-classification assistant. Use only provided lead details. Do not invent business facts.',
      },
      {
        role: 'user',
        content: [
          schemaToInstruction('lead_classification', CLASSIFICATION_SCHEMA),
          JSON.stringify(buildClassificationMessages(contact), null, 2),
        ].join('\n\n'),
      },
    ],
    { model: MODEL, temperature: 0.1 }
  );

  return response.json;
}

async function enrichLead(contact, classification) {
  let websiteResearch = '';
  const researchSources = [];

  const candidateUrl =
    contact?.website ||
    contact?.companyWebsite ||
    contact?.company_website ||
    null;

  if (candidateUrl) {
    try {
      const question = `Research this company website and summarize: what the company does, likely business needs, likely buying signals, and the best next sales action for this lead. Lead details: ${JSON.stringify(
        { contact, classification },
        null,
        2
      )}`;

      const agentResult = await askWebsite(candidateUrl, question);
      websiteResearch = agentResult.answer || '';
      researchSources.push({
        title: candidateUrl,
        url: candidateUrl,
      });
    } catch (_) {
      // fail soft; enrichment can still continue without website research
    }
  }

  const response = await callRawLlmForJson(
    [
      {
        role: 'system',
        content:
          'You are an internal CRM lead-enrichment assistant. Be conservative. Never invent facts. If website research is missing or weak, clearly stay cautious.',
      },
      {
        role: 'user',
        content: [
          schemaToInstruction('lead_enrichment', ENRICHMENT_SCHEMA),
          JSON.stringify(buildEnrichmentMessages(contact, classification), null, 2),
          `Website research:\n${websiteResearch || 'No website research available.'}`,
          `Preferred research sources:\n${JSON.stringify(researchSources, null, 2)}`,
        ].join('\n\n'),
      },
    ],
    { model: MODEL, temperature: 0.2 }
  );

  const enrichment = response.json;

  if (!Array.isArray(enrichment.researchSources) || !enrichment.researchSources.length) {
    enrichment.researchSources = researchSources;
  }

  enrichment.searchMetadata = {
    candidateUrl,
    websiteResearch,
    researchSources: enrichment.researchSources,
  };

  return enrichment;
}

module.exports = {
  classifyLead,
  enrichLead,
};