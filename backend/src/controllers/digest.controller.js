const { sendWeeklyDigest, getWeeklyStats } = require('../services/digest.service');

const sendTestDigest = async (req, res, next) => {
  try {
    const result = await sendWeeklyDigest();
    res.json({ success: true, message: 'Digest sent.', ...result });
  } catch (err) { next(err); }
};

const getStats = async (req, res, next) => {
  try {
    const stats = await getWeeklyStats();
    res.json({ success: true, stats });
  } catch (err) { next(err); }
};

module.exports = { sendTestDigest, getStats };