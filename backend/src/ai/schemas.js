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

module.exports = {
  CLASSIFICATION_SCHEMA,
  ENRICHMENT_SCHEMA,
};