const express = require('express');
const router  = express.Router();
const {
  getPlatformRadar,
  getPersonalGap,
  getLastScrapeInfo,
  triggerScrape,
} = require('../controllers/radar.controller');
const { requireAuth, requireRole, optionalAuth } = require('../middleware/auth');

router.get('/platform',     getPlatformRadar);
router.get('/personal',     requireAuth, getPersonalGap);
router.get('/info',         getLastScrapeInfo);
router.post('/scrape',      requireAuth, requireRole('faculty','admin'), triggerScrape);

module.exports = router;