const cron   = require('node-cron');
const { sendWeeklyDigest } = require('../services/digest.service');
const logger = require('../utils/logger');

// Every Sunday at 1:00 PM UTC = 6:00 PM PKT
const startDigestJob = () => {
  cron.schedule('0 13 * * 0', async () => {
    logger.info('Running weekly digest job...');
    try {
      const result = await sendWeeklyDigest();
      logger.info('Weekly digest complete.', result);
    } catch (err) {
      logger.error('Weekly digest job failed', { error: err.message });
    }
  }, {
    timezone: 'UTC',
  });

  logger.info('Weekly digest job scheduled (Sundays 6PM PKT).');
};

module.exports = { startDigestJob };