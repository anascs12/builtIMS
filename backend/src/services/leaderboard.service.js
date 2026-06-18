const { query } = require('../config/database');
const { safeRedis: redis } = require('../config/redis');

const CACHE_TTL = 60; // 60 seconds

const getStreakLeaderboard = async () => {
  const cacheKey = 'lb:streaks';
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const result = await query(
    `SELECT
       u.username, u.full_name, u.avatar_url,
       p.code AS program_code,
       s.current_streak, s.longest_streak, s.total_completions
     FROM streaks s
     JOIN users u    ON u.id  = s.user_id
     LEFT JOIN programs p ON p.id = u.program_id
     WHERE s.current_streak > 0
       AND u.deleted_at IS NULL
       AND u.status = 'active'
     ORDER BY s.current_streak DESC, s.longest_streak DESC
     LIMIT 10`
  );

  const data = result.rows;
  await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(data));
  return data;
};

const getProjectLeaderboard = async (showcaseId) => {
  const cacheKey = `lb:projects:${showcaseId || 'all'}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const conditions = ["p.status IN ('approved', 'archived')", 'p.deleted_at IS NULL'];
  const params = [];

  if (showcaseId) {
    conditions.push(`p.showcase_id = $1`);
    params.push(showcaseId);
  }

  const whereClause = 'WHERE ' + conditions.join(' AND ');

  const result = await query(
    `SELECT
       p.id, p.title, p.semester, p.created_at,
       u.username, u.full_name, u.avatar_url,
       pr.code AS program_code,
       COALESCE(pvt.weighted_votes, 0) AS weighted_votes,
       COALESCE(pvt.raw_vote_count, 0) AS raw_vote_count,
       pvt.showcase_rank,
       ARRAY_AGG(DISTINCT tt.label) FILTER (WHERE tt.label IS NOT NULL) AS tech_tags
     FROM projects p
     JOIN users u                      ON u.id  = p.submitted_by
     JOIN programs pr                  ON pr.id = p.program_id
     LEFT JOIN project_vote_totals pvt ON pvt.project_id = p.id
     LEFT JOIN project_tags pt         ON pt.project_id  = p.id
     LEFT JOIN tech_tags tt            ON tt.id          = pt.tag_id
     ${whereClause}
     GROUP BY p.id, u.username, u.full_name, u.avatar_url,
              pr.code, pvt.weighted_votes, pvt.raw_vote_count, pvt.showcase_rank
     ORDER BY weighted_votes DESC, p.created_at DESC
     LIMIT 10`,
    params
  );

  const data = result.rows;
  await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(data));
  return data;
};

const getProgramLeaderboard = async () => {
  const cacheKey = 'lb:programs';
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const result = await query(
    `SELECT
       p.code AS program_code,
       p.name AS program_name,
       COUNT(DISTINCT u.id)                          AS total_students,
       COALESCE(SUM(ups.total_challenges_completed), 0) AS total_challenges,
       COALESCE(SUM(ups.projects_submitted), 0)         AS total_projects,
       COALESCE(SUM(ups.total_votes_received), 0)       AS total_votes,
       COALESCE(AVG(ups.current_streak), 0)             AS avg_streak,
       -- Composite score: challenges * 1 + projects * 5 + votes * 2
       COALESCE(
         SUM(ups.total_challenges_completed) * 1 +
         SUM(ups.projects_submitted) * 5 +
         SUM(ups.total_votes_received) * 2,
         0
       ) AS score
     FROM programs p
     LEFT JOIN users u               ON u.program_id = p.id
       AND u.deleted_at IS NULL AND u.status = 'active'
     LEFT JOIN user_portfolio_stats ups ON ups.user_id = u.id
     WHERE p.is_active = TRUE
     GROUP BY p.id, p.code, p.name
     ORDER BY score DESC`
  );

  const data = result.rows;
  await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(data));
  return data;
};

const getUserLeaderboard = async () => {
  const cacheKey = 'lb:users';
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const result = await query(
    `SELECT
       u.username, u.full_name, u.avatar_url,
       p.code AS program_code,
       u.current_semester,
       ups.total_challenges_completed,
       ups.projects_submitted,
       ups.total_votes_received,
       ups.total_badges,
       ups.current_streak,
       ups.longest_streak,
       -- Composite score
       (ups.total_challenges_completed * 1 +
        ups.projects_submitted * 5 +
        ups.total_votes_received * 2 +
        ups.total_badges * 10 +
        ups.current_streak * 3) AS score
     FROM user_portfolio_stats ups
     JOIN users u    ON u.id  = ups.user_id
     LEFT JOIN programs p ON p.id = u.program_id
     WHERE u.deleted_at IS NULL AND u.status = 'active'
     ORDER BY score DESC
     LIMIT 10`
  );

  const data = result.rows;
  await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(data));
  return data;
};

const getHallOfFame = async () => {
  const cacheKey = 'lb:hall_of_fame';
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const result = await query(
    `SELECT
       p.id, p.title, p.description, p.semester, p.created_at,
       u.username, u.full_name, u.avatar_url,
       pr.code AS program_code,
       COALESCE(pvt.weighted_votes, 0) AS weighted_votes,
       COALESCE(pvt.raw_vote_count,  0) AS raw_vote_count,
       ARRAY_AGG(DISTINCT tt.label) FILTER (WHERE tt.label IS NOT NULL) AS tech_tags
     FROM projects p
     JOIN users u                      ON u.id  = p.submitted_by
     JOIN programs pr                  ON pr.id = p.program_id
     LEFT JOIN project_vote_totals pvt ON pvt.project_id = p.id
     LEFT JOIN project_tags pt         ON pt.project_id  = p.id
     LEFT JOIN tech_tags tt            ON tt.id          = pt.tag_id
     WHERE p.status IN ('approved', 'archived')
       AND p.deleted_at IS NULL
     GROUP BY p.id, u.username, u.full_name, u.avatar_url,
              pr.code, pvt.weighted_votes, pvt.raw_vote_count
     ORDER BY weighted_votes DESC
     LIMIT 10`
  );

  const data = result.rows;
  await redis.setex(cacheKey, 5 * 60, JSON.stringify(data)); // Cache 5 mins
  return data;
};

module.exports = {
  getStreakLeaderboard,
  getProjectLeaderboard,
  getProgramLeaderboard,
  getUserLeaderboard,
  getHallOfFame,
};