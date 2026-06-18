CREATE TABLE tech_tags (
  id        SERIAL  PRIMARY KEY,
  slug      VARCHAR(60) NOT NULL UNIQUE,
  label     VARCHAR(80) NOT NULL,
  category  VARCHAR(40),
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

INSERT INTO tech_tags (slug, label, category) VALUES
  ('python','Python','Language'),('javascript','JavaScript','Language'),
  ('typescript','TypeScript','Language'),('java','Java','Language'),
  ('cpp','C++','Language'),('react','React.js','Frontend'),
  ('vue','Vue.js','Frontend'),('html-css','HTML / CSS','Frontend'),
  ('tailwind','Tailwind CSS','Frontend'),('nodejs','Node.js','Backend'),
  ('express','Express.js','Backend'),('django','Django','Backend'),
  ('flask','Flask','Backend'),('postgresql','PostgreSQL','Database'),
  ('mysql','MySQL','Database'),('mongodb','MongoDB','Database'),
  ('firebase','Firebase','Backend'),('tensorflow','TensorFlow','AI/ML'),
  ('pytorch','PyTorch','AI/ML'),('sklearn','scikit-learn','AI/ML'),
  ('flutter','Flutter','Mobile'),('react-native','React Native','Mobile'),
  ('android','Android','Mobile'),('docker','Docker','DevOps'),
  ('aws','AWS','Cloud'),('git','Git / GitHub','Tools');

CREATE TYPE showcase_status AS ENUM ('upcoming','submission_open','voting_open','closed');

CREATE TABLE showcases (
  id               UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  title            TEXT          NOT NULL,
  description      TEXT,
  target_semesters SMALLINT[]    NOT NULL,
  program_ids      INTEGER[],
  submission_start TIMESTAMPTZ   NOT NULL,
  submission_end   TIMESTAMPTZ   NOT NULL,
  voting_start     TIMESTAMPTZ   NOT NULL,
  voting_end       TIMESTAMPTZ   NOT NULL,
  status           showcase_status NOT NULL DEFAULT 'upcoming',
  created_by       UUID          REFERENCES users(id),
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_window CHECK (
    submission_start < submission_end AND
    submission_end <= voting_start AND
    voting_start < voting_end
  )
);

SELECT attach_updated_at_trigger('showcases');

CREATE TYPE project_status AS ENUM ('draft','pending_moderation','approved','rejected','archived');

CREATE TABLE projects (
  id               UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
  showcase_id      UUID           REFERENCES showcases(id) ON DELETE SET NULL,
  title            TEXT           NOT NULL CHECK (char_length(title) BETWEEN 5 AND 120),
  description      TEXT           NOT NULL CHECK (char_length(description) >= 100),
  program_id       INTEGER        NOT NULL REFERENCES programs(id),
  semester         SMALLINT       NOT NULL CHECK (semester BETWEEN 1 AND 8),
  github_url       TEXT,
  demo_url         TEXT,
  status           project_status NOT NULL DEFAULT 'pending_moderation',
  submitted_by     UUID           NOT NULL REFERENCES users(id),
  moderated_by     UUID           REFERENCES users(id),
  moderated_at     TIMESTAMPTZ,
  rejection_reason TEXT,
  ai_evaluation    JSONB,
  deleted_at       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

SELECT attach_updated_at_trigger('projects');

CREATE INDEX idx_projects_fts       ON projects USING gin(to_tsvector('english', title || ' ' || description));
CREATE INDEX idx_projects_status    ON projects (status) WHERE deleted_at IS NULL;
CREATE INDEX idx_projects_showcase  ON projects (showcase_id);
CREATE INDEX idx_projects_submitted ON projects (submitted_by);

CREATE TABLE project_screenshots (
  id         UUID     PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID     NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  s3_key     TEXT     NOT NULL,
  url        TEXT     NOT NULL,
  sort_order SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_screenshots_project ON project_screenshots (project_id);

CREATE TABLE project_members (
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id),
  role       VARCHAR(60),
  PRIMARY KEY (project_id, user_id)
);

CREATE TABLE project_tags (
  project_id UUID    NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  tag_id     INTEGER NOT NULL REFERENCES tech_tags(id),
  PRIMARY KEY (project_id, tag_id)
);

CREATE INDEX idx_project_tags_tag ON project_tags (tag_id);

CREATE TABLE project_votes (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  voter_id   UUID        NOT NULL REFERENCES users(id),
  voter_role user_role   NOT NULL,
  weight     SMALLINT    NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, voter_id)
);

CREATE INDEX idx_votes_project ON project_votes (project_id);
CREATE INDEX idx_votes_voter   ON project_votes (voter_id);

CREATE MATERIALIZED VIEW project_vote_totals AS
SELECT
  p.id                                        AS project_id,
  p.showcase_id,
  p.title,
  p.submitted_by,
  COALESCE(SUM(v.weight), 0)                  AS weighted_votes,
  COUNT(v.id)                                 AS raw_vote_count,
  RANK() OVER (
    PARTITION BY p.showcase_id
    ORDER BY COALESCE(SUM(v.weight), 0) DESC
  )                                           AS showcase_rank
FROM projects p
LEFT JOIN project_votes v ON v.project_id = p.id
WHERE p.status IN ('approved','archived')
  AND p.deleted_at IS NULL
GROUP BY p.id
WITH DATA;

CREATE UNIQUE INDEX ON project_vote_totals (project_id);
CREATE INDEX ON project_vote_totals (showcase_id, weighted_votes DESC);