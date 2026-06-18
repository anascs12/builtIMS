const sgMail = require('@sendgrid/mail');
const logger = require('../utils/logger');

sgMail.setApiKey(process.env.SENDGRID_API_KEY || 'placeholder');

const FROM     = process.env.SENDGRID_FROM_EMAIL || 'noreply@buildims.imsciences.edu.pk';
const FRONTEND = process.env.FRONTEND_URL        || 'http://localhost:3000';

const stripHtml = (html = '') => html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() || 'Please view this email in an HTML-compatible email client.';

const sendEmail = async ({ to, subject, html, text }) => {
  if (!process.env.SENDGRID_API_KEY) {
    logger.warn('SendGrid not configured — email not sent', { to, subject });
    return;
  }
  try {
    await sgMail.send({
      to,
      from:    { email: FROM, name: 'BuildIMS' },
      subject,
      text:    text || stripHtml(html),
      html:    html || '<p>Please view this email in an HTML-compatible client.</p>',
    });
    logger.info('Email sent', { to, subject });
  } catch (err) {
    logger.error('SendGrid error', {
      to,
      error:    err.message,
      response: JSON.stringify(err.response?.body),
    });
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Failed to send email.');
    }
  }
};

const sendVerificationEmail = async ({ to, fullName, token }) => {
  const verifyUrl = `${FRONTEND}/verify-email?token=${encodeURIComponent(token)}`;
  await sendEmail({
    to,
    subject: 'Verify your BuildIMS email address',
    text: `Welcome to BuildIMS, ${fullName}! Click this link to verify your email: ${verifyUrl} (expires in 24 hours)`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
        <h2 style="color:#1e293b">Welcome to BuildIMS, ${fullName}!</h2>
        <p>Click below to verify your email. Link expires in <strong>24 hours</strong>.</p>
        <p style="text-align:center;margin:32px 0">
          <a href="${verifyUrl}"
             style="background:#ff6154;color:#fff;padding:14px 28px;border-radius:6px;
                    text-decoration:none;font-weight:600;font-size:15px">
            Verify Email Address
          </a>
        </p>
        <p style="color:#64748b;font-size:13px">
          Or copy this link:<br>
          <a href="${verifyUrl}" style="color:#ff6154">${verifyUrl}</a>
        </p>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0">
        <p style="color:#94a3b8;font-size:12px">
          If you did not create a BuildIMS account, ignore this email.
        </p>
      </div>
    `,
  });
};

const sendPasswordResetEmail = async ({ to, fullName, token }) => {
  const resetUrl = `${FRONTEND}/reset-password?token=${encodeURIComponent(token)}`;
  await sendEmail({
    to,
    subject: 'Reset your BuildIMS password',
    text: `Hi ${fullName}, reset your BuildIMS password here: ${resetUrl} (expires in 1 hour)`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
        <h2 style="color:#1e293b">Password Reset Request</h2>
        <p>Hi ${fullName}, click below to reset your password. Expires in <strong>1 hour</strong>.</p>
        <p style="text-align:center;margin:32px 0">
          <a href="${resetUrl}"
             style="background:#dc2626;color:#fff;padding:14px 28px;border-radius:6px;
                    text-decoration:none;font-weight:600;font-size:15px">
            Reset Password
          </a>
        </p>
        <p style="color:#64748b;font-size:13px">
          Or copy this link:<br>
          <a href="${resetUrl}" style="color:#dc2626">${resetUrl}</a>
        </p>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0">
        <p style="color:#94a3b8;font-size:12px">
          If you did not request a password reset, ignore this email.
        </p>
      </div>
    `,
  });
};

module.exports = { sendEmail, sendVerificationEmail, sendPasswordResetEmail };