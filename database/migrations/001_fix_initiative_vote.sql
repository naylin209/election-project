-- Migration 001: Fix initiative_vote_id to auto-increment (SERIAL)
--
-- The original DDL defined initiative_vote_id as INT (no auto-increment),
-- which causes inserts to fail. This migration drops and re-adds the column
-- as SERIAL so PostgreSQL generates the ID automatically.
--
-- Run once on the VM:
--   psql -U <user> -d <db> -f database/migrations/001_fix_initiative_vote.sql

ALTER TABLE initiative_vote DROP COLUMN initiative_vote_id;
ALTER TABLE initiative_vote ADD COLUMN initiative_vote_id SERIAL PRIMARY KEY;
