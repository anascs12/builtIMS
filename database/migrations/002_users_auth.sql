-- ============================================================
-- BuildIMS Migration 002: Users & Authentication Domain
-- ============================================================

-- ── Programs ─────────────────────────────────────────────────
CREATE TABLE programs (
  id          SERIAL PRIMARY KEY,
  code        VARCHAR(20) NOT NULL UNIQUE,  -- e.g. 'BSCS'
  name        TEXT        NOT NULL,          -- e.g. 'Bachelor of Science in Computer Science'
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO programs (code, name) VALUES
  ('BSCS',   'Bachelor of Science in Computer Science'),
  ('BSSE',   'Bachelor of Science in Software Engineering'),
  ('BS-AI',  'Bachelor of Science in Artificial Intelligence'),
  ('BS-DS',  'Bachelor of Science in Data Science'),
  ('BS-Cyber','Bachelor of Science in Cybersecurity');


-- ── Career Interests (lookup table) ──────────────────────────
CREATE TABLE career_interests (
  id    SERIAL PRIMARY KEY,
  label TEXT NOT NULL UNIQUE  -- e.g. 'Web Development', 'AI/ML', 'Cybersecurity'
);

INSERT INTO career_interests (label) VALUES
  ('Web Development'),
  ('Mobile Development'),
  ('AI / Machine Learning'),
  ('Data Science'),
  ('Cybersecurity'),
  ('DevOps / Cloud'),
  ('Game Development'),
  ('Embedded Systems'),
  ('UI/UX Design'),
  ('Freelancing');


-- ── User Roles ────────────────────────────────────────────────
CREATE TYPE user_role AS ENUM ('student', 'faculty', 'alumni', 'admin');
CREATE TYPE user_status AS ENUM ('pending_verification', 'active', 'suspended', 'deactivated');


-- ── Users (core table) ───────────────────────────────────────
CREATE TABLE users (
  id                    UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  email                 VARCHAR(320) NOT NULL UNIQUE,
  username              VARCHAR(50)  NOT NULL UNIQUE,
  password_hash         TEXT         NOT NULL,
  full_name             TEXT         NOT NULL,
  role                  user_role    NOT NULL DEFAULT 'student',
  status                user_status  NOT NULL DEFAULT 'pending_verification',

  -- Student-specific
  student_id            VARCHAR(30)  UNIQUE,
  program_id            INTEGER      REFERENCES programs(id),
  current_semester      SMALLINT     CHECK (current_semester BETWEEN 1 AND 8),
  career_interest_id    INTEGER      REFERENCES career_interests(id),

  -- Profile
  avatar_url            TEXT,
  bio                   TEXT         CHECK (char_length(bio) <= 500),
  github_username       VARCHAR(100),
  linkedin_url          TEXT,

  -- Security
  failed_login_attempts SMALLINT     NOT NULL DEFAULT 0,
  locked_until          TIMESTAMPTZ,
  last_login_at         TIMESTAMPTZ,
  password_changed_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  -- Digest preferences
  digest_subscribed     BOOLEAN      NOT NULL DEFAULT TRUE,

  -- Soft delete
  deleted_at            TIMESTAMPTZ,

  created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_ims_email CHECK (email LIKE '%@imsciences.edu.pk'),
  CONSTRAINT username_format CHECK (username ~ '^[a-z0-9_]{3,50}$')
);

SELECT attach_updated_at_trigger('users');

-- Indexes
CREATE INDEX idx_users_email       ON users (email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_username    ON users (username) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_program     ON users (program_id);
CREATE INDEX idx_users_role_status ON users (role, status);


-- ── Email Verification Tokens ────────────────────────────────
CREATE TABLE email_verification_tokens (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT        NOT NULL UNIQUE,  -- bcrypt or SHA-256 hash of the raw token
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_evtoken_user    ON email_verification_tokens (user_id);
CREATE INDEX idx_evtoken_expires ON email_verification_tokens (expires_at) WHERE used_at IS NULL;


-- ── Password Reset Tokens ────────────────────────────────────
CREATE TABLE password_reset_tokens (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT        NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  ip_address  INET,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_prt_user    ON password_reset_tokens (user_id);
CREATE INDEX idx_prt_expires ON password_reset_tokens (expires_at) WHERE used_at IS NULL;


-- ── Refresh Tokens ────────────────────────────────────────────
-- Stored so we can invalidate individual sessions (logout, suspicious activity)
CREATE TABLE refresh_tokens (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT        NOT NULL UNIQUE,
  user_agent  TEXT,
  ip_address  INET,
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rt_user    ON refresh_tokens (user_id) WHERE revoked_at IS NULL;
CREATE INDEX idx_rt_expires ON refresh_tokens (expires_at) WHERE revoked_at IS NULL;


-- ── Audit Log (security-critical actions) ─────────────────────
CREATE TYPE audit_action AS ENUM (
  'register', 'login', 'logout', 'login_failed', 'account_locked',
  'email_verified', 'password_reset_requested', 'password_reset_completed',
  'password_changed', 'token_refreshed', 'admin_action'
);

CREATE TABLE audit_log (
  id          BIGSERIAL   PRIMARY KEY,
  user_id     UUID        REFERENCES users(id) ON DELETE SET NULL,
  action      audit_action NOT NULL,
  ip_address  INET,
  user_agent  TEXT,
  metadata    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_user   ON audit_log (user_id);
CREATE INDEX idx_audit_action ON audit_log (action, created_at);
CREATE INDEX idx_audit_time   ON audit_log (created_at);
