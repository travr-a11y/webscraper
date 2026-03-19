const config = require('../config');

function authMiddleware(req, res, next) {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({ success: false, error: 'Missing x-api-key header' });
  }

  if (apiKey !== config.apiKey) {
    return res.status(403).json({ success: false, error: 'Invalid API key' });
  }

  next();
}

module.exports = authMiddleware;
