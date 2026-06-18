const express = require('express');
const router  = express.Router();
const {
  getIdeas, getIdea, createIdea, submitProof,
  requestCollaboration, respondToCollaboration,
} = require('../controllers/idea.controller');
const { requireAuth, optionalAuth } = require('../middleware/auth');

router.get ('/',                    optionalAuth,  getIdeas);
router.get ('/:id',                 optionalAuth,  getIdea);
router.post('/',                    requireAuth,   createIdea);
router.put ('/:id/proof',           requireAuth,   submitProof);
router.post('/:id/collaborate',     requireAuth,   requestCollaboration);
router.put ('/:id/collaborate',     requireAuth,   respondToCollaboration);

module.exports = router;