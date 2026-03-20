const logger = require('../logger');

const MAX_PAYLOAD_BYTES = 5 * 1024 * 1024; // 5MB

function truncatePayload(payload) {
  return {
    ...payload,
    truncated: true,
    data: (payload.data || []).map((page) => ({
      ...page,
      markdown: page.markdown
        ? `${page.markdown.slice(0, 5000)}\n\n[Content truncated]`
        : page.markdown,
    })),
  };
}

/**
 * Truncate markdown in pages if serialized JSON exceeds MAX_PAYLOAD_BYTES (same behavior as former webhook path).
 * @param {object} payload
 * @param {import('winston').Logger} [log]
 * @returns {object}
 */
function preparePayloadForResponse(payload, log = logger) {
  const payloadStr = JSON.stringify(payload);
  if (Buffer.byteLength(payloadStr) > MAX_PAYLOAD_BYTES) {
    log.warn('Payload exceeds 5MB, truncating markdown content');
    return truncatePayload(payload);
  }
  return payload;
}

module.exports = {
  preparePayloadForResponse,
  truncatePayload,
  MAX_PAYLOAD_BYTES,
};
