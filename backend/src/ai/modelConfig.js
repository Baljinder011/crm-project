const MODEL = process.env.AI_RAW_MODEL || process.env.AI_MODEL || 'phi4-mini';

function buildModelOptions(overrides = {}) {
  return {
    model: MODEL,
    ...overrides,
  };
}

module.exports = {
  MODEL,
  buildModelOptions,
};