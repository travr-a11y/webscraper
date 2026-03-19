const { Worker } = require('bullmq');
const { getConnection } = require('./connection');
const { QUEUE_NAME } = require('./scrapeQueue');
const { crawlSite } = require('../scraper/crawler');
const { sendWebhook } = require('../webhook/sender');
const { uploadResult } = require('../storage/s3');
const logger = require('../logger');

let worker = null;

function startWorker() {
  if (worker) return worker;

  worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      const { jobId, url, webhookUrl, maxDepth, maxPages, includeSubdomains, proxyUrl } = job.data;
      const jobLogger = logger.child({ jobId });

      jobLogger.info(`Starting crawl: ${url}`);
      await job.updateProgress({ pagesScraped: 0, totalFound: 0, status: 'scraping' });

      try {
        const result = await crawlSite(
          { url, maxDepth, maxPages, includeSubdomains, proxyUrl },
          async (progress) => {
            await job.updateProgress({ ...progress, status: 'scraping' });
          }
        );

        jobLogger.info(`Crawl complete: ${result.pagesScraped} pages scraped`);

        // Build Firecrawl-compatible payload
        const payload = {
          success: true,
          jobId,
          data: result.results,
          blocked: result.blocked,
        };

        // Upload to S3
        try {
          const domain = new URL(url).hostname;
          await uploadResult(domain, jobId, payload);
          jobLogger.info('Results uploaded to S3');
        } catch (err) {
          jobLogger.warn(`S3 upload failed: ${err.message}`);
        }

        // Send webhook
        if (webhookUrl) {
          const webhookSuccess = await sendWebhook(webhookUrl, payload, jobLogger);
          if (!webhookSuccess) {
            jobLogger.warn('Webhook delivery failed after all retries');
            return { ...payload, webhookStatus: 'failed' };
          }
        }

        return payload;
      } catch (err) {
        jobLogger.error(`Crawl failed: ${err.message}`);

        // Try to notify via webhook about failure
        if (webhookUrl) {
          const errorPayload = {
            success: false,
            jobId,
            error: err.message,
            data: [],
          };
          await sendWebhook(webhookUrl, errorPayload, jobLogger).catch(() => {});
        }

        throw err;
      }
    },
    {
      connection: getConnection(),
      concurrency: 5,
      limiter: {
        max: 10,
        duration: 1000,
      },
    }
  );

  worker.on('completed', (job) => {
    logger.info({ jobId: job.data.jobId }, 'Job completed');
  });

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.data?.jobId, error: err.message }, 'Job failed');
  });

  worker.on('error', (err) => {
    logger.error(`Worker error: ${err.message}`);
  });

  logger.info('Scrape worker started (concurrency: 5)');
  return worker;
}

async function stopWorker() {
  if (worker) {
    await worker.close();
    worker = null;
    logger.info('Worker stopped');
  }
}

module.exports = { startWorker, stopWorker };
