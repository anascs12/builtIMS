const express = require('express');
const router  = express.Router();
const { sendTestDigest, getStats } = require('../controllers/digest.controller');
const { requireAuth, requireRole } = require('../middleware/auth');

router.get ('/stats',     requireAuth, requireRole('faculty','admin'), getStats);
router.post('/send-test', requireAuth, requireRole('faculty','admin'), sendTestDigest);

module.exports = router;