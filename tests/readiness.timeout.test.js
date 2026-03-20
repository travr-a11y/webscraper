process.env.READY_CHECK_TIMEOUT_MS = '100';

jest.mock('../src/config', () => ({
  redisUrl: 'redis://localhost:6379',
}));

jest.mock('../src/queue/connection', () => ({
  getConnection: () => ({
    ping: () => new Promise(() => {}),
  }),
}));

jest.mock('../src/queue/scrapeQueue', () => ({
  getScrapeQueue: () => ({}),
}));

const { getReadinessState } = require('../src/health/readiness');

describe('getReadinessState (stuck Redis ping)', () => {
  test('returns ready false with timeout reason', async () => {
    const s = await getReadinessState();
    expect(s.ready).toBe(false);
    expect(s.reason).toMatch(/timed out/);
    expect(s.redis).toMatchObject({ configured: true, ok: false });
  }, 15_000);
});
