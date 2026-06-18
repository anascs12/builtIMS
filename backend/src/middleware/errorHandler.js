const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');
const logger   = require('../utils/logger');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formatted = errors.array().reduce((acc, err) => {
      acc[err.path] = err.msg;
      return acc;
    }, {});
    return next(ApiError.badRequest('Validation failed', formatted, 'VALIDATION_ERROR'));
  }
  next();
};

const errorHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);

  if (err.isApiError) {
    return res.status(err.statusCode).json({
      success: false,
      code:    err.code    || null,
      message: err.message,
      details: err.details || undefined,
    });
  }

  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }

  if (err.code === '23505') {
    return res.status(409).json({
      success: false,
      code:    'DUPLICATE_ENTRY',
      message: 'A record with that value already exists.',
    });
  }

  if (err.code === '23503') {
    return res.status(400).json({
      success: false,
      code:    'REFERENCE_ERROR',
      message: 'Referenced record does not exist.',
    });
  }

  logger.error('Unhandled error', {
    message: err.message,
    stack:   err.stack,
    method:  req.method,
    url:     req.originalUrl,
    userId:  req.user?.userId,
    ip:      req.ip,
  });

  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred.'
      : err.message,
  });
};

const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
};

module.exports = { validate, errorHandler, notFoundHandler };