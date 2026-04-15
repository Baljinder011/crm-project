const DEFAULT_RAW_MODEL = process.env.AI_RAW_MODEL || process.env.AI_MODEL || 'phi4-mini';
const AI_TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS || 30000);

function stripTrailingSlashes(value = '') {
  return String(value || '').trim().replace(/\/+$/, '');
}

function sanitizeBaseUrl(value = '', fallbackPort = '') {
  let raw = String(value || '').trim();
  if (!raw) return '';

  if (!/^https?:\/\//i.test(raw)) {
    raw = `http://${raw}`;
  }

  raw = raw.replace(/^(https?:\/\/)(https?:\/\/)+/i, '$1');

  let url;
  try {
    url = new URL(raw);
  } catch (_error) {
    throw new Error(`Invalid AI endpoint base URL: ${value}`);
  }

  url.pathname = '/';
  url.search = '';
  url.hash = '';

  const duplicatePortPattern = new RegExp(`:(\\d{2,5})$`);
  const hostnameMatch = String(url.hostname || '').match(duplicatePortPattern);
  if (hostnameMatch && !url.port) {
    url.hostname = String(url.hostname).replace(duplicatePortPattern, '');
    url.port = hostnameMatch[1];
  }

  if (!url.port && fallbackPort) {
    url.port = String(fallbackPort);
  }

  return stripTrailingSlashes(url.toString());
}

function buildEndpoint(rawValue, fallbackPort, path) {
  const base = sanitizeBaseUrl(rawValue, fallbackPort);
  const url = new URL(base || `http://127.0.0.1:${fallbackPort}`);
  url.pathname = path;
  url.search = '';
  url.hash = '';
  return url.toString();
}

const RAW_LLM_ENDPOINT = buildEndpoint(
  process.env.AI_BASE_URL || process.env.AI_RAW_LLM_URL,
  11434,
  '/api/chat'
);

const FIRECRAWL_BASE_URL = sanitizeBaseUrl(
  process.env.AI_SCRAPER_URL || process.env.FIRECRAWL_URL,
  3002
);

const FIRECRAWL_SCRAPE_ENDPOINT = buildEndpoint(
  process.env.AI_SCRAPER_URL || process.env.FIRECRAWL_URL,
  3002,
  '/v1/scrape'
);

const FIRECRAWL_CRAWL_ENDPOINT = buildEndpoint(
  process.env.AI_SCRAPER_URL || process.env.FIRECRAWL_URL,
  3002,
  '/v1/crawl'
);

const AI_AGENT_ENDPOINT = buildEndpoint(
  process.env.AI_AGENT_URL,
  8000,
  '/ask'
);

function createTimeoutController(timeoutMs = AI_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return { controller, timer };
}

async function readJsonSafely(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch (_error) {
    return { rawText: text };
  }
}

function normalizeRawLlmText(payload) {
  if (!payload) return '';

  if (typeof payload.message?.content === 'string') return payload.message.content;
  if (typeof payload.response === 'string') return payload.response;
  if (typeof payload.content === 'string') return payload.content;
  if (typeof payload.output === 'string') return payload.output;
  if (typeof payload.answer === 'string') return payload.answer;

  if (Array.isArray(payload.message?.content)) {
    return payload.message.content
      .map((item) => {
        if (typeof item === 'string') return item;
        if (typeof item?.text === 'string') return item.text;
        return '';
      })
      .join('\n')
      .trim();
  }

  return '';
}

function extractJsonFromText(text) {
  const raw = String(text || '').trim();

  if (!raw) {
    throw new Error('AI returned empty text.');
  }

  try {
    return JSON.parse(raw);
  } catch (_error) {}

  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    try {
      return JSON.parse(fenced[1].trim());
    } catch (_error) {}
  }

  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    return JSON.parse(raw.slice(start, end + 1));
  }

  throw new Error(`Could not parse JSON from AI output: ${raw.slice(0, 500)}`);
}

