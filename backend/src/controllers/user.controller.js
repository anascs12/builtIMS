const { body }     = require('express-validator');
const { validate } = require('../middleware/errorHandler');
const userService  = require('../services/user.service');
const ApiError     = require('../utils/ApiError');

const updateProfileValidation = [
  body('fullName').optional().trim()
    .isLength({ min: 2, max: 100 }).withMessage('Full name must be 2–100 characters.'),
  body('bio').optional().trim()
    .isLength({ max: 500 }).withMessage('Bio must be under 500 characters.'),
  body('currentSemester').optional()
    .isInt({ min: 1, max: 8 }).withMessage('Semester must be between 1 and 8.'),
  body('careerInterestId').optional()
    .isInt({ min: 1 }).withMessage('Invalid career interest.'),
  body('githubUsername').optional().trim()
    .isLength({ max: 100 }).withMessage('GitHub username too long.'),
  body('linkedinUrl').optional().trim()
    .isURL().withMessage('Must be a valid URL.'),
  validate,
];

const getPublicProfile = async (req, res, next) => {
  try {
    const result = await userService.getPublicProfile(req.params.username);
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
};

const updateProfile = async (req, res, next) => {
  try {
    const updated = await userService.updateProfile(req.user.userId, {
      fullName:        req.body.fullName,
      bio:             req.body.bio,
      currentSemester: req.body.currentSemester,
      careerInterestId: req.body.careerInterestId,
      githubUsername:  req.body.githubUsername,
      linkedinUrl:     req.body.linkedinUrl,
    });
    res.json({ success: true, user: updated });
  } catch (err) { next(err); }
};

const setAvatar = async (req, res, next) => {
  try {
    const { avatar } = req.body;
    if (!avatar) throw ApiError.badRequest('Avatar filename is required.');
    const result = await userService.setAvatar(req.user.userId, avatar);
    res.json({ success: true, avatarUrl: result.avatar_url });
  } catch (err) { next(err); }
};

const getDefaultAvatars = async (req, res, next) => {
  try {
    const avatars = userService.getDefaultAvatars();
    res.json({ success: true, avatars });
  } catch (err) { next(err); }
};

module.exports = {
  updateProfileValidation,
  getPublicProfile,
  updateProfile,
  setAvatar,
  getDefaultAvatars,
};