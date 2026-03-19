const { chromium } = require('playwright');
const logger = require('../logger');

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0',
  'Mozilla/5.0 (X11; Linux x86_64; rv:133.0) Gecko/20100101 Firefox/133.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:133.0) Gecko/20100101 Firefox/133.0',
];

let browser = null;

function getRandomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

async function getBrowser() {
  if (!browser || !browser.isConnected()) {
    logger.info('Launching Playwright Chromium browser');
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });

    browser.on('disconnected', () => {
      logger.warn('Browser disconnected');
      browser = null;
    });
  }
  return browser;
}

async function createContext(proxyUrl = null) {
  const b = await getBrowser();
  const userAgent = getRandomUserAgent();

  const contextOptions = {
    userAgent,
    viewport: { width: 1920, height: 1080 },
    locale: 'en-US',
    extraHTTPHeaders: {
      'Accept-Language': 'en-US,en;q=0.9',
    },
    ignoreHTTPSErrors: true,
    javaScriptEnabled: true,
  };

  if (proxyUrl) {
    contextOptions.proxy = { server: proxyUrl };
  }

  const context = await b.newContext(contextOptions);

  // Set webdriver to false
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
  });

  return context;
}

async function closeBrowser() {
  if (browser) {
    logger.info('Closing browser');
    await browser.close().catch(() => {});
    browser = null;
  }
}

module.exports = {
  getBrowser,
  createContext,
  closeBrowser,
  getRandomUserAgent,
};
