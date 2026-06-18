const { query } = require('../config/database');
const ApiError  = require('../utils/ApiError');

// Default avatars built into the platform
const DEFAULT_AVATARS = [
  'avatar_01.png', 'avatar_02.png', 'avatar_03.png', 'avatar_04.png',
  'avatar_05.png', 'avatar_06.png', 'avatar_07.png', 'avatar_08.png',
];

const getPublicProfile = async (username) => {
  // Get user info
  const userResult = await query(
    `SELECT u.id, u.username, u.full_name, u.bio, u.avatar_url,
            u.github_username, u.linkedin_url, u.role,
            u.current_semester, u.created_at,
            p.code AS program_code, p.name AS program_name,
            ci.label AS career_interest
     FROM users u
     LEFT JOIN programs p          ON p.id  = u.program_id
     LEFT JOIN career_interests ci ON ci.id = u.career_interest_id
     WHERE u.username = $1
       AND u.deleted_at IS NULL
       AND u.status = 'active'`,
    [username.toLowerCase()]
  );

  if (!userResult.rows.length) throw ApiError.notFound('User not found.');
  const user = userResult.rows[0];

  // Get portfolio stats
  const statsResult = await query(
    `SELECT total_challenges_completed, code_challenges, design_challenges,
            debug_challenges, explain_challenges, build_challenges,
            projects_submitted, total_votes_received, total_badges,
            ideas_shipped, ideas_abandoned, current_streak, longest_streak
     FROM user_portfolio_stats
     WHERE user_id = $1`,
    [user.id]
  );

  const stats = statsResult.rows[0] || {
    total_challenges_completed: 0, code_challenges: 0, design_challenges: 0,
    debug_challenges: 0, explain_challenges: 0, build_challenges: 0,
    projects_submitted: 0, total_votes_received: 0, total_badges: 0,
    ideas_shipped: 0, ideas_abandoned: 0, current_streak: 0, longest_streak: 0,
  };

  // Get badges
  const badgesResult = await query(
    `SELECT b.slug, b.name, b.description, b.category, b.icon_url, ub.awarded_at
     FROM user_badges ub
     JOIN badges b ON b.id = ub.badge_id
     WHERE ub.user_id = $1
     ORDER BY ub.awarded_at DESC`,
    [user.id]
  );

  // Get recent projects
  const projectsResult = await query(
    `SELECT p.id, p.title, p.description, p.github_url, p.demo_url,
            p.semester, p.created_at,
            COALESCE(pvt.weighted_votes, 0) AS votes,
            ARRAY_AGG(DISTINCT tt.label) FILTER (WHERE tt.label IS NOT NULL) AS tech_tags
     FROM projects p
     LEFT JOIN project_vote_totals pvt ON pvt.project_id = p.id
     LEFT JOIN project_tags pt         ON pt.project_id  = p.id
     LEFT JOIN tech_tags tt            ON tt.id          = pt.tag_id
     WHERE p.submitted_by = $1
       AND p.status IN ('approved', 'archived')
       AND p.deleted_at IS NULL
     GROUP BY p.id, pvt.weighted_votes
     ORDER BY p.created_at DESC
     LIMIT 10`,
    [user.id]
  );

  return {
    user,
    stats,
    badges:   badgesResult.rows,
    projects: projectsResult.rows,
  };
};

const updateProfile = async (userId, { fullName, bio, currentSemester, careerInterestId, githubUsername, linkedinUrl }) => {
  const result = await query(
    `UPDATE users
     SET full_name          = COALESCE($1, full_name),
         bio                = COALESCE($2, bio),
         current_semester   = COALESCE($3, current_semester),
         career_interest_id = COALESCE($4, career_interest_id),
         github_username    = COALESCE($5, github_username),
         linkedin_url       = COALESCE($6, linkedin_url)
     WHERE id = $7 AND deleted_at IS NULL
     RETURNING id, username, full_name, bio, current_semester,
               career_interest_id, github_username, linkedin_url, avatar_url`,
    [fullName, bio, currentSemester, careerInterestId, githubUsername, linkedinUrl, userId]
  );

  if (!result.rows.length) throw ApiError.notFound('User not found.');
  return result.rows[0];
};

const setAvatar = async (userId, avatarFilename) => {
  if (!DEFAULT_AVATARS.includes(avatarFilename)) {
    throw ApiError.badRequest('Invalid avatar selection.', null, 'INVALID_AVATAR');
  }

  // Store the index as a special avatar identifier
  const index  = DEFAULT_AVATARS.indexOf(avatarFilename);
  const result = await query(
    `UPDATE users SET avatar_url = $1 WHERE id = $2 RETURNING avatar_url`,
    [`/avatars/default/${index}`, userId]
  );

  return result.rows[0];
};

const getDefaultAvatars = () => {
  return DEFAULT_AVATARS.map((filename) => ({
    filename,
    url: `/avatars/defaults/${filename}`,
  }));
};

module.exports = { getPublicProfile, updateProfile, setAvatar, getDefaultAvatars };