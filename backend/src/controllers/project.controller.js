const { body }     = require('express-validator');
const { validate } = require('../middleware/errorHandler');
const projectService = require('../services/project.service');
const ApiError     = require('../utils/ApiError');

const submitValidation = [
  body('title').trim()
    .isLength({ min: 5, max: 120 }).withMessage('Title must be 5–120 characters.'),
  body('description').trim()
    .isLength({ min: 100 }).withMessage('Description must be at least 100 characters.'),
  body('programId')
    .isInt({ min: 1 }).withMessage('Program is required.'),
  body('semester')
    .isInt({ min: 1, max: 8 }).withMessage('Semester must be between 1 and 8.'),
  body('githubUrl').optional().trim()
    .isURL().withMessage('Must be a valid URL.'),
  body('demoUrl').optional().trim()
    .isURL().withMessage('Must be a valid URL.'),
  body('techTags').optional()
    .isArray({ max: 10 }).withMessage('Maximum 10 tech tags.'),
  body('teamMembers').optional()
    .isArray({ max: 4 }).withMessage('Maximum 4 team members.'),
  validate,
];

const moderateValidation = [
  body('action').isIn(['approved', 'rejected']).withMessage('Action must be approved or rejected.'),
  body('rejectionReason').optional().trim()
    .isLength({ max: 500 }).withMessage('Reason must be under 500 characters.'),
  validate,
];

const submitProject = async (req, res, next) => {
  try {
    const project = await projectService.submitProject(req.user.userId, {
      title:       req.body.title,
      description: req.body.description,
      programId:   req.body.programId,
      semester:    req.body.semester,
      githubUrl:   req.body.githubUrl,
      demoUrl:     req.body.demoUrl,
      techTags:    req.body.techTags,
      teamMembers: req.body.teamMembers,
    });
    res.status(201).json({ success: true, message: 'Project submitted for moderation.', project });
  } catch (err) { next(err); }
};

const getProjects = async (req, res, next) => {
  try {
    const result = await projectService.getProjects({
      search:    req.query.search,
      programId: req.query.programId,
      semester:  req.query.semester,
      tagId:     req.query.tagId,
      page:      parseInt(req.query.page)  || 1,
      limit:     parseInt(req.query.limit) || 20,
    });
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
};

const getProjectById = async (req, res, next) => {
  try {
    const project = await projectService.getProjectById(req.params.id);
    res.json({ success: true, project });
  } catch (err) { next(err); }
};

const getMyProjects = async (req, res, next) => {
  try {
    const projects = await projectService.getMyProjects(req.user.userId);
    res.json({ success: true, projects });
  } catch (err) { next(err); }
};

const getPendingProjects = async (req, res, next) => {
  try {
    const projects = await projectService.getPendingProjects();
    res.json({ success: true, projects });
  } catch (err) { next(err); }
};

const moderateProject = async (req, res, next) => {
  try {
    const project = await projectService.moderateProject(
      req.params.id,
      req.user.userId,
      { action: req.body.action, rejectionReason: req.body.rejectionReason }
    );
    res.json({ success: true, message: `Project ${req.body.action}.`, project });
  } catch (err) { next(err); }
};

module.exports = {
  submitValidation,
  moderateValidation,
  submitProject,
  getProjects,
  getProjectById,
  getMyProjects,
  getPendingProjects,
  moderateProject,
};