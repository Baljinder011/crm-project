function getWebSearchTools() {
  return [{ type: 'web_search' }];
}

function getWebSearchInclude() {
  return ['web_search_call.action.sources'];
}

function extractResponseText(response) {
  if (response.output_text) return response.output_text;

  const messageItem = response.output?.find((item) => item.type === 'message');
  const textItem = messageItem?.content?.find((item) => item.type === 'output_text');

  return textItem?.text || '';
}

function extractWebSources(response) {
  return (
    response.output
      ?.filter((item) => item.type === 'web_search_call')
      .flatMap((item) => item.action?.sources || [])
      .map((source) => ({
        title: source.title || source.url || 'Source',
        url: source.url || '',
      })) || []
  );
}

module.exports = {
  getWebSearchTools,
  getWebSearchInclude,
  extractResponseText,
  extractWebSources,
};