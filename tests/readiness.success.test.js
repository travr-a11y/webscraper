const { getReadinessState } = require('../src/health/readiness');

describe('getReadinessState (no Redis)', () => {
  test('returns ready true', async () => {
    const s = await getReadinessState();
    expect(s.ready).toBe(true);
    expect(s.service).toBe('webscraper');
  });
});