async function callRawLlm(messages, options = {}) {
  const {
    model = DEFAULT_RAW_MODEL,
    timeoutMs = AI_TIMEOUT_MS,
    temperature = 0.2,
  } = options;

  const { controller, timer } = createTimeoutController(timeoutMs);
  const startedAt = Date.now();

  console.log('[AI][RAW][START]', {
    endpoint: RAW_LLM_ENDPOINT,
    model,
    timeoutMs,
    messageCount: Array.isArray(messages) ? messages.length : 0,
  });

  try {
    const res = await fetch(RAW_LLM_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        messages,
        stream: false,
        options: {
          temperature,
        },
      }),
    });

    const payload = await readJsonSafely(res);

    if (!res.ok) {
      throw new Error(
        `Raw LLM request failed (${res.status}): ${
          payload?.error || payload?.message || payload?.rawText || 'Unknown error'
        }`
      );
    }

    const text = normalizeRawLlmText(payload);

    if (!text) {
      throw new Error('Raw LLM returned no message content.');
    }

    console.log('[AI][RAW][SUCCESS]', {
      endpoint: RAW_LLM_ENDPOINT,
      model,
      durationMs: Date.now() - startedAt,
      textPreview: text.slice(0, 300),
    });

    return {
      text,
      payload,
      model,
    };
  } catch (error) {
    const message =
      error?.name === 'AbortError'
        ? `Raw LLM request timed out after ${timeoutMs}ms.`
        : error.message;

    console.error('[AI][RAW][FAILED]', {
      endpoint: RAW_LLM_ENDPOINT,
      model,
      durationMs: Date.now() - startedAt,
      error: message,
    });

    if (error?.name === 'AbortError') {
      throw new Error(`Raw LLM request timed out after ${timeoutMs}ms.`);
    }

    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function callRawLlmForJson(messages, options = {}) {
  const result = await callRawLlm(messages, options);
  return {
    ...result,
    json: extractJsonFromText(result.text),
  };
}

async function askWebsite(url, question, options = {}) {
  const { timeoutMs = 30000 } = options;
  const { controller, timer } = createTimeoutController(timeoutMs);
  const startedAt = Date.now();

  console.log('[AI][AGENT][START]', {
    endpoint: AI_AGENT_ENDPOINT,
    timeoutMs,
    url,
    questionPreview: String(question || '').slice(0, 200),
  });

  try {
    const res = await fetch(AI_AGENT_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({
        url,
        question,
      }),
    });

    const payload = await readJsonSafely(res);

    if (!res.ok) {
      throw new Error(
        `AI Agent request failed (${res.status}): ${
          payload?.detail || payload?.error || payload?.message || payload?.rawText || 'Unknown error'
        }`
      );
    }

    const answer =
      payload?.answer ||
      payload?.data?.answer ||
      payload?.result?.answer ||
      payload?.response ||
      payload?.content ||
      '';

    console.log('[AI][AGENT][SUCCESS]', {
      endpoint: AI_AGENT_ENDPOINT,
      durationMs: Date.now() - startedAt,
      url,
      answerPreview: String(answer || '').slice(0, 300),
    });

    return {
      answer: String(answer || '').trim(),
      payload,
      url,
    };
  } catch (error) {
    const message =
      error?.name === 'AbortError'
        ? `AI Agent request timed out after ${timeoutMs}ms.`
        : error.message;

    console.error('[AI][AGENT][FAILED]', {
      endpoint: AI_AGENT_ENDPOINT,
      durationMs: Date.now() - startedAt,
      url,
      error: message,
    });

    if (error?.name === 'AbortError') {
      throw new Error(`AI Agent request timed out after ${timeoutMs}ms.`);
    }

    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function normalizeScrapePayload(payload, fallbackUrl) {
  const data = payload?.data || payload || {};
  const markdown =
    data?.markdown ||
    data?.text ||
    data?.content ||
    data?.data?.markdown ||
    '';
  const metadata = data?.metadata || {};
  const title =
    metadata?.title ||
    data?.title ||
    fallbackUrl ||
    'Homepage';

  return {
    url: metadata?.sourceURL || data?.url || fallbackUrl || '',
    title: String(title || 'Homepage').trim(),
    markdown: String(markdown || '').trim(),
  };
}

async function scrapeWebsite(url, options = {}) {
  const { timeoutMs = 20000 } = options;
  const { controller, timer } = createTimeoutController(timeoutMs);
  const startedAt = Date.now();

  console.log('[AI][SCRAPE][START]', {
    endpoint: FIRECRAWL_SCRAPE_ENDPOINT,
    url,
    timeoutMs,
  });

  try {
    const res = await fetch(FIRECRAWL_SCRAPE_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({ url }),
    });

    const payload = await readJsonSafely(res);

    if (!res.ok) {
      throw new Error(
        `Scrape request failed (${res.status}): ${
          payload?.error || payload?.message || payload?.detail || payload?.rawText || 'Unknown error'
        }`
      );
    }

    const normalized = normalizeScrapePayload(payload, url);

    console.log('[AI][SCRAPE][SUCCESS]', {
      endpoint: FIRECRAWL_SCRAPE_ENDPOINT,
      url,
      durationMs: Date.now() - startedAt,
      markdownPreview: normalized.markdown.slice(0, 200),
    });

    return normalized;
  } catch (error) {
    const message =
      error?.name === 'AbortError'
        ? `Scrape request timed out after ${timeoutMs}ms.`
        : error.message;

    console.error('[AI][SCRAPE][FAILED]', {
      endpoint: FIRECRAWL_SCRAPE_ENDPOINT,
      url,
      durationMs: Date.now() - startedAt,
      error: message,
    });

    throw new Error(message);
  } finally {
    clearTimeout(timer);
  }
}

function flattenCrawlPages(payload) {
  const raw =
    payload?.data?.data ||
    payload?.data?.pages ||
    payload?.data ||
    payload?.pages ||
    payload?.result?.data ||
    [];

  const pages = Array.isArray(raw) ? raw : [];

  return pages
    .map((page) => {
      const metadata = page?.metadata || {};
      const url = page?.url || metadata?.sourceURL || '';
      const title = metadata?.title || page?.title || url || 'Page';
      const markdown = page?.markdown || page?.text || page?.content || '';

      return {
        title: String(title || 'Page').trim(),
        url: String(url || '').trim(),
        markdown: String(markdown || '').trim(),
      };
    })
    .filter((page) => page.url || page.markdown);
}

async function startWebsiteCrawl(url, options = {}) {
  const { timeoutMs = 15000 } = options;
  const { controller, timer } = createTimeoutController(timeoutMs);

  try {
    const res = await fetch(FIRECRAWL_CRAWL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({ url }),
    });

    const payload = await readJsonSafely(res);

    if (!res.ok) {
      throw new Error(
        `Crawl start failed (${res.status}): ${
          payload?.error || payload?.message || payload?.detail || payload?.rawText || 'Unknown error'
        }`
      );
    }

    return payload;
  } finally {
    clearTimeout(timer);
  }
}

