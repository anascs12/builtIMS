const { body }       = require('express-validator');
const { validate }   = require('../middleware/errorHandler');
const challengeService = require('../services/challenge.service');
const ApiError       = require('../utils/ApiError');

const createValidation = [
  body('title').trim().isLength({ min: 5, max: 120 }).withMessage('Title must be 5–120 characters.'),
  body('description').trim().isLength({ min: 20 }).withMessage('Description must be at least 20 characters.'),
  body('dayType').isIn(['code','design','debug','explain','build']).withMessage('Invalid day type.'),
  body('level').isIn(['beginner','intermediate','advanced','expert']).withMessage('Invalid level.'),
  body('publishDate').isDate().withMessage('Must be a valid date (YYYY-MM-DD).'),
  body('minSemester').optional().isInt({ min: 1, max: 8 }),
  body('maxSemester').optional().isInt({ min: 1, max: 8 }),
  validate,
];

const submitValidation = [
  body('submissionType').isIn(['code','screenshot','link','text']).withMessage('Invalid submission type.'),
  body('content').optional().trim().isLength({ max: 5000 }),
  body('notes').optional().trim().isLength({ max: 500 }),
  validate,
];

const getTodayChallenge = async (req, res, next) => {
  try {
    const semester  = req.user?.currentSemester || null;
    const challenge = await challengeService.getTodayChallenge(semester);
    if (!challenge) {
      return res.json({ success: true, challenge: null, message: 'No challenge posted for today yet.' });
    }
    res.json({ success: true, challenge });
  } catch (err) { next(err); }
};

const getChallenges = async (req, res, next) => {
  try {
    const result = await challengeService.getChallenges({
      page:    parseInt(req.query.page)  || 1,
      limit:   parseInt(req.query.limit) || 20,
      level:   req.query.level,
      dayType: req.query.dayType,
    });
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
};

const getChallengeById = async (req, res, next) => {
  try {
    const challenge = await challengeService.getChallengeById(req.params.id);
    res.json({ success: true, challenge });
  } catch (err) { next(err); }
};

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

const submitChallenge = async (req, res, next) => {
  try {
    const result = await challengeService.submitChallenge(
      req.params.id,
      req.user.userId,
      {
        submissionType: req.body.submissionType,
        content:        req.body.content,
        notes:          req.body.notes,
      }
    );
    res.status(201).json({ success: true, ...result });
  } catch (err) { next(err); }
};

const getCompletionCount = async (req, res, next) => {
  try {
    const count = await challengeService.getCompletionCount(req.params.id);
    res.json({ success: true, count });
  } catch (err) { next(err); }
};

module.exports = {
  createValidation,
  submitValidation,
  getTodayChallenge,
  getChallenges,
  getChallengeById,
  createChallenge,
  submitChallenge,
  getCompletionCount,
};