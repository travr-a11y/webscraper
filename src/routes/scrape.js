const { Router } = require('express');
const { v4: uuidv4 } = require('uuid');
const { addScrapeJob, getScrapeQueue } = require('../queue/scrapeQueue');
const { isPrivateOrReservedHost } = require('../scraper/urlUtils');
const logger = require('../logger');

const router = Router();

// POST /api/scrape - Submit a new scrape job
router.post('/', async (req, res) => {
  try {
    const { url, webhookUrl, maxDepth, maxPages, includeSubdomains, proxyUrl } = req.body;

    // Validate URL
    if (!url) {
      return res.status(400).json({ success: false, error: 'url is required' });
    }
    try {
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return res.status(400).json({ success: false, error: 'url must be http or https' });
      }
      if (isPrivateOrReservedHost(parsed.hostname)) {
        return res.status(400).json({ success: false, error: 'Scraping private or internal addresses is not allowed' });
      }
    } catch {
      return res.status(400).json({ success: false, error: 'Invalid URL format' });
    }

    // Validate webhookUrl
    if (!webhookUrl) {
      return res.status(400).json({ success: false, error: 'webhookUrl is required' });
    }
    try {
      new URL(webhookUrl);
    } catch {
      return res.status(400).json({ success: false, error: 'Invalid webhookUrl format' });
    }

    // Validate optional params
    if (maxDepth !== undefined && (typeof maxDepth !== 'number' || maxDepth < 1 || maxDepth > 5)) {
      return res.status(400).json({ success: false, error: 'maxDepth must be between 1 and 5' });
    }
    if (maxPages !== undefined && (typeof maxPages !== 'number' || maxPages < 1 || maxPages > 100)) {
      return res.status(400).json({ success: false, error: 'maxPages must be between 1 and 100' });
    }

    const jobId = uuidv4();

    await addScrapeJob({
      jobId,
      url,
      webhookUrl,
      maxDepth,
      maxPages,
      includeSubdomains: includeSubdomains || false,
      proxyUrl: proxyUrl || null,
    });

    logger.info({ jobId, url }, 'Job queued');

    return res.status(202).json({
      success: true,
      jobId,
      status: 'queued',
    });
  } catch (err) {
    logger.error(`Error queuing job: ${err.message}`);
    return res.status(500).json({ success: false, error: 'Failed to queue job' });
  }
});

// GET /api/scrape/:jobId - Get job status
router.get('/:jobId', async (req, res) => {
  try {
    const queue = getScrapeQueue();
    const job = await queue.getJob(req.params.jobId);

    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    const state = await job.getState();
    const progress = job.progress || {};

    let status;
    switch (state) {
      case 'waiting':
      case 'delayed':
        status = 'queued';
        break;
      case 'active':
        status = 'scraping';
        break;
      case 'completed':
        status = job.returnvalue?.webhookStatus === 'failed' ? 'webhook_failed' : 'completed';
        break;
      case 'failed':
        status = 'failed';
        break;
      default:
        status = state;
    }

    const response = {
      jobId: req.params.jobId,
      status,
      progress: {
        pagesScraped: progress.pagesScraped || 0,
        totalFound: progress.totalFound || 0,
      },
      data: status === 'completed' || status === 'webhook_failed' ? (job.returnvalue?.data || []) : null,
      error: state === 'failed' ? (job.failedReason || 'Unknown error') : null,
    };

    return res.json(response);
  } catch (err) {
    logger.error(`Error fetching job: ${err.message}`);
    return res.status(500).json({ success: false, error: 'Failed to fetch job status' });
  }
});

module.exports = router;
