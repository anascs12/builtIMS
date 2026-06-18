const { query, withTransaction } = require('../config/database');
const { safeRedis: redis } = require('../config/redis');
const ApiError   = require('../utils/ApiError');

// PKT is UTC+5 — use this everywhere for date calculations
const getPKTDate = (offsetDays = 0) => {
  const offset = 5 * 60 * 60 * 1000;
  return new Date(Date.now() + offset - (offsetDays * 86400000))
    .toISOString().split('T')[0];
};

const getTodayChallenge = async (userSemester) => {
  const today = getPKTDate();

  let result;
  if (userSemester) {
    result = await query(
      `SELECT id, title, description, day_type, level, min_semester,
              max_semester, publish_date, content, tech_tags
       FROM challenges
       WHERE publish_date = $1
         AND min_semester <= $2
         AND max_semester >= $2
         AND deleted_at IS NULL
       LIMIT 1`,
      [today, userSemester]
    );
  }

  if (!result || !result.rows.length) {
    result = await query(
      `SELECT id, title, description, day_type, level, min_semester,
              max_semester, publish_date, content, tech_tags
       FROM challenges
       WHERE publish_date = $1 AND deleted_at IS NULL
       LIMIT 1`,
      [today]
    );
  }

  if (!result.rows.length) return null;

  const challenge = result.rows[0];
  const countKey  = `challenge:count:${challenge.id}`;
  const count     = await redis.get(countKey);

  return {
    ...challenge,
    completionCount: parseInt(count || '0'),
  };
};

