const MODEL = process.env.OPENAI_MODEL || 'gpt-4o';
const OPENAI_USE_REASONING =
  String(process.env.OPENAI_USE_REASONING || 'false').toLowerCase() === 'true';

const ALLOWED_REASONING_EFFORTS = new Set(['low', 'medium', 'high']);

function normalizeReasoningEffort(value) {
  const effort = String(value || 'medium').toLowerCase();
  return ALLOWED_REASONING_EFFORTS.has(effort) ? effort : 'medium';
}

function supportsReasoning(model) {
  const normalized = String(model || '').toLowerCase();

  return (
    normalized.startsWith('gpt-5') ||
    normalized.startsWith('o1') ||
    normalized.startsWith('o3') ||
    normalized.startsWith('o4')
  );
}

const OPENAI_REASONING_EFFORT = normalizeReasoningEffort(
  process.env.OPENAI_REASONING_EFFORT || 'medium'
);

function buildModelOptions() {
  const options = { model: MODEL };

  if (OPENAI_USE_REASONING && supportsReasoning(MODEL)) {
    options.reasoning = { effort: OPENAI_REASONING_EFFORT };
  }

  return options;
}

module.exports = {
  MODEL,
  OPENAI_USE_REASONING,
  OPENAI_REASONING_EFFORT,
  supportsReasoning,
  buildModelOptions,
};