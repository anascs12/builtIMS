const bcrypt   = require('bcryptjs');
const { query, withTransaction }               = require('../config/database');
const { redis, keys }                          = require('../config/redis');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { generateRawToken, hashToken }          = require('../utils/crypto');
const { sendVerificationEmail, sendPasswordResetEmail } = require('./email.service');
const ApiError = require('../utils/ApiError');
const logger   = require('../utils/logger');

const BCRYPT_ROUNDS    = 12;
const LOCKOUT_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60;
const VERIFY_TTL       = 24 * 60 * 60;
const RESET_TTL        = 60 * 60;

const register = async ({ email, username, password, fullName, studentId, programId, currentSemester, careerInterestId }) => {
  

  return withTransaction(async (client) => {
    const emailCheck = await client.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (emailCheck.rows.length) throw ApiError.conflict('An account with this email already exists.', 'EMAIL_TAKEN');

    const usernameCheck = await client.query('SELECT id FROM users WHERE username = $1', [username.toLowerCase()]);
    if (usernameCheck.rows.length) throw ApiError.conflict('Username is already taken.', 'USERNAME_TAKEN');

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const userResult = await client.query(
      `INSERT INTO users
         (email, username, password_hash, full_name, student_id,
          program_id, current_semester, career_interest_id, role, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'student','pending_verification')
       RETURNING id, email, username, full_name`,
      [email.toLowerCase(), username.toLowerCase(), passwordHash, fullName,
       studentId || null, programId || null, currentSemester || null, careerInterestId || null]
    );

    const user = userResult.rows[0];

    await client.query('INSERT INTO streaks (user_id) VALUES ($1) ON CONFLICT DO NOTHING', [user.id]);

    const rawToken  = generateRawToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + VERIFY_TTL * 1000);

    await client.query(
      'INSERT INTO email_verification_tokens (user_id, token_hash, expires_at) VALUES ($1,$2,$3)',
      [user.id, tokenHash, expiresAt]
    );

    await client.query(
      "INSERT INTO audit_log (user_id, action, metadata) VALUES ($1,'register',$2)",
      [user.id, JSON.stringify({ email, username })]
    );

    await sendVerificationEmail({ to: user.email, fullName: user.full_name, token: rawToken });

    logger.info('User registered', { userId: user.id, email });

    return {
      message: 'Registration successful. Please check your email to verify your account.',
      user: { id: user.id, email: user.email, username: user.username, fullName: user.full_name },
    };
  });
};

const verifyEmail = async (rawToken) => {
  const tokenHash = hashToken(rawToken);
  const result = await query(
    `SELECT evt.id, evt.user_id, evt.expires_at, evt.used_at, u.status
     FROM email_verification_tokens evt
     JOIN users u ON u.id = evt.user_id
     WHERE evt.token_hash = $1`,
    [tokenHash]
  );

  if (!result.rows.length) throw ApiError.badRequest('Invalid or expired verification link.', null, 'INVALID_TOKEN');

  const { id, user_id, expires_at, used_at, status } = result.rows[0];
  if (used_at)              throw ApiError.badRequest('This link has already been used.', null, 'TOKEN_USED');
  if (new Date() > expires_at) throw ApiError.badRequest('This link has expired.', null, 'TOKEN_EXPIRED');
  if (status === 'active')  return { message: 'Email already verified. You can log in.' };

  await withTransaction(async (client) => {
    await client.query('UPDATE email_verification_tokens SET used_at = NOW() WHERE id = $1', [id]);
    await client.query("UPDATE users SET status = 'active' WHERE id = $1", [user_id]);
    await client.query("INSERT INTO audit_log (user_id, action) VALUES ($1,'email_verified')", [user_id]);
  });

  return { message: 'Email verified successfully. You can now log in.' };
};

const login = async ({ email, password, userAgent, ipAddress }) => {
  const result = await query(
    `SELECT id, email, username, password_hash, role, status,
            failed_login_attempts, locked_until, full_name
     FROM users WHERE email = $1 AND deleted_at IS NULL`,
    [email.toLowerCase()]
  );

  const INVALID = ApiError.unauthorized('Invalid email or password.', 'INVALID_CREDENTIALS');

  if (!result.rows.length) {
    await bcrypt.hash('dummy', BCRYPT_ROUNDS);
    throw INVALID;
  }

  const user = result.rows[0];

  if (user.locked_until && new Date() < user.locked_until) {
    const remaining = Math.ceil((user.locked_until - new Date()) / 60000);
    throw ApiError.unauthorized(`Account locked. Try again in ${remaining} minute(s).`, 'ACCOUNT_LOCKED');
  }

  const passwordValid = await bcrypt.compare(password, user.password_hash);

  if (!passwordValid) {
    const newAttempts = user.failed_login_attempts + 1;
    const shouldLock  = newAttempts >= LOCKOUT_ATTEMPTS;
    await query(
      'UPDATE users SET failed_login_attempts=$1, locked_until=$2 WHERE id=$3',
      [newAttempts, shouldLock ? new Date(Date.now() + LOCKOUT_DURATION * 1000) : null, user.id]
    );
    await query(
      "INSERT INTO audit_log (user_id, action, ip_address, user_agent) VALUES ($1,$2,$3,$4)",
      [user.id, shouldLock ? 'account_locked' : 'login_failed', ipAddress, userAgent]
    );
    if (shouldLock) throw ApiError.unauthorized('Too many failed attempts. Account locked for 15 minutes.', 'ACCOUNT_LOCKED');
    throw INVALID;
  }

  if (user.status === 'pending_verification') throw ApiError.unauthorized('Please verify your email first.', 'EMAIL_NOT_VERIFIED');
  if (user.status === 'suspended')            throw ApiError.unauthorized('Account suspended.', 'ACCOUNT_SUSPENDED');

  const { token: accessToken, jti: accessJti, expiresAt: accessExp } = signAccessToken({ userId: user.id, role: user.role, username: user.username });
  const { token: refreshToken, expiresAt: refreshExp }               = signRefreshToken({ userId: user.id });

  const refreshHash = hashToken(refreshToken);
  await query(
    'INSERT INTO refresh_tokens (user_id, token_hash, user_agent, ip_address, expires_at) VALUES ($1,$2,$3,$4,$5)',
    [user.id, refreshHash, userAgent, ipAddress, refreshExp]
  );

  await query(
    'UPDATE users SET failed_login_attempts=0, locked_until=NULL, last_login_at=NOW() WHERE id=$1',
    [user.id]
  );

  await query(
    "INSERT INTO audit_log (user_id, action, ip_address, user_agent) VALUES ($1,'login',$2,$3)",
    [user.id, ipAddress, userAgent]
  );

  return {
    accessToken, refreshToken, expiresAt: accessExp,
    user: { id: user.id, email: user.email, username: user.username, fullName: user.full_name, role: user.role },
  };
};

const refreshTokens = async (rawRefreshToken, userAgent, ipAddress) => {
  let decoded;
  try { decoded = verifyRefreshToken(rawRefreshToken); }
  catch { throw ApiError.unauthorized('Invalid or expired refresh token.', 'INVALID_REFRESH_TOKEN'); }

  const tokenHash = hashToken(rawRefreshToken);
  const result = await query('SELECT id, user_id, expires_at, revoked_at FROM refresh_tokens WHERE token_hash=$1', [tokenHash]);

  if (!result.rows.length || result.rows[0].revoked_at || new Date() > result.rows[0].expires_at) {
    throw ApiError.unauthorized('Refresh token not valid.', 'INVALID_REFRESH_TOKEN');
  }

  const { id: tokenId, user_id } = result.rows[0];
  await query('UPDATE refresh_tokens SET revoked_at=NOW() WHERE id=$1', [tokenId]);

  const userResult = await query('SELECT id, role, username, status FROM users WHERE id=$1 AND deleted_at IS NULL', [user_id]);
  if (!userResult.rows.length || userResult.rows[0].status !== 'active') {
    throw ApiError.unauthorized('User not found or inactive.');
  }

  const user = userResult.rows[0];
  const { token: newAccess, expiresAt: accessExp } = signAccessToken({ userId: user.id, role: user.role, username: user.username });
  const { token: newRefresh, expiresAt: refreshExp } = signRefreshToken({ userId: user.id });

  await query(
    'INSERT INTO refresh_tokens (user_id, token_hash, user_agent, ip_address, expires_at) VALUES ($1,$2,$3,$4,$5)',
    [user.id, hashToken(newRefresh), userAgent, ipAddress, refreshExp]
  );

  return { accessToken: newAccess, refreshToken: newRefresh, expiresAt: accessExp };
};

