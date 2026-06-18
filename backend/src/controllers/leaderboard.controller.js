const leaderboardService = require('../services/leaderboard.service');

const getStreakLeaderboard = async (req, res, next) => {
  try {
    const data = await leaderboardService.getStreakLeaderboard();
    res.json({ success: true, leaderboard: data });
  } catch (err) { next(err); }
};

const getProjectLeaderboard = async (req, res, next) => {
  try {
    const data = await leaderboardService.getProjectLeaderboard(req.query.showcaseId);
    res.json({ success: true, leaderboard: data });
  } catch (err) { next(err); }
};

const getProgramLeaderboard = async (req, res, next) => {
  try {
    const data = await leaderboardService.getProgramLeaderboard();
    res.json({ success: true, leaderboard: data });
  } catch (err) { next(err); }
};

const getUserLeaderboard = async (req, res, next) => {
  try {
    const data = await leaderboardService.getUserLeaderboard();
    res.json({ success: true, leaderboard: data });
  } catch (err) { next(err); }
};

const getHallOfFame = async (req, res, next) => {
  try {
    const data = await leaderboardService.getHallOfFame();
    res.json({ success: true, hallOfFame: data });
  } catch (err) { next(err); }
};

module.exports = {
  getStreakLeaderboard,
  getProjectLeaderboard,
  getProgramLeaderboard,
  getUserLeaderboard,
  getHallOfFame,
};