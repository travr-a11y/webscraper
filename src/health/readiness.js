const config = require('../config');
const { getConnection } = require('../queue/connection');
const { getScrapeQueue } = require('../queue/scrapeQueue');

/**
 * Race promise against a timeout. Always clears the timer when the promise settles.
 * @param {Promise<T>} promise
 * @param {number} ms
 * @param {string} label
 * @returns {Promise<T>}
 */
async function withTimeout(promise, ms, label) {
  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`${label} timed out after ${ms}ms`)),
      ms
    );
  });
  try {
    return await Promise.race([Promise.resolve(promise), timeoutPromise]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Dependency readiness for ops / load balancers. Bounded by READY_CHECK_TIMEOUT_MS (default 2000).
 * @returns {Promise<{ ready: boolean, reason?: string, redis: object, queue?: object }>}
 */
async function getReadinessState() {
  const timeoutMs = parseInt(process.env.READY_CHECK_TIMEOUT_MS, 10) || 2000;

  if (!config.redisUrl) {
    return {
      ready: false,
      reason: 'REDIS_URL not configured',
      redis: { configured: false, ok: false },
    };
  }

  try {
    const connection = getConnection();
    const queue = getScrapeQueue();

    await withTimeout(connection.ping(), timeoutMs, 'redis ping');

    const [waiting, active] = await withTimeout(
      Promise.all([queue.getWaitingCount(), queue.getActiveCount()]),
      timeoutMs,
      'queue metrics'
    );

    return {
      ready: true,
      redis: { configured: true, ok: true },
      queue: { waiting, active },
    };
  } catch (err) {
    return {
      ready: false,
      reason: err.message,
      redis: { configured: true, ok: false, error: err.message },
    };
  }
}

module.exports = { getReadinessState, withTimeout };
