// Early logging before any heavy requires — helps diagnose silent crashes on Railway
console.log(`[startup] pid=${process.pid} node=${process.version} PORT=${process.env.PORT || '(not set)'}`);

const express = require('express');

let config;
try {
  config = require('./config');
} catch (err) {
  console.error('[startup] FATAL: invalid configuration — HTTP server will not start');
  console.error(`[startup] ${err.message}`);
  process.exit(1);
}

const logger = require('./logger');
const authMiddleware = require('./middleware/auth');
const apiLimiter = require('./middleware/rateLimit');
const scrapeRoutes = require('./routes/scrape');
const { startWorker, stopWorker } = require('./queue/scrapeWorker');
const { closeQueue } = require('./queue/scrapeQueue');
const { closeConnection } = require('./queue/connection');
const { closeBrowser } = require('./scraper/browser');
const { getReadinessState } = require('./health/readiness');

console.log('[startup] all modules loaded');

const app = express();

app.use(express.json());

// Liveness: no Redis/queue — Railway healthcheck must always get a fast 200 when process is up
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'webscraper' });
});

// Readiness: Redis + queue with bounded timeouts (see READY_CHECK_TIMEOUT_MS)
app.get('/api/ready', async (req, res) => {
  try {
    const body = await getReadinessState();
    if (body.ready) {
      return res.status(200).json(body);
    }
    return res.status(503).json(body);
  } catch (err) {
    logger.error(`Readiness check error: ${err.message}`);
    return res.status(503).json({
      ready: false,
      reason: err.message,
      redis: { ok: false, error: err.message },
    });
  }
});

// Protected routes
app.use('/api/scrape', authMiddleware, apiLimiter, scrapeRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error(`Unhandled error: ${err.message}`);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

async function shutdown(server, signal) {
  logger.info(`${signal} received, shutting down gracefully...`);

  server.close(() => {
    logger.info('HTTP server closed');
  });

  try {
    await stopWorker();
    await closeQueue();
    await closeBrowser();
    await closeConnection();
    logger.info('All resources cleaned up');
  } catch (err) {
    logger.error(`Shutdown error: ${err.message}`);
  }

  process.exit(0);
}

if (require.main === module) {
  const server = app.listen(config.port, '0.0.0.0', () => {
    logger.info({ port: config.port, bind: '0.0.0.0' }, 'HTTP server listening (liveness: GET /api/health)');
  });

  if (config.redisUrl) {
    startWorker();
  }

  process.on('SIGTERM', () => shutdown(server, 'SIGTERM'));
  process.on('SIGINT', () => shutdown(server, 'SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error(`Unhandled rejection: ${reason}`);
  });
}

module.exports = app;