const getChallenges = async ({ page = 1, limit = 20, level, dayType }) => {
  const offset     = (page - 1) * limit;
  const conditions = ['deleted_at IS NULL'];
  const params     = [];
  let   paramCount = 1;

  if (level) {
    conditions.push(`level = $${paramCount}`);
    params.push(level);
    paramCount++;
  }

  if (dayType) {
    conditions.push(`day_type = $${paramCount}`);
    params.push(dayType);
    paramCount++;
  }

  const whereClause = 'WHERE ' + conditions.join(' AND ');

  const countResult = await query(
    `SELECT COUNT(*) FROM challenges ${whereClause}`, params
  );

  const result = await query(
    `SELECT id, title, description, day_type, level, min_semester,
            max_semester, publish_date, created_at
     FROM challenges
     ${whereClause}
     ORDER BY publish_date DESC
     LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
    [...params, limit, offset]
  );

  return {
    challenges: result.rows,
    pagination: {
      total: parseInt(countResult.rows[0].count),
      page, limit,
      pages: Math.ceil(countResult.rows[0].count / limit),
    },
  };
};

const getChallengeById = async (challengeId) => {
  const result = await query(
    `SELECT id, title, description, day_type, level, min_semester,
            max_semester, publish_date, content, tech_tags, created_at
     FROM challenges
     WHERE id = $1 AND deleted_at IS NULL`,
    [challengeId]
  );

  if (!result.rows.length) throw ApiError.notFound('Challenge not found.');

  const challenge = result.rows[0];
  const countKey  = `challenge:count:${challenge.id}`;
  const count     = await redis.get(countKey);

  return { ...challenge, completionCount: parseInt(count || '0') };
};

const createChallenge = async (creatorId, { title, description, dayType, level, minSemester, maxSemester, publishDate, content, techTags }) => {
  const result = await query(
    `INSERT INTO challenges
       (title, description, day_type, level, min_semester, max_semester,
        publish_date, content, tech_tags, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING *`,
    [title, description, dayType, level, minSemester || 1, maxSemester || 8,
     publishDate, content || {}, techTags || [], creatorId]
  );

  return result.rows[0];
};

const submitChallenge = async (challengeId, userId, { submissionType, content, notes }) => {
  return withTransaction(async (client) => {
    // Check challenge exists
    const challengeResult = await client.query(
      `SELECT id, publish_date FROM challenges WHERE id = $1 AND deleted_at IS NULL`,
      [challengeId]
    );

    if (!challengeResult.rows.length) throw ApiError.notFound('Challenge not found.');

    const challenge = challengeResult.rows[0];

    // Compare dates in PKT
    const todayPKT = getPKTDate();

    // publish_date comes from DB as a Date object — extract YYYY-MM-DD
    // Use toLocaleDateString to avoid UTC conversion stripping a day
        const pd = challenge.publish_date;
        const publishDate = pd instanceof Date
        ? `${pd.getFullYear()}-${String(pd.getMonth()+1).padStart(2,'0')}-${String(pd.getDate()).padStart(2,'0')}`
        : String(pd).split('T')[0];

    if (publishDate !== todayPKT) {
      throw ApiError.badRequest(
        `You can only submit today's challenge. Today: ${todayPKT}, Challenge date: ${publishDate}`,
        null, 'WRONG_DATE'
      );
    }

    // Check already submitted
    const existing = await client.query(
      'SELECT id FROM challenge_submissions WHERE challenge_id = $1 AND user_id = $2',
      [challengeId, userId]
    );

    if (existing.rows.length) {
      throw ApiError.conflict('You have already submitted this challenge.', 'ALREADY_SUBMITTED');
    }

    // Insert submission
    await client.query(
      `INSERT INTO challenge_submissions
         (challenge_id, user_id, submission_type, content, notes)
       VALUES ($1,$2,$3,$4,$5)`,
      [challengeId, userId, submissionType, content || null, notes || null]
    );

    // Update streak
    const streakResult = await client.query(
      'SELECT current_streak, longest_streak, last_completed_on, streak_started_on FROM streaks WHERE user_id = $1',
      [userId]
    );

    const streak    = streakResult.rows[0];
    const todayDate = getPKTDate();
    const yesterday = getPKTDate(1);

    const lastDone = streak?.last_completed_on
      ? (streak.last_completed_on instanceof Date
          ? streak.last_completed_on.toISOString().split('T')[0]
          : String(streak.last_completed_on).split('T')[0])
      : null;

    let newStreak     = 1;
    let streakStarted = todayDate;

    if (lastDone === yesterday) {
      newStreak     = (streak.current_streak || 0) + 1;
      streakStarted = streak.streak_started_on;
    } else if (lastDone === todayDate) {
      newStreak     = streak.current_streak;
      streakStarted = streak.streak_started_on;
    }

    const newLongest = Math.max(newStreak, streak?.longest_streak || 0);

    await client.query(
      `UPDATE streaks
       SET current_streak    = $1,
           longest_streak    = $2,
           last_completed_on = $3,
           streak_started_on = $4,
           total_completions = total_completions + 1
       WHERE user_id = $5`,
      [newStreak, newLongest, todayDate, streakStarted, userId]
    );

    // Increment Redis completion counter
    const countKey = `challenge:count:${challengeId}`;
    await redis.incr(countKey);
    await redis.expire(countKey, 48 * 60 * 60);

    // Add to activity feed
    await client.query(
      `INSERT INTO activity_feed (actor_id, action, challenge_id, extra)
       VALUES ($1, 'challenge_completed', $2, $3)`,
      [userId, challengeId, JSON.stringify({ streak: newStreak })]
    );

    // Check and award streak badges
    const badgesToCheck = [
      { slug: 'bronze-builder', threshold: 7   },
      { slug: 'silver-builder', threshold: 30  },
      { slug: 'gold-builder',   threshold: 100 },
    ];

    for (const { slug, threshold } of badgesToCheck) {
      if (newStreak === threshold) {
        const badgeResult = await client.query(
          'SELECT id FROM badges WHERE slug = $1', [slug]
        );
        if (badgeResult.rows.length) {
          await client.query(
            `INSERT INTO user_badges (user_id, badge_id, context)
             VALUES ($1, $2, $3)
             ON CONFLICT DO NOTHING`,
            [userId, badgeResult.rows[0].id, JSON.stringify({ streak: newStreak })]
          );
          await client.query(
            `INSERT INTO activity_feed (actor_id, action, extra)
             VALUES ($1, 'badge_earned', $2)`,
            [userId, JSON.stringify({ badge: slug, streak: newStreak })]
          );
        }
      }
    }

    // Refresh portfolio stats
    await client.query('REFRESH MATERIALIZED VIEW CONCURRENTLY user_portfolio_stats');

    return {
      message:     'Challenge submitted successfully.',
      streak:      newStreak,
      longest:     newLongest,
      badgeEarned: badgesToCheck.find(b => b.threshold === newStreak)?.slug || null,
    };
  });
};

const getCompletionCount = async (challengeId) => {
  const countKey = `challenge:count:${challengeId}`;
  const count    = await redis.get(countKey);

  if (!count) {
    const result = await query(
      'SELECT COUNT(*) FROM challenge_submissions WHERE challenge_id = $1',
      [challengeId]
    );
    const dbCount = parseInt(result.rows[0].count);
    if (dbCount > 0) await redis.setex(countKey, 48 * 60 * 60, dbCount.toString());
    return dbCount;
  }

  return parseInt(count);
};

module.exports = {
  getTodayChallenge,
  getChallenges,
  getChallengeById,
  createChallenge,
  submitChallenge,
  getCompletionCount,
};