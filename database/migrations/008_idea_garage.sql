-- ============================================================
-- BuildIMS Migration 008: Idea Garage
-- ============================================================

CREATE TYPE idea_status AS ENUM ('active', 'shipped', 'abandoned', 'expired');

CREATE TABLE ideas (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  posted_by     UUID        NOT NULL REFERENCES users(id),
  title         TEXT        NOT NULL CHECK (char_length(title) BETWEEN 5 AND 120),
  description   TEXT        NOT NULL CHECK (char_length(description) >= 20),
  tech_stack    TEXT[],
  status        idea_status NOT NULL DEFAULT 'active',
  proof_url     TEXT,
  proof_type    VARCHAR(20),  -- 'github' or 'screenshot'
  proof_note    TEXT,
  deadline      TIMESTAMPTZ NOT NULL,  -- posted_at + 21 days
  shipped_at    TIMESTAMPTZ,
  abandoned_at  TIMESTAMPTZ,
  deleted_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ideas_posted_by ON ideas (posted_by);
CREATE INDEX idx_ideas_status    ON ideas (status) WHERE deleted_at IS NULL;
CREATE INDEX idx_ideas_deadline  ON ideas (deadline) WHERE status = 'active';

CREATE TABLE idea_collaborators (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  idea_id     UUID        NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES users(id),
  status      VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending, accepted, rejected
  message     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (idea_id, user_id)
);

CREATE INDEX idx_collab_idea ON idea_collaborators (idea_id);
CREATE INDEX idx_collab_user ON idea_collaborators (user_id);