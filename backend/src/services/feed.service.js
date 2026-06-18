const { query } = require('../config/database');
const { safeRedis: redis, keys } = require('../config/redis');

const getFeed = async ({ page = 1, limit = 20 }) => {
  const offset = (page - 1) * limit;

  // Try cache first (only for page 1)
  if (page === 1) {
    const cached = await redis.get(keys.feedCache());
    if (cached) return JSON.parse(cached);
  }

  const result = await query(
    `SELECT
       af.id, af.action, af.created_at, af.extra,
       -- Actor
       u.username     AS actor_username,
       u.full_name    AS actor_name,
       u.avatar_url   AS actor_avatar,
       u.role         AS actor_role,
       -- Project (if any)
       p.id           AS project_id,
       p.title        AS project_title,
       -- Target user (if any)
       tu.username    AS target_username,
       tu.full_name   AS target_name,
       -- Challenge (if any)
       c.title        AS challenge_title,
       c.day_type     AS challenge_type
     FROM activity_feed af
     JOIN users u               ON u.id  = af.actor_id
     LEFT JOIN projects p       ON p.id  = af.project_id
     LEFT JOIN users tu         ON tu.id = af.user_id
     LEFT JOIN challenges c     ON c.id  = af.challenge_id
     WHERE af.is_public = TRUE
     ORDER BY af.created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );

  const countResult = await query(
    'SELECT COUNT(*) FROM activity_feed WHERE is_public = TRUE'
  );

  const response = {
    feed: result.rows.map(formatFeedItem),
    pagination: {
      total: parseInt(countResult.rows[0].count),
      page,
      limit,
      pages: Math.ceil(countResult.rows[0].count / limit),
    },
  };

  // Cache page 1 for 60 seconds
  if (page === 1) {
    await redis.setex(keys.feedCache(), keys.feedCacheTTL, JSON.stringify(response));
  }

  return response;
};

const getUserFeed = async (username, { page = 1, limit = 20 }) => {
  const offset = (page - 1) * limit;

  const userResult = await query(
    'SELECT id FROM users WHERE username = $1 AND deleted_at IS NULL',
    [username.toLowerCase()]
  );

  if (!userResult.rows.length) return { feed: [], pagination: { total: 0, page, limit, pages: 0 } };

  const userId = userResult.rows[0].id;

  const result = await query(
    `SELECT
       af.id, af.action, af.created_at, af.extra,
       u.username     AS actor_username,
       u.full_name    AS actor_name,
       u.avatar_url   AS actor_avatar,
       u.role         AS actor_role,
       p.id           AS project_id,
       p.title        AS project_title,
       tu.username    AS target_username,
       tu.full_name   AS target_name,
       c.title        AS challenge_title,
       c.day_type     AS challenge_type
     FROM activity_feed af
     JOIN users u               ON u.id  = af.actor_id
     LEFT JOIN projects p       ON p.id  = af.project_id
     LEFT JOIN users tu         ON tu.id = af.user_id
     LEFT JOIN challenges c     ON c.id  = af.challenge_id
     WHERE af.actor_id = $1
     ORDER BY af.created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );

  const countResult = await query(
    'SELECT COUNT(*) FROM activity_feed WHERE actor_id = $1',
    [userId]
  );

  return {
    feed: result.rows.map(formatFeedItem),
    pagination: {
      total: parseInt(countResult.rows[0].count),
      page,
      limit,
      pages: Math.ceil(countResult.rows[0].count / limit),
    },
  };
};

// Push a new feed item to all connected Socket.io clients
const broadcastFeedItem = async (io, feedItem) => {
  // Invalidate feed cache
  await redis.del(keys.feedCache());

  // Emit to all clients in the public feed room
  if (io) {
    io.to('feed:public').emit('feed:new_item', formatFeedItem(feedItem));
  }
};

// Format a raw DB row into a clean feed item
const formatFeedItem = (row) => {
  const messages = {
    project_submitted:  `${row.actor_name} submitted a new project`,
    project_approved:   `${row.actor_name}'s project was approved`,
    project_voted:      `${row.actor_name} voted on ${row.target_name || 'a'}'s project`,
    challenge_completed:`${row.actor_name} completed today's challenge`,
    streak_milestone:   `${row.actor_name} reached a streak milestone`,
    badge_earned:       `${row.actor_name} earned a badge`,
    idea_posted:        `${row.actor_name} posted a new idea`,
    idea_shipped:       `${row.actor_name} shipped an idea`,
    idea_abandoned:     `${row.actor_name} abandoned an idea`,
    pair_formed:        `${row.actor_name} was matched with an accountability partner`,
    pair_checkin:       `${row.actor_name} submitted their weekly check-in`,
    showcase_winner:    `${row.actor_name} won a showcase category`,
    user_registered:    `${row.actor_name} joined BuildIMS`,
    mentorship_started: `${row.actor_name} started mentoring`,
  };

  return {
    id:          row.id,
    action:      row.action,
    message:     messages[row.action] || row.action,
    createdAt:   row.created_at,
    extra:       row.extra,
    actor: {
      username:  row.actor_username,
      name:      row.actor_name,
      avatar:    row.actor_avatar,
      role:      row.actor_role,
    },
    project: row.project_id ? {
      id:    row.project_id,
      title: row.project_title,
    } : null,
    target: row.target_username ? {
      username: row.target_username,
      name:     row.target_name,
    } : null,
    challenge: row.challenge_title ? {
      title: row.challenge_title,
      type:  row.challenge_type,
    } : null,
  };
};

module.exports = { getFeed, getUserFeed, broadcastFeedItem };