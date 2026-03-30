function buildClassificationMessages(contact) {
  return [
    {
      role: 'developer',
      content:
        'You are an internal CRM lead-classification assistant. Use only the provided lead details. Do not invent business facts. Return strict JSON only.',
    },
    {
      role: 'user',
      content: `Analyze this lead:\n${JSON.stringify(contact, null, 2)}`,
    },
  ];
}

function buildEnrichmentMessages(contact, classification) {
  return [
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
  ];
}

module.exports = {
  buildClassificationMessages,
  buildEnrichmentMessages,
};