const request = require('supertest');

const ORIGINAL_REDIS = process.env.REDIS_URL;
const ORIGINAL_NODE_ENV = process.env.NODE_ENV;

describe('Health HTTP (liveness without Redis)', () => {
  let app;

  beforeAll(() => {
    process.env.REDIS_URL = '';
    process.env.NODE_ENV = 'test';
    jest.resetModules();
    app = require('../src/index');
  });

  afterAll(() => {
    if (ORIGINAL_REDIS === undefined) {
      delete process.env.REDIS_URL;
    } else {
      process.env.REDIS_URL = ORIGINAL_REDIS;
    }
    if (ORIGINAL_NODE_ENV === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = ORIGINAL_NODE_ENV;
    }
    jest.resetModules();
  });

  test('GET /api/health returns 200 and does not require Redis', async () => {
    const res = await request(app).get('/api/health').expect(200);
    expect(res.body).toEqual({ status: 'ok', service: 'webscraper' });
  });

  test('GET /api/ready returns 503 when REDIS_URL is not configured', async () => {
    const res = await request(app).get('/api/ready').expect(503);
    expect(res.body.ready).toBe(false);
    expect(res.body.reason).toMatch(/REDIS_URL/);
    expect(res.body.redis).toMatchObject({ configured: false, ok: false });
  });
});
