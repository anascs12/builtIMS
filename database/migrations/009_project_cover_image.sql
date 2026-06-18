-- Migration 009: Add cover image support to projects

ALTER TABLE projects ADD COLUMN IF NOT EXISTS cover_image     TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS cover_image_alt TEXT;
