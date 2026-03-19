const { createContext } = require('./browser');
const { processPage } = require('./pageProcessor');
const { normalizeUrl, isSameDomain, isValidPageUrl, shouldSkipUrl, sortByPriority, extractLinks } = require('./urlUtils');
const config = require('../config');
const logger = require('../logger');

async function crawlSite(options, onProgress) {
  const {
    url,
    maxDepth = config.scraper.defaultMaxDepth,
    maxPages = config.scraper.defaultMaxPages,
    includeSubdomains = false,
    proxyUrl = null,
  } = options;

  // Hard cap
  const effectiveMaxPages = Math.min(maxPages, 100);
  const requestDelay = config.scraper.requestDelayMs;
  const pageConcurrency = config.scraper.browserConcurrency;

  const visited = new Set();
  const results = [];
  const blocked = [];
  let consecutiveFailures = 0;
  const maxConsecutiveFailures = 3;

  // Queue: [{ url, depth }]
  const rootUrl = normalizeUrl(url);
  if (!rootUrl) throw new Error(`Invalid URL: ${url}`);

  const queue = [{ url: rootUrl, depth: 0 }];
  visited.add(rootUrl);

  const context = await createContext(proxyUrl);
  const startTime = Date.now();

  try {
    while (queue.length > 0 && results.length < effectiveMaxPages) {
      // Check job timeout
      if (Date.now() - startTime > config.scraper.jobTimeoutMs) {
        logger.warn('Job timeout reached, returning partial results');
        break;
      }

      // Circuit breaker
      if (consecutiveFailures >= maxConsecutiveFailures) {
        logger.warn(`Circuit breaker: ${maxConsecutiveFailures} consecutive failures, aborting`);
        break;
      }

      // Process batch of pages concurrently
      const batch = [];
      while (batch.length < pageConcurrency && queue.length > 0 && (results.length + batch.length) < effectiveMaxPages) {
        batch.push(queue.shift());
      }

      const batchResults = [];
      for (const item of batch) {
        if (batchResults.length > 0) await sleep(requestDelay);
        logger.info(`Scraping [depth=${item.depth}]: ${item.url}`);
        const result = await processPage(context, item.url);
        batchResults.push({ ...result, depth: item.depth });
      }

      for (const result of batchResults) {
        if (result.error || result.blocked) {
          consecutiveFailures++;
          if (result.blocked) {
            blocked.push(result.url);
            logger.warn(`Blocked: ${result.url} (${result.statusCode})`);

            // Retry once with delay for 403/429
            if (result.statusCode === 403 || result.statusCode === 429) {
              await sleep(5000);
              const retry = await processPage(context, result.url);
              if (!retry.blocked && !retry.error) {
                consecutiveFailures = 0;
                results.push(retry);
                if (result.depth < maxDepth && retry.html) {
                  enqueueLinks(retry.html, rootUrl, result.depth, visited, queue, includeSubdomains, effectiveMaxPages - results.length);
                }
              }
            }
          }
          continue;
        }

        consecutiveFailures = 0;
        results.push(result);

        // Report progress
        if (onProgress) {
          onProgress({ pagesScraped: results.length, totalFound: results.length + queue.length });
        }

        // Extract and enqueue links if not at max depth
        if (result.depth < maxDepth && result.html) {
          enqueueLinks(result.html, rootUrl, result.depth, visited, queue, includeSubdomains, effectiveMaxPages - results.length);
        }
      }
    }

    return {
      results: results.map(r => ({
        markdown: r.markdown,
        metadata: r.metadata,
        contacts: r.contacts,
      })),
      blocked,
      pagesScraped: results.length,
    };
  } finally {
    await context.close().catch(() => {});
  }
}

function enqueueLinks(html, rootUrl, currentDepth, visited, queue, includeSubdomains, remainingSlots) {
  if (!html) return;

  const links = extractLinks(html, rootUrl);
  const validLinks = links.filter(link => {
    if (visited.has(link)) return false;
    if (!isValidPageUrl(link)) return false;
    if (!isSameDomain(rootUrl, link, includeSubdomains)) return false;
    if (shouldSkipUrl(link)) return false;
    return true;
  });

  // Sort by priority and limit
  const sorted = sortByPriority(validLinks).slice(0, remainingSlots);
  for (const link of sorted) {
    visited.add(link);
    queue.push({ url: link, depth: currentDepth + 1 });
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { crawlSite };
