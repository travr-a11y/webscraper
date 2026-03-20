const { Router } = require('express');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const { crawlSite } = require('../scraper/crawler');
const { preparePayloadForResponse } = require('../scraper/limitPayload');
const { uploadResult } = require('../storage/s3');
const { Semaphore } = require('../utils/semaphore');
const { isPrivateOrReservedHost } = require('../scraper/urlUtils');
const logger = require('../logger');

const router = Router();

const scrapeSemaphore = new Semaphore(config.scraper.maxConcurrentScrapes);

function scrapeTimeoutError(timeoutMs) {
  const err = new Error('SCRAPE_TIMEOUT');
  err.code = 'SCRAPE_TIMEOUT';
  err.timeoutMs = timeoutMs;
  return err;
}

// POST /api/scrape — synchronous response with crawl results (same JSON shape as former webhook body)
router.post('/', async (req, res) => {
  const jobId = uuidv4();
  const jobLogger = logger.child({ jobId });

  try {
    const { url, maxDepth, maxPages, includeSubdomains, proxyUrl } = req.body;

    if (!url) {
      return res.status(400).json({ success: false, error: 'url is required' });
    }
    try {
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return res.status(400).json({ success: false, error: 'url must be http or https' });
      }
      if (isPrivateOrReservedHost(parsed.hostname)) {
        return res
          .status(400)
          .json({ success: false, error: 'Scraping private or internal addresses is not allowed' });
      }
    } catch {
      return res.status(400).json({ success: false, error: 'Invalid URL format' });
    }

    if (maxDepth !== undefined && (typeof maxDepth !== 'number' || maxDepth < 1 || maxDepth > 5)) {
      return res.status(400).json({ success: false, error: 'maxDepth must be between 1 and 5' });
    }
    if (maxPages !== undefined && (typeof maxPages !== 'number' || maxPages < 1 || maxPages > 100)) {
      return res.status(400).json({ success: false, error: 'maxPages must be between 1 and 100' });
    }

    if (!scrapeSemaphore.tryAcquire()) {
      return res.status(429).json({
        success: false,
        error: 'Too many concurrent scrapes — try again shortly',
      });
    }

    const timeoutMs = config.scraper.syncTimeoutMs;
    let released = false;
    const releaseOnce = () => {
      if (!released) {
        released = true;
        scrapeSemaphore.release();
      }
    };

    try {
      const crawlPromise = crawlSite(
        {
          url,
          maxDepth,
          maxPages,
          includeSubdomains: includeSubdomains || false,
          proxyUrl: proxyUrl || null,
        },
        async (progress) => {
          jobLogger.debug({ progress }, 'crawl progress');
        }
      );

      const result = await Promise.race([
        crawlPromise,
        new Promise((_, reject) => {
          setTimeout(() => reject(scrapeTimeoutError(timeoutMs)), timeoutMs);
        }),
      ]);

      const payload = {
        success: true,
        jobId,
        data: result.results,
        blocked: result.blocked,
      };

      const finalPayload = preparePayloadForResponse(payload, jobLogger);

      try {
        const domain = new URL(url).hostname;
        const s3Key = await uploadResult(domain, jobId, finalPayload);
        if (s3Key) {
          jobLogger.info({ s3Key }, 'Results uploaded to S3');
        }
      } catch (err) {
        jobLogger.warn(`S3 upload failed: ${err.message}`);
      }

      return res.status(200).json(finalPayload);
    } catch (err) {
      if (err.code === 'SCRAPE_TIMEOUT') {
        jobLogger.warn(`Scrape exceeded sync timeout (${timeoutMs}ms)`);
        return res.status(504).json({
          success: false,
          jobId,
          error: 'Scrape timeout exceeded',
        });
      }

      jobLogger.error(`Crawl failed: ${err.message}`);
      return res.status(200).json({
        success: false,
        jobId,
        error: err.message,
        data: [],
      });
    } finally {
      releaseOnce();
    }
  } catch (err) {
    jobLogger.error(`Error in scrape handler: ${err.message}`);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

module.exports = router;
