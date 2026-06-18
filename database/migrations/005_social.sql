CREATE TYPE feed_action AS ENUM (
  'project_submitted','project_approved','project_voted',
  'challenge_completed','streak_milestone',
  'badge_earned','idea_posted','idea_shipped','idea_abandoned',
  'pair_formed','pair_checkin','showcase_winner',
  'user_registered','mentorship_started'
);

CREATE TABLE activity_feed (
  id           BIGSERIAL   PRIMARY KEY,
  actor_id     UUID        NOT NULL REFERENCES users(id),
  action       feed_action NOT NULL,
  project_id   UUID        REFERENCES projects(id) ON DELETE SET NULL,
  user_id      UUID        REFERENCES users(id),
  challenge_id UUID        REFERENCES challenges(id),
  extra        JSONB,
  is_public    BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_feed_created ON activity_feed (created_at DESC);
CREATE INDEX idx_feed_actor   ON activity_feed (actor_id, created_at DESC);
CREATE INDEX idx_feed_public  ON activity_feed (is_public, created_at DESC) WHERE is_public = TRUE;

CREATE TYPE notification_type AS ENUM (
  'vote_received','project_approved','project_rejected',
  'badge_earned','challenge_reminder','streak_at_risk',
  'pair_matched','pair_checkin_reminder','idea_expiring',
  'collaboration_request','mention','system'
);

CREATE TABLE notifications (
  id         UUID              PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID              NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       notification_type NOT NULL,
  title      TEXT              NOT NULL,
  body       TEXT,
  link       TEXT,
  read_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notif_user_unread ON notifications (user_id, created_at DESC) WHERE read_at IS NULL;

CREATE TYPE idea_status AS ENUM ('active','shipped','abandoned','cancelled');

CREATE TABLE ideas (
  id                   UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id              UUID        NOT NULL REFERENCES users(id),
  title                TEXT        NOT NULL CHECK (char_length(title) BETWEEN 5 AND 120),
  description          TEXT        NOT NULL CHECK (char_length(description) >= 50),
  tech_tags            INTEGER[]   DEFAULT '{}',
  status               idea_status NOT NULL DEFAULT 'active',
  deadline_at          TIMESTAMPTZ NOT NULL,
  proof_url            TEXT,
  proof_note           TEXT,
  proof_submitted_at   TIMESTAMPTZ,
  deleted_at           TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

SELECT attach_updated_at_trigger('ideas');
CREATE INDEX idx_ideas_user   ON ideas (user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_ideas_status ON ideas (status, deadline_at) WHERE deleted_at IS NULL;

CREATE TYPE collab_status AS ENUM ('requested','accepted','declined');

CREATE TABLE idea_collaborators (
  id         UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  idea_id    UUID          NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  user_id    UUID          NOT NULL REFERENCES users(id),
  status     collab_status NOT NULL DEFAULT 'requested',
  message    TEXT,
  created_at TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE (idea_id, user_id)
);

SELECT attach_updated_at_trigger('idea_collaborators');

CREATE TYPE pair_status AS ENUM ('active','completed','dissolved');

CREATE TABLE accountability_pairs (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_a     UUID        NOT NULL REFERENCES users(id),
  user_b     UUID        NOT NULL REFERENCES users(id),
  week_start DATE        NOT NULL,
  goal_text  TEXT,
  status     pair_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_a, user_b, week_start),
  CHECK (user_a <> user_b)
);

SELECT attach_updated_at_trigger('accountability_pairs');
CREATE INDEX idx_pairs_user_a ON accountability_pairs (user_a, week_start);
CREATE INDEX idx_pairs_user_b ON accountability_pairs (user_b, week_start);

CREATE TABLE pair_checkins (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  pair_id      UUID        NOT NULL REFERENCES accountability_pairs(id) ON DELETE CASCADE,
  user_id      UUID        NOT NULL REFERENCES users(id),
  summary      TEXT        NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (pair_id, user_id)
);

CREATE INDEX idx_checkins_pair ON pair_checkins (pair_id);