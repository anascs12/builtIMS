CREATE TABLE job_postings (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  source       VARCHAR(50) NOT NULL,
  title        TEXT        NOT NULL,
  company      TEXT,
  location     TEXT,
  description  TEXT,
  skills_detected INTEGER[] DEFAULT '{}',
  job_url      TEXT,
  is_remote    BOOLEAN     NOT NULL DEFAULT FALSE,
  posted_at    TIMESTAMPTZ,
  scraped_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_job_postings_source    ON job_postings (source, scraped_at DESC);
CREATE INDEX idx_job_postings_skills    ON job_postings USING gin(skills_detected);

CREATE TABLE market_skill_demand (
  id             SERIAL      PRIMARY KEY,
  tag_id         INTEGER     NOT NULL REFERENCES tech_tags(id),
  week_start     DATE        NOT NULL,
  job_count      INTEGER     NOT NULL DEFAULT 0,
  source         VARCHAR(50) NOT NULL,
  location_scope VARCHAR(30) NOT NULL DEFAULT 'pakistan',
  sample_urls    TEXT[]      DEFAULT '{}',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tag_id, week_start, source, location_scope)
);

CREATE INDEX idx_market_demand_week ON market_skill_demand (week_start DESC);
CREATE INDEX idx_market_demand_tag  ON market_skill_demand (tag_id);