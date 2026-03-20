const { withTimeout } = require('../src/health/readiness');

describe('withTimeout', () => {
  test('resolves when the inner promise resolves in time', async () => {
    await expect(withTimeout(Promise.resolve(42), 500, 'op')).resolves.toBe(42);
  });

  test('rejects when the inner promise never settles', async () => {
    const hang = new Promise(() => {});
    await expect(withTimeout(hang, 80, 'hang')).rejects.toThrow(/hang timed out after 80ms/);
  }, 10_000);
});
