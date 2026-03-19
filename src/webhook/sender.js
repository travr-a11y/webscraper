const logger = require('../logger');

const MAX_PAYLOAD_BYTES = 5 * 1024 * 1024; // 5MB
const RETRY_DELAYS = [5000, 30000, 120000]; // 5s, 30s, 120s

async function sendWebhook(webhookUrl, payload, jobLogger = logger) {
  // Check payload size and truncate if needed
  let finalPayload = payload;
  const payloadStr = JSON.stringify(payload);

  if (Buffer.byteLength(payloadStr) > MAX_PAYLOAD_BYTES) {
    jobLogger.warn('Payload exceeds 5MB, truncating markdown content');
    finalPayload = truncatePayload(payload);
  }

  for (let attempt = 0; attempt <= RETRY_DELAYS.length - 1; attempt++) {
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalPayload),
        signal: AbortSignal.timeout(30000),
      });

      if (response.ok) {
        jobLogger.info(`Webhook delivered (attempt ${attempt + 1})`);
        return true;
      }

      jobLogger.warn(`Webhook returned ${response.status} (attempt ${attempt + 1})`);
    } catch (err) {
      jobLogger.warn(`Webhook attempt ${attempt + 1} failed: ${err.message}`);
    }

    // Wait before retry (if not last attempt)
    if (attempt < RETRY_DELAYS.length - 1) {
      await sleep(RETRY_DELAYS[attempt]);
    }
  }

  return false;
}

function truncatePayload(payload) {
  const truncated = {
    ...payload,
    truncated: true,
    data: (payload.data || []).map(page => ({
      ...page,
      markdown: page.markdown ? page.markdown.slice(0, 5000) + '\n\n[Content truncated]' : page.markdown,
    })),
  };
  return truncated;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { sendWebhook };
