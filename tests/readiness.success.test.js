jest.mock('../src/config', () => ({
  redisUrl: 'redis://localhost:6379',
}));

jest.mock('../src/queue/connection', () => ({
  getConnection: () => ({
    ping: jest.fn().mockResolvedValue('PONG'),
  }),
}));

jest.mock('../src/queue/scrapeQueue', () => ({
  getScrapeQueue: () => ({
    getWaitingCount: jest.fn().mockResolvedValue(3),
    getActiveCount: jest.fn().mockResolvedValue(1),
  }),
}));

const { getReadinessState } = require('../src/health/readiness');

describe('getReadinessState (mocked Redis + queue)', () => {
  test('returns ready true with queue metrics', async () => {
    const s = await getReadinessState();
    expect(s.ready).toBe(true);
    expect(s.redis).toMatchObject({ configured: true, ok: true });
    expect(s.queue).toEqual({ waiting: 3, active: 1 });
  });
});
