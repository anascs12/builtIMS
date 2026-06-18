const express = require('express');
const router  = express.Router();
const { uploadAvatar } = require('../controllers/upload.controller');
const { requireAuth }  = require('../middleware/auth');

router.post('/avatar', requireAuth, uploadAvatar);

module.exports = router;