const { verifyAccessToken } = require('../utils/jwt');
const { redis, keys }       = require('../config/redis');
const { query }             = require('../config/database');
const ApiError              = require('../utils/ApiError');
const logger                = require('../utils/logger');

const requireAuth = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw ApiError.unauthorized('No token provided', 'MISSING_TOKEN');
    }

    const token = header.slice(7);
    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw ApiError.unauthorized('Token expired', 'TOKEN_EXPIRED');
      }
      throw ApiError.unauthorized('Invalid token', 'INVALID_TOKEN');
    }

    // If Redis is down, log and continue — better to allow requests than crash
    let blacklisted = 0;
    try {
      blacklisted = await redis.exists(keys.tokenBlacklist(decoded.jti));
    } catch (redisErr) {
      logger.warn('Redis unavailable during token blacklist check, proceeding without check', { error: redisErr.message });
    }
    if (blacklisted) {
      throw ApiError.unauthorized('Token has been revoked', 'TOKEN_REVOKED');
    }

    const result = await query(
      `SELECT id, role, username, status
       FROM users
       WHERE id = $1 AND deleted_at IS NULL`,
      [decoded.userId]
    );

    if (!result.rows.length) {
      throw ApiError.unauthorized('User not found', 'USER_NOT_FOUND');
    }

    const user = result.rows[0];

    if (user.status === 'suspended') {
      throw ApiError.unauthorized('Account suspended', 'ACCOUNT_SUSPENDED');
    }
    if (user.status === 'pending_verification') {
      throw ApiError.unauthorized('Email not verified', 'EMAIL_NOT_VERIFIED');
    }
    if (user.status === 'deactivated') {
      throw ApiError.unauthorized('Account deactivated', 'ACCOUNT_DEACTIVATED');
    }

    req.user = {
      userId:   decoded.userId,
      role:     user.role,
      username: user.username,
      jti:      decoded.jti,
    };

    next();
  } catch (err) {
    next(err);
  }
};

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return next(ApiError.unauthorized());
  if (!roles.includes(req.user.role)) {
    return next(ApiError.forbidden(`Requires one of: ${roles.join(', ')}`));
  }
  next();
};

const optionalAuth = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) return next();

    const token = header.slice(7);
    try {
      const decoded = verifyAccessToken(token);
      let blacklisted = 0;
      try { blacklisted = await redis.exists(keys.tokenBlacklist(decoded.jti)); } catch { /* Redis down, skip check */ }
      if (!blacklisted) {
        req.user = { userId: decoded.userId, role: decoded.role, username: decoded.username, jti: decoded.jti };
      }
    } catch {
      // Silently ignore
    }
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { requireAuth, requireRole, optionalAuth };