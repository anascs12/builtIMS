const express = require('express');
const router  = express.Router();
const {
  getDashboard,
  getUsers,
  updateUserRole,
  updateUserStatus,
  getPendingProjects,
  moderateProject,
  createChallengeValidation,
  createChallenge,
  getRecentChallenges,
  sendDigest,
  getDigestStats,
} = require('../controllers/admin.controller');
const { requireAuth, requireRole } = require('../middleware/auth');

router.use(requireAuth, requireRole('faculty', 'admin'));

router.get ('/dashboard',                    getDashboard);
router.get ('/users',                        getUsers);
router.patch('/users/:id/role',              updateUserRole);
router.patch('/users/:id/status',            updateUserStatus);
router.get ('/projects/pending',             getPendingProjects);
router.patch('/projects/:id/moderate',       moderateProject);
router.get ('/challenges',                   getRecentChallenges);
router.post('/challenges',                   createChallengeValidation, createChallenge);
router.get ('/digest/stats',                 getDigestStats);
router.post('/digest/send',                  sendDigest);
router.post('/ml/generate', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const { autoGenerateChallenge } = require('../services/ml.service');
    const challenge = await autoGenerateChallenge();
    if (!challenge) return res.json({ success: false, message: 'Generation failed or challenge already exists today.' });
    res.json({ success: true, challenge });
  } catch (err) { next(err); }
});

module.exports = router;