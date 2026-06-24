-- Migration 002: Add indexes for query performance optimization
--
-- Run once on the VM:
--   psql -U <user> -d <db> -f database/migrations/002_add_indexes.sql

-- User lookups
CREATE INDEX IF NOT EXISTS idx_user_email ON "user"(email);
CREATE INDEX IF NOT EXISTS idx_user_society_id ON "user"(society_id);
CREATE INDEX IF NOT EXISTS idx_user_role ON "user"(role);
CREATE INDEX IF NOT EXISTS idx_user_status ON "user"(status);

-- Election lookups
CREATE INDEX IF NOT EXISTS idx_election_society_id ON election(society_id);
CREATE INDEX IF NOT EXISTS idx_election_status ON election(status);
CREATE INDEX IF NOT EXISTS idx_election_created_by ON election(created_by);

-- Office and candidate lookups
CREATE INDEX IF NOT EXISTS idx_office_election_id ON office(election_id);
CREATE INDEX IF NOT EXISTS idx_candidate_office_id ON candidate(office_id);

-- Initiative lookups
CREATE INDEX IF NOT EXISTS idx_initiative_election_id ON initiative(election_id);
CREATE INDEX IF NOT EXISTS idx_initiative_option_initiative_id ON initiative_option(initiative_id);

-- Vote lookups (most critical — checked on every vote submission)
CREATE INDEX IF NOT EXISTS idx_vote_user_id ON vote(user_id);
CREATE INDEX IF NOT EXISTS idx_vote_election_id ON vote(election_id);
CREATE INDEX IF NOT EXISTS idx_vote_user_election ON vote(user_id, election_id);

-- Candidate vote lookups
CREATE INDEX IF NOT EXISTS idx_candidate_vote_vote_id ON candidate_vote(vote_id);
CREATE INDEX IF NOT EXISTS idx_candidate_vote_candidate_id ON candidate_vote(candidate_id);

-- Initiative vote lookups
CREATE INDEX IF NOT EXISTS idx_initiative_vote_vote_id ON initiative_vote(vote_id);
CREATE INDEX IF NOT EXISTS idx_initiative_vote_option_id ON initiative_vote(option_id);

-- Employee society assignment lookups
CREATE INDEX IF NOT EXISTS idx_esa_user_id ON employee_society_assignment(user_id);
CREATE INDEX IF NOT EXISTS idx_esa_society_id ON employee_society_assignment(society_id);

-- Audit log lookups
CREATE INDEX IF NOT EXISTS idx_audit_election_id ON ballot_edit_audit(election_id);
CREATE INDEX IF NOT EXISTS idx_audit_user_id ON ballot_edit_audit(user_id);
