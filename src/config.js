const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const config = {
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  apiKey: process.env.API_KEY || '',
  redisUrl: process.env.REDIS_URL || '',
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
    jobTimeoutMs: parseInt(process.env.JOB_TIMEOUT_MS, 10) || 300000,
    requestDelayMs: parseInt(process.env.REQUEST_DELAY_MS, 10) || 1500,
    browserConcurrency: parseInt(process.env.BROWSER_CONCURRENCY, 10) || 3,
  },
};

// Validate S3 config: if any var is set, all 4 are required
const s3Vars = ['endpoint', 'bucket', 'accessKey', 'secretKey'];
const s3Set = s3Vars.filter(k => config.s3[k]);
if (s3Set.length > 0 && s3Set.length < 4) {
  const missing = s3Vars.filter(k => !config.s3[k]);
  throw new Error(`Partial S3 config: missing ${missing.join(', ')}. Set all 4 S3 vars or none.`);
}

// Warn about missing vars in production (don't crash — health check must still work)
if (config.nodeEnv === 'production') {
  if (!config.apiKey) {
    console.error('WARNING: API_KEY is not set — all authenticated endpoints will return 401');
  }
  if (!config.redisUrl) {
    console.error('WARNING: REDIS_URL is not set — job queue and worker are disabled');
  }
}

module.exports = config;
