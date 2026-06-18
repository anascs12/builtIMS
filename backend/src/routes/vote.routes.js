const express = require('express');
const router  = express.Router({ mergeParams: true });
const { castVote, removeVote, getProjectVotes } = require('../controllers/vote.controller');
const { requireAuth, optionalAuth } = require('../middleware/auth');

router.get  ('/',  optionalAuth, getProjectVotes);
router.post ('/',  requireAuth,  castVote);
router.delete('/', requireAuth,  removeVote);

module.exports = router;