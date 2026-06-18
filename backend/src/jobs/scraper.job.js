const cron    = require('node-cron');
const { runScraper } = require('../services/scraper.service');
const { redis }      = require('../config/redis');
const logger  = require('../utils/logger');

// Every Sunday at 2:00 AM PKT (21:00 UTC Saturday)
const startScraperJob = () => {
  cron.schedule('0 21 * * 6', async () => {
    logger.info('Running weekly Skills Gap Radar scraper...');
    try {
      const count = await runScraper();
      // Invalidate radar cache
      await redis.del('radar:platform');
      logger.info(`Scraper job complete. Jobs processed: ${count}`);
    } catch (err) {
      logger.error('Scraper job failed', { error: err.message });
    }
  }, { timezone: 'UTC' });

  logger.info('Skills Gap Radar scraper scheduled (Sundays 2AM PKT).');
};

module.exports = { startScraperJob };