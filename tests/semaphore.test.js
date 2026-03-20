const { Semaphore } = require('../src/utils/semaphore');

describe('Semaphore', () => {
  test('tryAcquire allows up to max concurrent holders', () => {
    const s = new Semaphore(2);
    expect(s.tryAcquire()).toBe(true);
    expect(s.tryAcquire()).toBe(true);
    expect(s.tryAcquire()).toBe(false);
    s.release();
    expect(s.tryAcquire()).toBe(true);
  });

  test('acquire waits until release', async () => {
    const s = new Semaphore(1);
    await s.acquire();
    const p = s.acquire();
    let second = false;
    p.then(() => {
      second = true;
    });
    await new Promise((r) => setTimeout(r, 10));
    expect(second).toBe(false);
    s.release();
    await p;
    expect(second).toBe(true);
  });
});
