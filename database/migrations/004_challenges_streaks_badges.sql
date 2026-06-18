CREATE TYPE challenge_day_type AS ENUM ('code','design','debug','explain','build');
CREATE TYPE challenge_level    AS ENUM ('beginner','intermediate','advanced','expert');

CREATE TABLE challenges (
  id           UUID               PRIMARY KEY DEFAULT uuid_generate_v4(),
  title        TEXT               NOT NULL,
  description  TEXT               NOT NULL,
  day_type     challenge_day_type NOT NULL,
  level        challenge_level    NOT NULL,
  min_semester SMALLINT           NOT NULL DEFAULT 1,
  max_semester SMALLINT           NOT NULL DEFAULT 8,
  publish_date DATE               NOT NULL UNIQUE,
  publish_time TIME               NOT NULL DEFAULT '04:00:00',
  content      JSONB              NOT NULL DEFAULT '{}',
  tech_tags    INTEGER[]          DEFAULT '{}',
  created_by   UUID               REFERENCES users(id),
  deleted_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ        NOT NULL DEFAULT NOW()
);

SELECT attach_updated_at_trigger('challenges');
CREATE INDEX idx_challenges_date  ON challenges (publish_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_challenges_level ON challenges (level, min_semester, max_semester);

CREATE TYPE submission_type AS ENUM ('code','screenshot','link','text');

CREATE TABLE challenge_submissions (
  id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
  challenge_id    UUID            NOT NULL REFERENCES challenges(id),
  user_id         UUID            NOT NULL REFERENCES users(id),
  submission_type submission_type NOT NULL,
  content         TEXT,
  s3_key          TEXT,
  notes           TEXT,
  completed_at    TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  UNIQUE (challenge_id, user_id)
);

CREATE INDEX idx_submissions_user      ON challenge_submissions (user_id);
CREATE INDEX idx_submissions_challenge ON challenge_submissions (challenge_id);
CREATE INDEX idx_submissions_date      ON challenge_submissions (completed_at);

CREATE TABLE streaks (
  user_id           UUID    PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  current_streak    INTEGER NOT NULL DEFAULT 0,
  longest_streak    INTEGER NOT NULL DEFAULT 0,
  last_completed_on DATE,
  streak_started_on DATE,
  total_completions INTEGER NOT NULL DEFAULT 0,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

SELECT attach_updated_at_trigger('streaks');

CREATE TYPE badge_category AS ENUM (
  'streak','showcase','social','challenge','mentorship','accountability','special'
);

CREATE TABLE badges (
  id                     SERIAL         PRIMARY KEY,
  slug                   VARCHAR(80)    NOT NULL UNIQUE,
  name                   VARCHAR(100)   NOT NULL,
  description            TEXT           NOT NULL,
  category               badge_category NOT NULL,
  icon_url               TEXT,
  auto_award_threshold   INTEGER,
  is_active              BOOLEAN        NOT NULL DEFAULT TRUE,
  created_at             TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

INSERT INTO badges (slug, name, description, category, auto_award_threshold) VALUES
  ('first-project',     'First Project',     'Submitted your first project to a showcase',                'showcase',      NULL),
  ('first-vote',        'First Vote',         'Cast your first vote on a peer project',                   'social',        NULL),
  ('bronze-builder',    'Bronze Builder',     'Completed daily challenges for 7 consecutive days',        'streak',        7),
  ('silver-builder',    'Silver Builder',     'Completed daily challenges for 30 consecutive days',       'streak',        30),
  ('gold-builder',      'Gold Builder',       'Completed daily challenges for 100 consecutive days',      'streak',        100),
  ('most-innovative',   'Most Innovative',    'Won the Most Innovative category in a showcase',           'showcase',      NULL),
  ('best-ui',           'Best UI',            'Won the Best UI category in a showcase',                   'showcase',      NULL),
  ('best-tech',         'Best Technical',     'Won the Best Technical Complexity category in a showcase', 'showcase',      NULL),
  ('faculty-choice',    'Faculty Choice',     'Won the Faculty Choice award in a showcase',               'showcase',      NULL),
  ('reliable-builder',  'Reliable Builder',   'Completed 4 consecutive weekly accountability check-ins',  'accountability',NULL),
  ('shipped-idea',      'Idea Shipped',       'Shipped a project within the 21-day Idea Garage window',   'challenge',     NULL),
  ('active-mentor',     'Active Mentor',      'Actively mentoring junior students',                       'mentorship',    NULL),
  ('subject-expert',    'Subject Expert',     'Most upvoted answers in a specific subject area',          'mentorship',    NULL),
  ('showdown-champion', 'Showdown Champion',  'Won a Semester Showdown hackathon',                        'special',       NULL),
  ('perfect-week',      'Perfect Week',       'Completed all 5 challenges in a single week',              'challenge',     NULL);

CREATE TABLE user_badges (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id   INTEGER     NOT NULL REFERENCES badges(id),
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  context    JSONB,
  UNIQUE (user_id, badge_id)
);

CREATE INDEX idx_user_badges_user  ON user_badges (user_id);
CREATE INDEX idx_user_badges_badge ON user_badges (badge_id);