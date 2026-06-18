const { query } = require('../config/database');
const { sendEmail } = require('./email.service');
const logger = require('../utils/logger');

const getWeeklyStats = async () => {
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Most voted project this week
  const topProjectResult = await query(
    `SELECT p.title, p.id, u.username, u.full_name,
            COALESCE(pvt.weighted_votes, 0) AS votes
     FROM projects p
     JOIN users u ON u.id = p.submitted_by
     LEFT JOIN project_vote_totals pvt ON pvt.project_id = p.id
     WHERE p.status IN ('approved','archived')
       AND p.deleted_at IS NULL
       AND p.created_at >= $1
     ORDER BY votes DESC
     LIMIT 1`,
    [oneWeekAgo]
  );

  // Top streak holder
  const topStreakResult = await query(
    `SELECT u.username, u.full_name, s.current_streak
     FROM streaks s
     JOIN users u ON u.id = s.user_id
     WHERE s.current_streak > 0
       AND u.deleted_at IS NULL
     ORDER BY s.current_streak DESC
     LIMIT 1`
  );

  // Total challenge completions this week
  const completionsResult = await query(
    `SELECT COUNT(*) AS total
     FROM challenge_submissions
     WHERE completed_at >= $1`,
    [oneWeekAgo]
  );

  // Total new projects this week
  const newProjectsResult = await query(
    `SELECT COUNT(*) AS total
     FROM projects
     WHERE created_at >= $1
       AND status IN ('approved','archived')
       AND deleted_at IS NULL`,
    [oneWeekAgo]
  );

  // Fastest rising project (most votes in last 7 days)
  const risingResult = await query(
    `SELECT p.title, p.id, u.username, COUNT(v.id) AS recent_votes
     FROM project_votes v
     JOIN projects p ON p.id = v.project_id
     JOIN users u    ON u.id = p.submitted_by
     WHERE v.created_at >= $1
     GROUP BY p.id, p.title, u.username
     ORDER BY recent_votes DESC
     LIMIT 1`,
    [oneWeekAgo]
  );

  return {
    topProject:        topProjectResult.rows[0]    || null,
    topStreak:         topStreakResult.rows[0]      || null,
    totalCompletions:  parseInt(completionsResult.rows[0].total),
    newProjects:       parseInt(newProjectsResult.rows[0].total),
    risingProject:     risingResult.rows[0]         || null,
  };
};

const getUserStats = async (userId) => {
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Challenges completed this week
  const challengesResult = await query(
    `SELECT COUNT(*) AS total
     FROM challenge_submissions
     WHERE user_id = $1 AND completed_at >= $2`,
    [userId, oneWeekAgo]
  );

  // Votes received this week
  const votesResult = await query(
    `SELECT COUNT(*) AS total
     FROM project_votes v
     JOIN projects p ON p.id = v.project_id
     WHERE p.submitted_by = $1 AND v.created_at >= $2`,
    [userId, oneWeekAgo]
  );

  // Current streak
  const streakResult = await query(
    'SELECT current_streak, longest_streak FROM streaks WHERE user_id = $1',
    [userId]
  );

  // Overall rank
  const rankResult = await query(
    `SELECT COUNT(*) + 1 AS rank
     FROM user_portfolio_stats
     WHERE (total_challenges_completed * 1 +
            projects_submitted * 5 +
            total_votes_received * 2 +
            total_badges * 10 +
            current_streak * 3) >
           (SELECT total_challenges_completed * 1 +
                   projects_submitted * 5 +
                   total_votes_received * 2 +
                   total_badges * 10 +
                   current_streak * 3
            FROM user_portfolio_stats WHERE user_id = $1)`,
    [userId]
  );

  return {
    challengesThisWeek: parseInt(challengesResult.rows[0].total),
    votesThisWeek:      parseInt(votesResult.rows[0].total),
    currentStreak:      streakResult.rows[0]?.current_streak  || 0,
    longestStreak:      streakResult.rows[0]?.longest_streak  || 0,
    rank:               parseInt(rankResult.rows[0]?.rank)    || null,
  };
};

