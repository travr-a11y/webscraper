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
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  try {
    return await Promise.race([Promise.resolve(promise), timeoutPromise]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Readiness without Redis — process is up and ready to accept scrape requests.
 * @returns {Promise<{ ready: boolean, reason?: string, service: string }>}
 */
async function getReadinessState() {
  return {
    ready: true,
    service: 'webscraper',
  };
}

module.exports = { getReadinessState, withTimeout };
