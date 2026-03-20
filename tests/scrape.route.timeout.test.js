/**
 * Sync timeout → 504 (isolated env: short SCRAPE_SYNC_TIMEOUT_MS).
 */
process.env.API_KEY = 'test-key';
process.env.SCRAPE_SYNC_TIMEOUT_MS = '50';
process.env.MAX_CONCURRENT_SCRAPES = '3';

jest.mock('../src/scraper/crawler', () => ({
  crawlSite: jest.fn(
    () =>
      new Promise((resolve) => {
        const t = setTimeout(
          () => resolve({ results: [], blocked: [], pagesScraped: 0 }),
          60_000
        );
        t.unref();
      })
  ),
}));

const request = require('supertest');
const express = require('express');
const scrapeRoutes = require('../src/routes/scrape');

const app = express();
app.use(express.json());
app.use('/api/scrape', scrapeRoutes);

describe('POST /api/scrape sync timeout', () => {
  test('returns 504 when crawl exceeds SCRAPE_SYNC_TIMEOUT_MS', async () => {
    const res = await request(app)
      .post('/api/scrape')
      .set('x-api-key', 'test-key')
      .send({ url: 'https://example.com' });

    expect(res.status).toBe(504);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/timeout/i);
  });
});
