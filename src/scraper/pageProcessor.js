const { htmlToMarkdown } = require('./markdown');
const { extractMetadata } = require('./metadata');
const { extractAllContacts } = require('./contacts');
const logger = require('../logger');
const config = require('../config');

async function processPage(context, url) {
  const page = await context.newPage();

  // Block images, fonts, CSS for speed (keep scripts for dynamic content)
  await page.route('**/*', (route) => {
    const resourceType = route.request().resourceType();
    if (['image', 'font', 'stylesheet', 'media'].includes(resourceType)) {
      return route.abort();
    }
    return route.continue();
  });

  let statusCode = null;
  let html = '';

  try {
    const response = await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: config.scraper.pageTimeoutMs,
    });

    statusCode = response ? response.status() : null;

    // Check for Cloudflare challenge or blocked
    if (statusCode === 403 || statusCode === 429) {
      return { url, blocked: true, statusCode };
    }

    // Wait a bit for JS rendering
    await page.waitForTimeout(1000);

    html = await page.content();

    // Extract data
    const markdown = htmlToMarkdown(html, url);
    const metadata = extractMetadata(html, url, statusCode);
    const contacts = extractAllContacts(html);

    return {
      url,
      blocked: false,
      statusCode,
      html,
      markdown,
      metadata,
      contacts,
    };
  } catch (err) {
    logger.warn(`Failed to process page ${url}: ${err.message}`);
    return {
      url,
      blocked: false,
      statusCode,
      error: err.message,
    };
  } finally {
    await page.close().catch(() => {});
  }
}

module.exports = { processPage };
