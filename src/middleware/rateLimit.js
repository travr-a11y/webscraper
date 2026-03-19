const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute per key
  keyGenerator: (req) => req.headers['x-api-key'] || req.ip,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Rate limit exceeded. Max 30 requests per minute.' },
});

module.exports = apiLimiter;
