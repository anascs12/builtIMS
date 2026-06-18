const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const logger = require('./logger');

const ACCESS_SECRET  = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const ACCESS_TTL     = process.env.JWT_EXPIRES_IN      || '7d';
const REFRESH_TTL    = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

if (!ACCESS_SECRET || !REFRESH_SECRET) {
  logger.error('JWT secrets are not set. Set JWT_SECRET and JWT_REFRESH_SECRET in .env');
  process.exit(1);
}

const signAccessToken = (payload) => {
  const jti = uuidv4();
  const token = jwt.sign(
    { ...payload, jti, type: 'access' },
    ACCESS_SECRET,
    { expiresIn: ACCESS_TTL, issuer: 'buildims', audience: 'buildims-client' }
  );
  const decoded = jwt.decode(token);
  return { token, jti, expiresAt: new Date(decoded.exp * 1000) };
};

const signRefreshToken = (payload) => {
  const jti = uuidv4();
  const token = jwt.sign(
    { ...payload, jti, type: 'refresh' },
    REFRESH_SECRET,
    { expiresIn: REFRESH_TTL, issuer: 'buildims', audience: 'buildims-client' }
  );
  const decoded = jwt.decode(token);
  return { token, jti, expiresAt: new Date(decoded.exp * 1000) };
};

const verifyAccessToken = (token) => {
  return jwt.verify(token, ACCESS_SECRET, {
    issuer:   'buildims',
    audience: 'buildims-client',
  });
};

const verifyRefreshToken = (token) => {
  return jwt.verify(token, REFRESH_SECRET, {
    issuer:   'buildims',
    audience: 'buildims-client',
  });
};

module.exports = { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken };