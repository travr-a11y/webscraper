// Early logging before any heavy requires — helps diagnose silent crashes on Railway
console.log(`[startup] pid=${process.pid} node=${process.version} PORT=${process.env.PORT || '(not set)'}`);

const express = require('express');
const config = require('./config');
const logger = require('./logger');
const authMiddleware = require('./middleware/auth');
const apiLimiter = require('./middleware/rateLimit');
const scrapeRoutes = require('./routes/scrape');
const { startWorker, stopWorker } = require('./queue/scrapeWorker');
const { closeQueue, getScrapeQueue } = require('./queue/scrapeQueue');
const { closeConnection } = require('./queue/connection');
const { closeBrowser } = require('./scraper/browser');

console.log('[startup] all modules loaded');

const app = express();

app.use(express.json());

// Health check (no auth required)
app.get('/api/health', async (req, res) => {
  try {
    const queue = getScrapeQueue();
    const [waiting, active] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
    ]);
    res.json({ status: 'ok', queue: { waiting, active } });
  } catch (err) {
    // If Redis isn't connected, still return a basic health check
    res.json({ status: 'ok', queue: { waiting: 0, active: 0, note: 'Redis not connected' } });
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

// Start server
const server = app.listen(config.port, '0.0.0.0', () => {
  logger.info(`Server running on port ${config.port}`);
});

// Start worker (only if Redis is configured)
if (config.redisUrl) {
  startWorker();
}

// Graceful shutdown
async function shutdown(signal) {
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

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Catch unhandled rejections
process.on('unhandledRejection', (reason) => {
  logger.error(`Unhandled rejection: ${reason}`);
});

module.exports = app;
