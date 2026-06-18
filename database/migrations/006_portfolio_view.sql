CREATE MATERIALIZED VIEW user_portfolio_stats AS
WITH
challenge_stats AS (
  SELECT
    cs.user_id,
    COUNT(*)                                        AS total_challenges_completed,
    COUNT(*) FILTER (WHERE c.day_type = 'code')     AS code_challenges,
    COUNT(*) FILTER (WHERE c.day_type = 'design')   AS design_challenges,
    COUNT(*) FILTER (WHERE c.day_type = 'debug')    AS debug_challenges,
    COUNT(*) FILTER (WHERE c.day_type = 'explain')  AS explain_challenges,
    COUNT(*) FILTER (WHERE c.day_type = 'build')    AS build_challenges
  FROM challenge_submissions cs
  JOIN challenges c ON c.id = cs.challenge_id
  GROUP BY cs.user_id
),
vote_stats AS (
  SELECT
    p.submitted_by                                  AS user_id,
    COALESCE(SUM(v.weight), 0)                      AS total_votes_received,
    COUNT(DISTINCT p.id)                            AS projects_submitted
  FROM projects p
  LEFT JOIN project_votes v ON v.project_id = p.id
  WHERE p.status IN ('approved','archived')
    AND p.deleted_at IS NULL
  GROUP BY p.submitted_by
),
badge_stats AS (
  SELECT user_id, COUNT(*) AS total_badges
  FROM user_badges
  GROUP BY user_id
),
idea_stats AS (
  SELECT
    user_id,
    COUNT(*) FILTER (WHERE status = 'shipped')   AS ideas_shipped,
    COUNT(*) FILTER (WHERE status = 'abandoned') AS ideas_abandoned
  FROM ideas
  WHERE deleted_at IS NULL
  GROUP BY user_id
)
SELECT
  u.id                                              AS user_id,
  u.username,
  u.full_name,
  u.program_id,
  u.current_semester,
  COALESCE(ch.total_challenges_completed, 0)        AS total_challenges_completed,
  COALESCE(ch.code_challenges,    0)                AS code_challenges,
  COALESCE(ch.design_challenges,  0)                AS design_challenges,
  COALESCE(ch.debug_challenges,   0)                AS debug_challenges,
  COALESCE(ch.explain_challenges, 0)                AS explain_challenges,
  COALESCE(ch.build_challenges,   0)                AS build_challenges,
  COALESCE(vs.projects_submitted, 0)                AS projects_submitted,
  COALESCE(vs.total_votes_received, 0)              AS total_votes_received,
  COALESCE(bs.total_badges,       0)                AS total_badges,
  COALESCE(is_.ideas_shipped,     0)                AS ideas_shipped,
  COALESCE(is_.ideas_abandoned,   0)                AS ideas_abandoned,
  COALESCE(s.current_streak,      0)                AS current_streak,
  COALESCE(s.longest_streak,      0)                AS longest_streak,
  NOW()                                             AS last_refreshed
FROM users u
LEFT JOIN challenge_stats ch  ON ch.user_id  = u.id
LEFT JOIN vote_stats      vs  ON vs.user_id  = u.id
LEFT JOIN badge_stats     bs  ON bs.user_id  = u.id
LEFT JOIN idea_stats      is_ ON is_.user_id = u.id
LEFT JOIN streaks         s   ON s.user_id   = u.id
WHERE u.deleted_at IS NULL
  AND u.role = 'student'
WITH DATA;

CREATE UNIQUE INDEX ON user_portfolio_stats (user_id);
CREATE INDEX ON user_portfolio_stats (total_votes_received DESC);
CREATE INDEX ON user_portfolio_stats (current_streak DESC);
CREATE INDEX ON user_portfolio_stats (total_challenges_completed DESC);