const buildDigestHtml = (user, platformStats, userStats) => {
  const FRONTEND = process.env.FRONTEND_URL || 'http://localhost:3000';

  const topProjectSection = platformStats.topProject
    ? `<tr>
        <td style="padding:12px 0;border-bottom:1px solid #e2e8f0">
          <span style="color:#64748b;font-size:13px">🏆 Most Voted Project</span><br>
          <strong><a href="${FRONTEND}/projects/${platformStats.topProject.id}"
            style="color:#2563eb;text-decoration:none">
            ${platformStats.topProject.title}
          </a></strong>
          by ${platformStats.topProject.full_name}
          — ${platformStats.topProject.votes} votes
        </td>
       </tr>`
    : '';

  const topStreakSection = platformStats.topStreak
    ? `<tr>
        <td style="padding:12px 0;border-bottom:1px solid #e2e8f0">
          <span style="color:#64748b;font-size:13px">🔥 Top Streak Holder</span><br>
          <strong>
            <a href="${FRONTEND}/u/${platformStats.topStreak.username}"
              style="color:#2563eb;text-decoration:none">
              ${platformStats.topStreak.full_name}
            </a>
          </strong>
          — ${platformStats.topStreak.current_streak} day streak
        </td>
       </tr>`
    : '';

  const risingSection = platformStats.risingProject
    ? `<tr>
        <td style="padding:12px 0">
          <span style="color:#64748b;font-size:13px">📈 Fastest Rising</span><br>
          <strong>
            <a href="${FRONTEND}/projects/${platformStats.risingProject.id}"
              style="color:#2563eb;text-decoration:none">
              ${platformStats.risingProject.title}
            </a>
          </strong>
          — ${platformStats.risingProject.recent_votes} new votes this week
        </td>
       </tr>`
    : '';

  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1e293b">

      <div style="background:#1e293b;padding:24px;border-radius:8px;margin-bottom:24px">
        <h1 style="color:#fff;margin:0;font-size:22px">BuildIMS Weekly Digest</h1>
        <p style="color:#94a3b8;margin:8px 0 0">
          Week ending ${new Date().toLocaleDateString('en-PK', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}
        </p>
      </div>

      <p>Hi <strong>${user.full_name}</strong>,</p>
      <p>Here's what happened on BuildIMS this week and how you're doing.</p>

      <!-- Platform Stats -->
      <h2 style="font-size:16px;color:#475569;text-transform:uppercase;
                 letter-spacing:0.05em;margin-top:32px">
        This Week on BuildIMS
      </h2>
      <table style="width:100%;border-collapse:collapse">
        ${topProjectSection}
        ${topStreakSection}
        ${risingSection}
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #e2e8f0">
            <span style="color:#64748b;font-size:13px">✅ Total Challenge Completions</span><br>
            <strong>${platformStats.totalCompletions} students</strong> completed challenges this week
          </td>
        </tr>
        <tr>
          <td style="padding:12px 0">
            <span style="color:#64748b;font-size:13px">🚀 New Projects</span><br>
            <strong>${platformStats.newProjects} new projects</strong> submitted this week
          </td>
        </tr>
      </table>

      <!-- Personal Stats -->
      <h2 style="font-size:16px;color:#475569;text-transform:uppercase;
                 letter-spacing:0.05em;margin-top:32px">
        Your Week
      </h2>
      <table style="width:100%;border-collapse:collapse">
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #e2e8f0">
            <span style="color:#64748b;font-size:13px">🎯 Challenges Completed</span><br>
            <strong>${userStats.challengesThisWeek}</strong> this week
          </td>
        </tr>
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #e2e8f0">
            <span style="color:#64748b;font-size:13px">👍 Votes Received</span><br>
            <strong>${userStats.votesThisWeek}</strong> new votes on your projects
          </td>
        </tr>
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #e2e8f0">
            <span style="color:#64748b;font-size:13px">🔥 Current Streak</span><br>
            <strong>${userStats.currentStreak} days</strong>
            (longest: ${userStats.longestStreak} days)
          </td>
        </tr>
        ${userStats.rank ? `
        <tr>
          <td style="padding:12px 0">
            <span style="color:#64748b;font-size:13px">🏅 Your Rank</span><br>
            <strong>#${userStats.rank}</strong> on the platform
          </td>
        </tr>` : ''}
      </table>

      <!-- CTA -->
      <div style="text-align:center;margin:40px 0">
        <a href="${FRONTEND}"
           style="background:#2563eb;color:#fff;padding:14px 32px;border-radius:6px;
                  text-decoration:none;font-weight:600;font-size:15px">
          Go to BuildIMS →
        </a>
      </div>

      <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0">
      <p style="color:#94a3b8;font-size:12px;text-align:center">
        BuildIMS — IMSciences Student Developer Platform<br>
        <a href="${FRONTEND}/settings" style="color:#94a3b8">Unsubscribe from digest</a>
      </p>
    </div>
  `;
};

const sendWeeklyDigest = async () => {
  logger.info('Starting weekly digest send...');

  const platformStats = await getWeeklyStats();

  // Get all subscribed active students
  const usersResult = await query(
    `SELECT id, email, full_name
     FROM users
     WHERE digest_subscribed = TRUE
       AND status = 'active'
       AND deleted_at IS NULL
       AND role = 'student'`
  );

  const users = usersResult.rows;
  logger.info(`Sending digest to ${users.length} users...`);

  let sent = 0;
  let failed = 0;

  for (const user of users) {
    try {
      const userStats = await getUserStats(user.id);
      const html      = buildDigestHtml(user, platformStats, userStats);

      await sendEmail({
        to:      user.email,
        subject: `Your BuildIMS Weekly Digest — ${new Date().toLocaleDateString('en-PK', { month: 'long', day: 'numeric' })}`,
        html,
      });

      // Log the send
      await query(
        `INSERT INTO digest_logs (user_id, sent_at, status)
         VALUES ($1, NOW(), 'sent')
         ON CONFLICT DO NOTHING`,
        [user.id]
      );

      sent++;
    } catch (err) {
      failed++;
      logger.error('Failed to send digest to user', { userId: user.id, error: err.message });

      await query(
        `INSERT INTO digest_logs (user_id, sent_at, status, error)
         VALUES ($1, NOW(), 'failed', $2)
         ON CONFLICT DO NOTHING`,
        [user.id, err.message]
      ).catch(() => {});
    }
  }

  logger.info(`Digest complete. Sent: ${sent}, Failed: ${failed}`);
  return { sent, failed, total: users.length };
};

module.exports = { sendWeeklyDigest, getWeeklyStats };