const express = require('express');
const router  = express.Router();
const {
  createValidation,
  submitValidation,
  getTodayChallenge,
  getChallenges,
  getChallengeById,
  createChallenge,
  submitChallenge,
  getCompletionCount,
} = require('../controllers/challenge.controller');
const { requireAuth, requireRole, optionalAuth } = require('../middleware/auth');

router.get  ('/',           getChallenges);
router.get  ('/today',      optionalAuth, getTodayChallenge);
router.get  ('/:id',        getChallengeById);
router.get  ('/:id/submissions/count', getCompletionCount);
router.post ('/',           requireAuth, requireRole('faculty','admin'), createValidation, createChallenge);
router.post ('/:id/submit', requireAuth, submitValidation, submitChallenge);

module.exports = router;