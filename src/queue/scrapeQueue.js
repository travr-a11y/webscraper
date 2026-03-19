const { Queue } = require('bullmq');
const { getConnection } = require('./connection');

const QUEUE_NAME = 'scrape-jobs';

let queue = null;

function getScrapeQueue() {
  if (!queue) {
    queue = new Queue(QUEUE_NAME, {
      connection: getConnection(),
      defaultJobOptions: {
        attempts: 2,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 50 },
      },
    });
  }
  return queue;
}

async function addScrapeJob(data) {
  const q = getScrapeQueue();
  const job = await q.add('scrape', data, {
    jobId: data.jobId,
  });
  return job;
}

async function closeQueue() {
  if (queue) {
    await queue.close();
    queue = null;
  }
}

module.exports = { getScrapeQueue, addScrapeJob, closeQueue, QUEUE_NAME };
