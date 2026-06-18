const axios  = require('axios');
const { query } = require('../config/database');
const logger = require('../utils/logger');

const LOCAL_ML_URL = 'http://127.0.0.1:5001/generate';

const DAY_MAP = {
  1: 'code', 2: 'design', 3: 'debug', 4: 'explain', 5: 'build',
};

const generateChallenge = async (dayType = 'code', level = 'intermediate') => {
  try {
    const response = await axios.post(
      LOCAL_ML_URL,
      { dayType, level },
      { timeout: 60000 }
    );
    return response.data;
  } catch (err) {
    logger.error('ML generation failed', { error: err.message });
    return null;
  }
};

const autoGenerateChallenge = async () => {
  const today    = new Date();
  const dayOfWeek = today.getDay();
  const dayType   = DAY_MAP[dayOfWeek];

  if (!dayType) {
    logger.info('ML challenge gen: skipping weekend.');
    return null;
  }

  const todayStr = today.toISOString().split('T')[0];
  const existing = await query(
    'SELECT id FROM challenges WHERE publish_date = $1',
    [todayStr]
  );
  if (existing.rows.length > 0) {
    logger.info('ML challenge gen: challenge already exists for today.');
    return null;
  }

  const level     = 'intermediate';
  const challenge = await generateChallenge(dayType, level);
  if (!challenge) return null;

  const result = await query(
    `INSERT INTO challenges
       (title, description, day_type, level, publish_date, min_semester, max_semester)
     VALUES ($1, $2, $3, $4, $5, 1, 8)
     RETURNING id, title`,
    [challenge.title, challenge.description, dayType, level, todayStr]
  );

  logger.info(`ML challenge generated: "${result.rows[0].title}"`);
  return result.rows[0];
};

module.exports = { generateChallenge, autoGenerateChallenge };