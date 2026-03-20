const request = require('supertest');

const ORIGINAL_NODE_ENV = process.env.NODE_ENV;

describe('Health HTTP (liveness)', () => {
  let app;

  beforeAll(() => {
    process.env.NODE_ENV = 'test';
    jest.resetModules();
    app = require('../src/index');
  });

  afterAll(() => {
    if (ORIGINAL_NODE_ENV === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = ORIGINAL_NODE_ENV;
    }
    jest.resetModules();
  });

  test('GET /api/health returns 200', async () => {
    const res = await request(app).get('/api/health').expect(200);
    expect(res.body).toEqual({ status: 'ok', service: 'webscraper' });
  });

  test('GET /api/ready returns 200 without Redis', async () => {
    const res = await request(app).get('/api/ready').expect(200);
    expect(res.body.ready).toBe(true);
    expect(res.body.service).toBe('webscraper');
  });
});
