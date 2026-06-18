const crypto = require('crypto');

const generateRawToken = (bytes = 32) =>
  crypto.randomBytes(bytes).toString('base64url');

const hashToken = (rawToken) =>
  crypto.createHash('sha256').update(rawToken).digest('hex');

const verifyToken = (rawToken, storedHash) => {
  const inputHash = hashToken(rawToken);
  try {
    return crypto.timingSafeEqual(
      Buffer.from(inputHash, 'hex'),
      Buffer.from(storedHash, 'hex')
    );
  } catch {
    return false;
  }
};

module.exports = { generateRawToken, hashToken, verifyToken };