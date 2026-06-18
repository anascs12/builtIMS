const express = require('express');
const router  = express.Router();
const {
  getStreakLeaderboard,
  getProjectLeaderboard,
  getProgramLeaderboard,
  getUserLeaderboard,
  getHallOfFame,
} = require('../controllers/leaderboard.controller');

router.get('/streaks',  getStreakLeaderboard);
router.get('/projects', getProjectLeaderboard);
router.get('/programs', getProgramLeaderboard);
router.get('/users',    getUserLeaderboard);
router.get('/hall-of-fame', getHallOfFame);

module.exports = router;