async function getWebsiteCrawlStatus(jobId, options = {}) {
  const { timeoutMs = 10000 } = options;
  const { controller, timer } = createTimeoutController(timeoutMs);

  try {
    const statusUrl = `${FIRECRAWL_CRAWL_ENDPOINT}/${encodeURIComponent(jobId)}`;
    const res = await fetch(statusUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });

    const payload = await readJsonSafely(res);

    if (!res.ok) {
      throw new Error(
        `Crawl status failed (${res.status}): ${
          payload?.error || payload?.message || payload?.detail || payload?.rawText || 'Unknown error'
        }`
      );
    }

    return payload;
  } finally {
    clearTimeout(timer);
  }
}

async function crawlWebsite(url, options = {}) {
  const {
    timeoutMs = 30000,
    pollIntervalMs = 2000,
    maxPolls = 8,
  } = options;

  const startedAt = Date.now();

  console.log('[AI][CRAWL][START]', {
    endpoint: FIRECRAWL_CRAWL_ENDPOINT,
    url,
    timeoutMs,
    maxPolls,
  });

  try {
    const startPayload = await startWebsiteCrawl(url, {
      timeoutMs: Math.min(timeoutMs, 15000),
    });

    const jobId =
      startPayload?.id ||
      startPayload?.jobId ||
      startPayload?.data?.id ||
      startPayload?.data?.jobId;

    if (!jobId) {
      const pages = flattenCrawlPages(startPayload);
      return {
        pages,
        jobId: null,
        payload: startPayload,
      };
    }

    for (let attempt = 0; attempt < maxPolls; attempt += 1) {
      const statusPayload = await getWebsiteCrawlStatus(jobId, {
        timeoutMs: Math.min(timeoutMs, 10000),
      });

      const status = String(
        statusPayload?.status ||
          statusPayload?.data?.status ||
          statusPayload?.state ||
          ''
      ).toLowerCase();

      const pages = flattenCrawlPages(statusPayload);

      if (pages.length && ['completed', 'complete', 'success', 'done'].includes(status)) {
        console.log('[AI][CRAWL][SUCCESS]', {
          endpoint: FIRECRAWL_CRAWL_ENDPOINT,
          url,
          jobId,
          pageCount: pages.length,
          durationMs: Date.now() - startedAt,
        });

        return {
          pages,
          jobId,
          payload: statusPayload,
        };
      }

      if (pages.length && !status) {
        console.log('[AI][CRAWL][SUCCESS_NO_STATUS]', {
          endpoint: FIRECRAWL_CRAWL_ENDPOINT,
          url,
          jobId,
          pageCount: pages.length,
          durationMs: Date.now() - startedAt,
        });

        return {
          pages,
          jobId,
          payload: statusPayload,
        };
      }

      if (['failed', 'error'].includes(status)) {
        throw new Error(`Crawl job failed for ${url}`);
      }

      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }

    console.warn('[AI][CRAWL][TIMEOUT_SOFT]', {
      endpoint: FIRECRAWL_CRAWL_ENDPOINT,
      url,
      durationMs: Date.now() - startedAt,
    });

    return {
      pages: [],
      jobId: null,
      payload: null,
    };
  } catch (error) {
    console.error('[AI][CRAWL][FAILED]', {
      endpoint: FIRECRAWL_CRAWL_ENDPOINT,
      url,
      durationMs: Date.now() - startedAt,
      error: error.message,
    });

    return {
      pages: [],
      jobId: null,
      payload: null,
      error: error.message,
    };
  }
}

module.exports = {
  AI_MODEL: DEFAULT_RAW_MODEL,
  AI_TIMEOUT_MS,
  RAW_LLM_ENDPOINT,
  FIRECRAWL_BASE_URL,
  FIRECRAWL_SCRAPE_ENDPOINT,
  FIRECRAWL_CRAWL_ENDPOINT,
  AI_AGENT_ENDPOINT,
  callRawLlm,
  callRawLlmForJson,
  askWebsite,
  scrapeWebsite,
  crawlWebsite,
  extractJsonFromText,
};