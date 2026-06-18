const express = require('express');
const router  = express.Router();
const {
  updateProfileValidation,
  getPublicProfile,
  updateProfile,
  setAvatar,
  getDefaultAvatars,
} = require('../controllers/user.controller');
const { requireAuth } = require('../middleware/auth');

// Public
router.get('/avatars/defaults',  getDefaultAvatars);
router.get('/:username',         getPublicProfile);

// Protected
router.put('/me',                requireAuth, updateProfileValidation, updateProfile);
router.put('/me/avatar',         requireAuth, setAvatar);

module.exports = router;