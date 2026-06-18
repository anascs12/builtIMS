const express  = require('express');
const router   = express.Router();
const {
  getShowdowns, getShowdown, createShowdown,
  submitEntry, voteSubmission, getRecentActivity,
} = require('../controllers/showdown.controller');
const { requireAuth, requireRole, optionalAuth } = require('../middleware/auth');
const { query }    = require('../config/database');
const ApiError     = require('../utils/ApiError');

router.get ('/',                       optionalAuth, getShowdowns);
router.get ('/:id',                    optionalAuth, getShowdown);
router.get ('/:id/activity',           optionalAuth, getRecentActivity);
router.post('/',                       requireAuth, requireRole('faculty','admin'), createShowdown);
router.post('/:id/submit',             requireAuth, submitEntry);
router.post('/:id/vote/:submissionId', requireAuth, voteSubmission);

router.patch('/:id/status', requireAuth, requireRole('faculty','admin'), async (req, res, next) => {
  try {
    const valid = ['upcoming', 'active', 'judging', 'closed'];
    if (!valid.includes(req.body.status)) {
      return next(ApiError.badRequest('Invalid status.'));
    }
    await query(
      'UPDATE showdowns SET status = $1, updated_at = NOW() WHERE id = $2',
      [req.body.status, req.params.id]
    );
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;