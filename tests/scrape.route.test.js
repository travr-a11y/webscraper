/**
 * Integration-style tests for scrape route with mocked crawler (no Playwright).
 */
process.env.API_KEY = 'test-key';

jest.mock('../src/scraper/crawler', () => ({
  crawlSite: jest.fn(),
}));

const request = require('supertest');
const express = require('express');
const { crawlSite } = require('../src/scraper/crawler');
const scrapeRoutes = require('../src/routes/scrape');

const app = express();
app.use(express.json());
app.use('/api/scrape', scrapeRoutes);

describe('POST /api/scrape', () => {
  beforeEach(() => {
    crawlSite.mockReset();
    crawlSite.mockResolvedValue({
      results: [{ markdown: 'hello', metadata: {}, contacts: {} }],
      blocked: [],
      pagesScraped: 1,
    });
  });

  test('returns 200 with success payload for valid url', async () => {
    const res = await request(app)
      .post('/api/scrape')
      .set('x-api-key', 'test-key')
      .send({ url: 'https://example.com' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.jobId).toBeDefined();
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].markdown).toBe('hello');
    expect(crawlSite).toHaveBeenCalled();
  });

  test('returns 400 when url missing', async () => {
    await request(app)
      .post('/api/scrape')
      .set('x-api-key', 'test-key')
      .send({})
      .expect(400);
  });

  test('returns 200 with success false when crawl throws', async () => {
    crawlSite.mockRejectedValue(new Error('boom'));
    const res = await request(app)
      .post('/api/scrape')
      .set('x-api-key', 'test-key')
      .send({ url: 'https://example.com' })
      .expect(200);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('boom');
    expect(res.body.data).toEqual([]);
  });
});
