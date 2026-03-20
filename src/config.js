const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const config = {
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  apiKey: process.env.API_KEY || '',
  s3: {
    endpoint: process.env.S3_ENDPOINT || '',
    bucket: process.env.S3_BUCKET || '',
    accessKey: process.env.S3_ACCESS_KEY || '',
    secretKey: process.env.S3_SECRET_KEY || '',
  },
  scraper: {
    defaultMaxDepth: parseInt(process.env.DEFAULT_MAX_DEPTH, 10) || 3,
    defaultMaxPages: parseInt(process.env.DEFAULT_MAX_PAGES, 10) || 50,
    pageTimeoutMs: parseInt(process.env.PAGE_TIMEOUT_MS, 10) || 30000,
    /** Aligns with HTTP sync timeout; crawler stops with partial results when exceeded */
    jobTimeoutMs: parseInt(process.env.JOB_TIMEOUT_MS, 10) || 110000,
    requestDelayMs: parseInt(process.env.REQUEST_DELAY_MS, 10) || 1500,
    browserConcurrency: parseInt(process.env.BROWSER_CONCURRENCY, 10) || 3,
    /** Route-level max wait before 504 (ms); default slightly under typical Clay ~120s cap */
    syncTimeoutMs: parseInt(process.env.SCRAPE_SYNC_TIMEOUT_MS, 10) || 110000,
    maxConcurrentScrapes: parseInt(process.env.MAX_CONCURRENT_SCRAPES, 10) || 3,
  },
};

// Validate S3 config: if any var is set, all 4 are required
const s3Vars = ['endpoint', 'bucket', 'accessKey', 'secretKey'];
const s3Set = s3Vars.filter((k) => config.s3[k]);
if (s3Set.length > 0 && s3Set.length < 4) {
  const missing = s3Vars.filter((k) => !config.s3[k]);
  const msg =
    `[config] Partial S3 configuration: some S3_* variables are set (${s3Set.join(', ')}) ` +
    `but missing: ${missing.join(', ')}. Set all four (S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY, S3_SECRET_KEY) or leave all empty.`;
  console.error(msg);
  throw new Error(msg);
}

// Warn about missing vars in production (don't crash — health check must still work)
if (config.nodeEnv === 'production') {
  if (!config.apiKey) {
    console.error('WARNING: API_KEY is not set — all authenticated endpoints will return 401');
  }
}

module.exports = config;
