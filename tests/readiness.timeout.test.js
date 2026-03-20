const { getReadinessState } = require('../src/health/readiness');

describe('getReadinessState', () => {
  test('resolves without hanging (no external I/O)', async () => {
    const s = await getReadinessState();
    expect(s.ready).toBe(true);
  });
});
