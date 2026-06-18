const cron    = require('node-cron');
const { query } = require('../config/database');
const { expireIdeas } = require('../services/idea.service');
const { closeExpiredShowdowns } = require('../services/showdown.service');
const { autoGenerateChallenge } = require('../services/ml.service');
const logger  = require('../utils/logger');

// Runs every day at 00:01 PKT (19:01 UTC)
const startStreakResetJob = () => {
  cron.schedule('1 19 * * *', async () => {
    logger.info('Running streak reset job...');
    try {
      // Use PKT (UTC+5) to calculate yesterday — the job runs at 00:01 PKT
      // which is 19:01 UTC the previous calendar day. A plain Date.now()-86400000
      // would give us UTC-yesterday (2 days ago in PKT), breaking the reset logic.
      const pktOffset = 5 * 60 * 60 * 1000;
      const pktNow    = new Date(Date.now() + pktOffset);
      const pktToday  = pktNow.toISOString().split('T')[0];
      const yesterday = new Date(+pktNow - 86400000).toISOString().split('T')[0];

      const result = await query(
        `UPDATE streaks
         SET current_streak    = 0,
             streak_started_on = NULL
         WHERE (last_completed_on < $1 OR last_completed_on IS NULL)
           AND last_completed_on IS DISTINCT FROM $2
         RETURNING user_id`,
        [yesterday, pktToday]
      );
      logger.info(`Streak reset complete. ${result.rowCount} streaks reset.`);
    } catch (err) {
      logger.error('Streak reset job failed', { error: err.message });
    }
  }, { timezone: 'UTC' });
  logger.info('Streak reset job scheduled.');
};

// Runs every day at 00:05 PKT (19:05 UTC)
const startIdeaExpiryJob = () => {
  cron.schedule('5 19 * * *', async () => {
    logger.info('Running idea expiry job...');
    try {
      const expired = await expireIdeas();
      if (expired.length > 0) {
        logger.info(`Idea expiry complete. ${expired.length} ideas marked abandoned.`);
      }
    } catch (err) {
      logger.error('Idea expiry job failed', { error: err.message });
    }
  }, { timezone: 'UTC' });
  logger.info('Idea expiry job scheduled.');
};

// Runs every hour — checks and updates showdown statuses
const startShowdownJob = () => {
  cron.schedule('0 * * * *', async () => {
    try {
      const result = await closeExpiredShowdowns();
      if (result.judging.length || result.closed.length) {
        logger.info(`Showdown cron: ${result.judging.length} moved to judging, ${result.closed.length} closed.`);
      }
    } catch (err) {
      logger.error('Showdown cron failed', { error: err.message });
    }
  }, { timezone: 'UTC' });
  logger.info('Showdown status job scheduled.');
};

// Runs every day at 08:50 PKT (03:50 UTC) — generates challenge via ML model
const startMLChallengeJob = () => {
  cron.schedule('50 3 * * 1-5', async () => {
    logger.info('Running ML challenge generation...');
    try {
      const challenge = await autoGenerateChallenge();
      if (challenge) logger.info(`ML challenge saved: "${challenge.title}"`);
      else logger.info('ML challenge gen: nothing to do.');
    } catch (err) {
      logger.error('ML challenge job failed', { error: err.message });
    }
  }, { timezone: 'UTC' });
  logger.info('ML challenge job scheduled (Mon-Fri 08:50 PKT).');
};

module.exports = { startStreakResetJob, startIdeaExpiryJob, startShowdownJob, startMLChallengeJob };