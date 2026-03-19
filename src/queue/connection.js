const IORedis = require('ioredis');
const config = require('../config');
const logger = require('../logger');

let connection = null;

function getConnection() {
  if (!connection) {
    if (!config.redisUrl) {
      throw new Error('REDIS_URL is not configured');
    }

    const opts = {
      maxRetriesPerRequest: null, // Required by BullMQ
      enableReadyCheck: false,
      retryStrategy(times) {
        const delay = Math.min(times * 200, 5000);
        logger.warn(`Redis reconnecting in ${delay}ms (attempt ${times})`);
        return delay;
      },
    };

    // Railway Redis uses rediss:// (TLS) — IORedis needs tls option
    if (config.redisUrl.startsWith('rediss://')) {
      opts.tls = {};
    }

    connection = new IORedis(config.redisUrl, opts);

    connection.on('connect', () => logger.info('Redis connected'));
    connection.on('error', (err) => logger.error(`Redis error: ${err.message}`));
  }

  return connection;
}

async function closeConnection() {
  if (connection) {
    await connection.quit().catch(() => {});
    connection = null;
    logger.info('Redis connection closed');
  }
}

module.exports = { getConnection, closeConnection };
