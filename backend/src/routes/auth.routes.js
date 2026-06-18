const express = require('express');
const router  = express.Router();
const {
  registerValidation, loginValidation, forgotPasswordValidation, resetPasswordValidation,
  register, verifyEmail, resendVerification, login, refresh, logout, forgotPassword, resetPassword, getMe,
} = require('../controllers/auth.controller');
const { requireAuth } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimit');

if (process.env.NODE_ENV !== 'development') router.use(authLimiter);

router.post('/register',              registerValidation,       register);
router.get ('/verify-email',                                    verifyEmail);
router.post('/resend-verification',                             resendVerification);
router.post('/login',                 loginValidation,          login);
router.post('/refresh',                                         refresh);
router.post('/forgot-password',       forgotPasswordValidation, forgotPassword);
router.post('/reset-password',        resetPasswordValidation,  resetPassword);
router.post('/logout',  requireAuth,                            logout);
router.get ('/me',      requireAuth,                            getMe);

module.exports = router;