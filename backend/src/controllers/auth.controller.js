const { body }     = require('express-validator');
const { validate } = require('../middleware/errorHandler');
const authService  = require('../services/auth.service');
const ApiError     = require('../utils/ApiError');

const registerValidation = [
  body('email').trim().toLowerCase().isEmail().withMessage('Must be a valid email.'),
    
  body('username').trim().toLowerCase()
    .isLength({ min: 3, max: 50 }).withMessage('Username must be 3–50 characters.')
    .matches(/^[a-z0-9_]+$/).withMessage('Username may only contain letters, numbers, and underscores.'),
  body('password')
    .isLength({ min: 8, max: 128 }).withMessage('Password must be 8–128 characters.')
    .matches(/[A-Z]/).withMessage('Must contain at least one uppercase letter.')
    .matches(/[0-9]/).withMessage('Must contain at least one number.'),
  body('fullName').trim().isLength({ min: 2, max: 100 }).withMessage('Full name must be 2–100 characters.'),
  body('studentId').optional().trim()
    .matches(/^\d{9}$/).withMessage('Student ID must be exactly 9 digits.'),
  body('programId').optional().isInt({ min: 1 }),
  body('currentSemester').optional().isInt({ min: 1, max: 8 }),
  body('careerInterestId').optional().isInt({ min: 1 }),
  validate,
];

const loginValidation = [
  body('email').trim().toLowerCase().isEmail().withMessage('Invalid email.'),
  body('password').notEmpty().withMessage('Password is required.'),
  validate,
];

const forgotPasswordValidation = [
  body('email').trim().toLowerCase().isEmail().withMessage('Invalid email.'),
  validate,
];

const resetPasswordValidation = [
  body('token').trim().notEmpty().withMessage('Token is required.'),
  body('password')
    .isLength({ min: 8, max: 128 }).withMessage('Password must be 8–128 characters.')
    .matches(/[A-Z]/).withMessage('Must contain at least one uppercase letter.')
    .matches(/[0-9]/).withMessage('Must contain at least one number.'),
  validate,
];

const register = async (req, res, next) => {
  try {
    const result = await authService.register({
      email: req.body.email, username: req.body.username, password: req.body.password,
      fullName: req.body.fullName, studentId: req.body.studentId, programId: req.body.programId,
      currentSemester: req.body.currentSemester, careerInterestId: req.body.careerInterestId,
    });
    res.status(201).json({ success: true, ...result });
  } catch (err) { next(err); }
};

const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.query;
    if (!token) throw ApiError.badRequest('Token is required.');
    res.json({ success: true, ...(await authService.verifyEmail(token)) });
  } catch (err) { next(err); }
};

const resendVerification = async (req, res, next) => {
  try {
    await authService.resendVerification((req.body.email || '').trim().toLowerCase());
    res.json({ success: true, message: 'If an unverified account exists, a new link has been sent.' });
  } catch (err) { next(err); }
};

const login = async (req, res, next) => {
  try {
    const result = await authService.login({
      email: req.body.email, password: req.body.password,
      userAgent: req.headers['user-agent'] || '', ipAddress: req.ip,
    });
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict', maxAge: 30 * 24 * 60 * 60 * 1000, path: '/api/auth/refresh',
    });
    res.json({ success: true, accessToken: result.accessToken, expiresAt: result.expiresAt, user: result.user });
  } catch (err) { next(err); }
};

const refresh = async (req, res, next) => {
  try {
    const rawRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!rawRefreshToken) throw ApiError.unauthorized('Refresh token required.', 'MISSING_REFRESH_TOKEN');
    const result = await authService.refreshTokens(rawRefreshToken, req.headers['user-agent'] || '', req.ip);
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict', maxAge: 30 * 24 * 60 * 60 * 1000, path: '/api/auth/refresh',
    });
    res.json({ success: true, accessToken: result.accessToken, expiresAt: result.expiresAt });
  } catch (err) { next(err); }
};

const logout = async (req, res, next) => {
  try {
    await authService.logout(req.user.userId, req.user.jti, req.cookies?.refreshToken || req.body?.refreshToken);
    res.clearCookie('refreshToken', { path: '/api/auth/refresh' });
    res.json({ success: true, message: 'Logged out successfully.' });
  } catch (err) { next(err); }
};

const forgotPassword = async (req, res, next) => {
  try {
    await authService.forgotPassword(req.body.email, req.ip);
    res.json({ success: true, message: 'If that email is registered, a reset link has been sent.' });
  } catch (err) { next(err); }
};

const resetPassword = async (req, res, next) => {
  try {
    res.json({ success: true, ...(await authService.resetPassword(req.body.token, req.body.password)) });
  } catch (err) { next(err); }
};

const getMe = async (req, res, next) => {
  try {
    const { query } = require('../config/database');
    const result = await query(
      `SELECT u.id, u.email, u.username, u.full_name, u.role, u.status,
              u.program_id, u.current_semester, u.avatar_url, u.bio,
              u.github_username, u.digest_subscribed, u.created_at, u.last_login_at,
              p.code AS program_code, p.name AS program_name,
              ci.label AS career_interest
       FROM users u
       LEFT JOIN programs p          ON p.id  = u.program_id
       LEFT JOIN career_interests ci ON ci.id = u.career_interest_id
       WHERE u.id = $1 AND u.deleted_at IS NULL`,
      [req.user.userId]
    );
    if (!result.rows.length) throw ApiError.notFound('User not found.');
    res.json({ success: true, user: result.rows[0] });
  } catch (err) { next(err); }
};

module.exports = {
  registerValidation, loginValidation, forgotPasswordValidation, resetPasswordValidation,
  register, verifyEmail, resendVerification, login, refresh, logout, forgotPassword, resetPassword, getMe,
};