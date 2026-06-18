const { body }       = require('express-validator');
const { validate }   = require('../middleware/errorHandler');
const adminService   = require('../services/admin.service');
const projectService = require('../services/project.service');
const challengeService = require('../services/challenge.service');
const digestService  = require('../services/digest.service');
const ApiError       = require('../utils/ApiError');

const getDashboard = async (req, res, next) => {
  try {
    const stats = await adminService.getDashboardStats();
    res.json({ success: true, stats });
  } catch (err) { next(err); }
};

const getUsers = async (req, res, next) => {
  try {
    const result = await adminService.getAllUsers({
      page:   parseInt(req.query.page)  || 1,
      limit:  parseInt(req.query.limit) || 20,
      search: req.query.search,
      role:   req.query.role,
      status: req.query.status,
    });
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
};

const updateUserRole = async (req, res, next) => {
  try {
    const user = await adminService.updateUserRole(req.params.id, req.body.role);
    res.json({ success: true, user });
  } catch (err) { next(ApiError.badRequest(err.message)); }
};

const updateUserStatus = async (req, res, next) => {
  try {
    const user = await adminService.updateUserStatus(req.params.id, req.body.status);
    res.json({ success: true, user });
  } catch (err) { next(ApiError.badRequest(err.message)); }
};

const getPendingProjects = async (req, res, next) => {
  try {
    const projects = await adminService.getPendingProjects();
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
    res.json({ success: true, project });
  } catch (err) { next(err); }
};

const createChallengeValidation = [
  body('title').trim().isLength({ min: 5, max: 120 }).withMessage('Title must be 5–120 characters.'),
  body('description').trim().isLength({ min: 20 }).withMessage('Description must be at least 20 characters.'),
  body('dayType').isIn(['code','design','debug','explain','build']).withMessage('Invalid day type.'),
  body('level').isIn(['beginner','intermediate','advanced','expert']).withMessage('Invalid level.'),
  body('publishDate').isDate().withMessage('Must be a valid date (YYYY-MM-DD).'),
  validate,
];

const createChallenge = async (req, res, next) => {
  try {
    const challenge = await challengeService.createChallenge(req.user.userId, {
      title:       req.body.title,
      description: req.body.description,
      dayType:     req.body.dayType,
      level:       req.body.level,
      minSemester: req.body.minSemester,
      maxSemester: req.body.maxSemester,
      publishDate: req.body.publishDate,
      content:     req.body.content,
      techTags:    req.body.techTags,
    });
    res.status(201).json({ success: true, challenge });
  } catch (err) { next(err); }
};

const getRecentChallenges = async (req, res, next) => {
  try {
    const challenges = await adminService.getRecentChallenges();
    res.json({ success: true, challenges });
  } catch (err) { next(err); }
};

const sendDigest = async (req, res, next) => {
  try {
    const result = await digestService.sendWeeklyDigest();
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
};

const getDigestStats = async (req, res, next) => {
  try {
    const stats = await digestService.getWeeklyStats();
    res.json({ success: true, stats });
  } catch (err) { next(err); }
};

module.exports = {
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
};