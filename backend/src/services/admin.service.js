const { query } = require('../config/database');

const getDashboardStats = async () => {
  const [
    usersResult,
    projectsResult,
    challengesResult,
    streaksResult,
    weeklyResult,
    pendingResult,
  ] = await Promise.all([
    query(`SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE status = 'active') AS active,
      COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') AS new_this_week
      FROM users WHERE deleted_at IS NULL`),
    query(`SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE status = 'approved') AS approved,
      COUNT(*) FILTER (WHERE status = 'pending_moderation') AS pending
      FROM projects WHERE deleted_at IS NULL`),
    query(`SELECT
      COUNT(*) AS total_challenges,
      COUNT(*) FILTER (WHERE completed_at >= NOW() - INTERVAL '7 days') AS completions_this_week
      FROM challenge_submissions`),
    query(`SELECT
      COUNT(*) FILTER (WHERE current_streak > 0) AS active_streaks,
      MAX(current_streak) AS top_streak
      FROM streaks`),
    query(`SELECT COUNT(*) AS feed_actions
      FROM activity_feed
      WHERE created_at >= NOW() - INTERVAL '7 days'`),
    query(`SELECT COUNT(*) AS pending
      FROM projects WHERE status = 'pending_moderation' AND deleted_at IS NULL`),
  ]);

  return {
    users: {
      total:       parseInt(usersResult.rows[0].total),
      active:      parseInt(usersResult.rows[0].active),
      newThisWeek: parseInt(usersResult.rows[0].new_this_week),
    },
    projects: {
      total:    parseInt(projectsResult.rows[0].total),
      approved: parseInt(projectsResult.rows[0].approved),
      pending:  parseInt(projectsResult.rows[0].pending),
    },
    challenges: {
      totalSubmissions:    parseInt(challengesResult.rows[0].total_challenges),
      completionsThisWeek: parseInt(challengesResult.rows[0].completions_this_week),
    },
    streaks: {
      active: parseInt(streaksResult.rows[0].active_streaks),
      top:    parseInt(streaksResult.rows[0].top_streak) || 0,
    },
    feed: {
      actionsThisWeek: parseInt(weeklyResult.rows[0].feed_actions),
    },
    pendingModeration: parseInt(pendingResult.rows[0].pending),
  };
};

const getAllUsers = async ({ page = 1, limit = 20, search, role, status }) => {
  const offset     = (page - 1) * limit;
  const conditions = ['u.deleted_at IS NULL'];
  const params     = [];
  let   paramCount = 1;

  if (search) {
    conditions.push(`(u.full_name ILIKE $${paramCount} OR u.username ILIKE $${paramCount} OR u.email ILIKE $${paramCount})`);
    params.push(`%${search}%`);
    paramCount++;
  }
  if (role) {
    conditions.push(`u.role = $${paramCount}`);
    params.push(role);
    paramCount++;
  }
  if (status) {
    conditions.push(`u.status = $${paramCount}`);
    params.push(status);
    paramCount++;
  }

  const whereClause = 'WHERE ' + conditions.join(' AND ');

  const countResult = await query(
    `SELECT COUNT(*) FROM users u ${whereClause}`,
    params
  );

  const result = await query(
    `SELECT u.id, u.email, u.username, u.full_name, u.role, u.status, u.avatar_url,
            u.created_at, u.last_login_at, u.current_semester,
            p.code AS program_code
     FROM users u
     LEFT JOIN programs p ON p.id = u.program_id
     ${whereClause}
     ORDER BY u.created_at DESC
     LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
    [...params, limit, offset]
  );

  return {
    users: result.rows,
    pagination: {
      total: parseInt(countResult.rows[0].count),
      page, limit,
      pages: Math.ceil(countResult.rows[0].count / limit),
    },
  };
};

const updateUserRole = async (userId, role) => {
  const valid = ['student', 'faculty', 'admin'];
  if (!valid.includes(role)) throw new Error('Invalid role.');
  const result = await query(
    'UPDATE users SET role = $1 WHERE id = $2 AND deleted_at IS NULL RETURNING id, username, role',
    [role, userId]
  );
  if (!result.rows.length) throw new Error('User not found.');
  return result.rows[0];
};

const updateUserStatus = async (userId, status) => {
  const valid = ['active', 'suspended', 'pending_verification'];
  if (!valid.includes(status)) throw new Error('Invalid status.');
  const result = await query(
    'UPDATE users SET status = $1 WHERE id = $2 AND deleted_at IS NULL RETURNING id, username, status',
    [status, userId]
  );
  if (!result.rows.length) throw new Error('User not found.');
  return result.rows[0];
};

const getPendingProjects = async () => {
  const result = await query(
    `SELECT p.id, p.title, p.description, p.semester, p.github_url, p.created_at,
            u.username, u.full_name, u.avatar_url,
            pr.code AS program_code,
            ARRAY_AGG(DISTINCT tt.label) FILTER (WHERE tt.label IS NOT NULL) AS tech_tags
     FROM projects p
     JOIN users u     ON u.id  = p.submitted_by
     JOIN programs pr ON pr.id = p.program_id
     LEFT JOIN project_tags pt ON pt.project_id = p.id
     LEFT JOIN tech_tags tt    ON tt.id         = pt.tag_id
     WHERE p.status = 'pending_moderation' AND p.deleted_at IS NULL
     GROUP BY p.id, u.username, u.full_name, u.avatar_url, pr.code
     ORDER BY p.created_at ASC`
  );
  return result.rows;
};

const getRecentChallenges = async () => {
  const result = await query(
    `SELECT c.id, c.title, c.day_type, c.level, c.publish_date,
            COUNT(cs.id) AS submissions
     FROM challenges c
     LEFT JOIN challenge_submissions cs ON cs.challenge_id = c.id
     WHERE c.deleted_at IS NULL
     GROUP BY c.id
     ORDER BY c.publish_date DESC
     LIMIT 10`
  );
  return result.rows;
};

module.exports = {
  getDashboardStats,
  getAllUsers,
  updateUserRole,
  updateUserStatus,
  getPendingProjects,
  getRecentChallenges,
};