const express = require('express');
const router  = express.Router();
const {
  submitValidation,
  moderateValidation,
  submitProject,
  getProjects,
  getProjectById,
  getMyProjects,
  getPendingProjects,
  moderateProject,
} = require('../controllers/project.controller');
const { uploadCoverImage } = require('../controllers/upload.controller');
const { requireAuth, requireRole } = require('../middleware/auth');

// Public
router.get('/',          getProjects);
router.get('/my',        requireAuth, getMyProjects);
router.get('/pending',   requireAuth, requireRole('faculty', 'admin'), getPendingProjects);
router.get('/:id',       getProjectById);

// Protected
router.post('/',                   requireAuth, submitValidation, submitProject);
router.patch('/:id/moderate',      requireAuth, requireRole('faculty', 'admin'), moderateValidation, moderateProject);
router.post('/:id/cover-image',    requireAuth, uploadCoverImage);

module.exports = router;