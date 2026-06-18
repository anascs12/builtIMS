const { query, withTransaction } = require('../config/database');

const getShowdowns = async () => {
  const result = await query(
    `SELECT
       s.id, s.title, s.theme, s.description, s.rules,
       s.min_semester, s.max_semester, s.program_ids,
       s.starts_at, s.ends_at, s.status,
       s.created_at,
       u.username AS created_by_username,
       COUNT(DISTINCT ss.id) AS submission_count,
       COUNT(DISTINCT ss.submitted_by) AS participant_count,
       EXTRACT(EPOCH FROM (s.ends_at - NOW())) AS seconds_remaining,
       EXTRACT(EPOCH FROM (s.starts_at - NOW())) AS seconds_until_start
     FROM showdowns s
     LEFT JOIN users u ON u.id = s.created_by
     LEFT JOIN showdown_submissions ss ON ss.showdown_id = s.id
     WHERE s.deleted_at IS NULL
     GROUP BY s.id, u.username
     ORDER BY s.starts_at DESC`,
  );
  return result.rows;
};

const getShowdown = async (showdownId) => {
  const result = await query(
    `SELECT
       s.id, s.title, s.theme, s.description, s.rules,
       s.min_semester, s.max_semester, s.program_ids,
       s.starts_at, s.ends_at, s.status, s.winner_id,
       s.created_at,
       EXTRACT(EPOCH FROM (s.ends_at - NOW())) AS seconds_remaining,
       EXTRACT(EPOCH FROM (s.starts_at - NOW())) AS seconds_until_start
     FROM showdowns s
     WHERE s.id = $1 AND s.deleted_at IS NULL`,
    [showdownId]
  );
  if (!result.rows.length) return null;

  const submissions = await query(
    `SELECT
       ss.id, ss.title, ss.description, ss.github_url, ss.demo_url,
       ss.tech_stack, ss.hours_spent, ss.created_at,
       COALESCE(SUM(sv.weight), 0) AS votes,
       u.username, u.full_name, u.avatar_url,
       p.code AS program_code
     FROM showdown_submissions ss
     JOIN users u ON u.id = ss.submitted_by
     LEFT JOIN programs p ON p.id = u.program_id
     LEFT JOIN showdown_votes sv ON sv.submission_id = ss.id
     WHERE ss.showdown_id = $1
     GROUP BY ss.id, u.username, u.full_name, u.avatar_url, p.code
     ORDER BY votes DESC, ss.created_at ASC`,
    [showdownId]
  );

  return { ...result.rows[0], submissions: submissions.rows };
};

const createShowdown = async (userId, {
  title, theme, description, rules,
  minSemester, maxSemester, programIds,
  startsAt, endsAt,
}) => {
  const result = await query(
    `INSERT INTO showdowns
       (title, theme, description, rules, min_semester, max_semester,
        program_ids, starts_at, ends_at, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING *`,
    [title, theme, description || null, rules || null,
     minSemester || 1, maxSemester || 8,
     programIds || null, startsAt, endsAt, userId]
  );
  return result.rows[0];
};

const submitEntry = async (userId, showdownId, {
  title, description, githubUrl, demoUrl, techStack, hoursSpent,
}) => {
  // Check showdown is active
  const showdown = await query(
    `SELECT * FROM showdowns WHERE id = $1 AND status = 'active' AND deleted_at IS NULL`,
    [showdownId]
  );
  if (!showdown.rows.length) throw new Error('Showdown is not active.');

  // Check eligibility
  const user = await query(
    'SELECT current_semester, program_id FROM users WHERE id = $1',
    [userId]
  );
  const s = showdown.rows[0];
  const u = user.rows[0];
  if (u.current_semester < s.min_semester || u.current_semester > s.max_semester) {
    throw new Error(`This showdown is for Semester ${s.min_semester}–${s.max_semester} only.`);
  }

  // Upsert submission
  const result = await query(
    `INSERT INTO showdown_submissions
       (showdown_id, submitted_by, title, description, github_url, demo_url, tech_stack, hours_spent)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     ON CONFLICT (showdown_id, submitted_by)
     DO UPDATE SET
       title = EXCLUDED.title, description = EXCLUDED.description,
       github_url = EXCLUDED.github_url, demo_url = EXCLUDED.demo_url,
       tech_stack = EXCLUDED.tech_stack, hours_spent = EXCLUDED.hours_spent,
       updated_at = NOW()
     RETURNING *`,
    [showdownId, userId, title, description || null,
     githubUrl || null, demoUrl || null, techStack || [], hoursSpent || null]
  );

  return result.rows[0];
};

const voteSubmission = async (userId, userRole, submissionId) => {
  const sub = await query(
    `SELECT ss.*, s.status FROM showdown_submissions ss
     JOIN showdowns s ON s.id = ss.showdown_id
     WHERE ss.id = $1`,
    [submissionId]
  );
  if (!sub.rows.length) throw new Error('Submission not found.');
  if (sub.rows[0].submitted_by === userId) throw new Error('Cannot vote on your own submission.');
  if (sub.rows[0].status !== 'judging') throw new Error('Voting is not open yet.');

  const weight = userRole === 'faculty' || userRole === 'admin' ? 3 : 1;

  await query(
    `INSERT INTO showdown_votes (submission_id, voter_id, voter_role, weight)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT (submission_id, voter_id) DO NOTHING`,
    [submissionId, userId, userRole, weight]
  );

  const votes = await query(
    'SELECT COALESCE(SUM(weight),0) AS total FROM showdown_votes WHERE submission_id = $1',
    [submissionId]
  );
  return { votes: parseInt(votes.rows[0].total) };
};

const getRecentActivity = async (showdownId) => {
  const result = await query(
    `SELECT
       ss.submitted_by, ss.created_at, ss.title AS submission_title,
       u.username, u.full_name, u.avatar_url
     FROM showdown_submissions ss
     JOIN users u ON u.id = ss.submitted_by
     WHERE ss.showdown_id = $1
     ORDER BY ss.created_at DESC
     LIMIT 10`,
    [showdownId]
  );
  return result.rows;
};

const closeExpiredShowdowns = async () => {
  // Move active → judging when deadline passed
  const judging = await query(
    `UPDATE showdowns SET status = 'judging', updated_at = NOW()
     WHERE status = 'active' AND ends_at < NOW() AND deleted_at IS NULL
     RETURNING id, title`
  );

  // Move judging → closed after 48h of judging
  const closed = await query(
    `UPDATE showdowns SET status = 'closed', updated_at = NOW()
     WHERE status = 'judging'
       AND ends_at < NOW() - INTERVAL '48 hours'
       AND deleted_at IS NULL
     RETURNING id, title`
  );

  return { judging: judging.rows, closed: closed.rows };
};

module.exports = {
  getShowdowns, getShowdown, createShowdown,
  submitEntry, voteSubmission, getRecentActivity,
  closeExpiredShowdowns,
};