const logout = async (userId, jti, rawRefreshToken) => {
  try { await redis.setex(keys.tokenBlacklist(jti), 7 * 24 * 60 * 60, '1'); } catch {}
  if (rawRefreshToken) {
    await query('UPDATE refresh_tokens SET revoked_at=NOW() WHERE token_hash=$1', [hashToken(rawRefreshToken)]);
  }
  await query("INSERT INTO audit_log (user_id, action) VALUES ($1,'logout')", [userId]);
};

const forgotPassword = async (email, ipAddress) => {
  const result = await query('SELECT id, full_name, status FROM users WHERE email=$1 AND deleted_at IS NULL', [email.toLowerCase()]);
  if (!result.rows.length || result.rows[0].status !== 'active') return;

  const user = result.rows[0];
  await query("UPDATE password_reset_tokens SET used_at=NOW() WHERE user_id=$1 AND used_at IS NULL", [user.id]);

  const rawToken  = generateRawToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + RESET_TTL * 1000);

  await query('INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, ip_address) VALUES ($1,$2,$3,$4)', [user.id, tokenHash, expiresAt, ipAddress]);
  await sendPasswordResetEmail({ to: email, fullName: user.full_name, token: rawToken });
  await query("INSERT INTO audit_log (user_id, action, ip_address) VALUES ($1,'password_reset_requested',$2)", [user.id, ipAddress]);
};

const resetPassword = async (rawToken, newPassword) => {
  const tokenHash = hashToken(rawToken);
  const result = await query(
    'SELECT prt.id, prt.user_id, prt.expires_at, prt.used_at FROM password_reset_tokens prt WHERE prt.token_hash=$1',
    [tokenHash]
  );

  if (!result.rows.length) throw ApiError.badRequest('Invalid or expired reset link.', null, 'INVALID_TOKEN');
  const { id, user_id, expires_at, used_at } = result.rows[0];
  if (used_at)              throw ApiError.badRequest('This link has already been used.', null, 'TOKEN_USED');
  if (new Date() > expires_at) throw ApiError.badRequest('This reset link has expired.', null, 'TOKEN_EXPIRED');

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

  await withTransaction(async (client) => {
    await client.query(
      'UPDATE users SET password_hash=$1, password_changed_at=NOW(), failed_login_attempts=0, locked_until=NULL WHERE id=$2',
      [passwordHash, user_id]
    );
    await client.query('UPDATE password_reset_tokens SET used_at=NOW() WHERE id=$1', [id]);
    await client.query('UPDATE refresh_tokens SET revoked_at=NOW() WHERE user_id=$1 AND revoked_at IS NULL', [user_id]);
    await client.query("INSERT INTO audit_log (user_id, action) VALUES ($1,'password_reset_completed')", [user_id]);
  });

  return { message: 'Password reset. You can now log in.' };
};

const resendVerification = async (email) => {
  const result = await query('SELECT id, full_name, status FROM users WHERE email=$1 AND deleted_at IS NULL', [email.toLowerCase()]);
  if (!result.rows.length || result.rows[0].status === 'active') return;

  const user = result.rows[0];
  await query("UPDATE email_verification_tokens SET used_at=NOW() WHERE user_id=$1 AND used_at IS NULL", [user.id]);

  const rawToken  = generateRawToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + VERIFY_TTL * 1000);

  await query('INSERT INTO email_verification_tokens (user_id, token_hash, expires_at) VALUES ($1,$2,$3)', [user.id, tokenHash, expiresAt]);
  await sendVerificationEmail({ to: email, fullName: user.full_name, token: rawToken });
};

module.exports = { register, verifyEmail, login, refreshTokens, logout, forgotPassword, resetPassword, resendVerification };