-- ENUM TYPES

CREATE TYPE user_role AS ENUM ('member', 'officer', 'employee', 'admin');
CREATE TYPE user_status AS ENUM ('active', 'invited', 'disabled');
CREATE TYPE election_status AS ENUM ('draft', 'active', 'completed');

-- SOCIETY

CREATE TABLE society (
    society_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- USER

CREATE TABLE "user" (
    user_id SERIAL PRIMARY KEY,
    society_id INT REFERENCES society(society_id),
    email VARCHAR(255) UNIQUE,
    password_hash TEXT,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role user_role,
    status user_status,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    last_login TIMESTAMP
);

-- EMPLOYEE SOCIETY ASSIGNMENT

CREATE TABLE employee_society_assignment (
    assignment_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES "user"(user_id),
    society_id INT REFERENCES society(society_id),
    assigned_at TIMESTAMP
);

-- SESSION

CREATE TABLE session (
    session_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES "user"(user_id),
    created_at TIMESTAMP,
    expires_at TIMESTAMP,
    ip_address VARCHAR(100)
);

-- ELECTION

CREATE TABLE election (
    election_id SERIAL PRIMARY KEY,
    society_id INT REFERENCES society(society_id),
    created_by INT REFERENCES "user"(user_id),
    name VARCHAR(255),
    description TEXT,
    instructions TEXT,
    start_date DATE,
    end_date DATE,
    status election_status,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- OFFICE

CREATE TABLE office (
    office_id SERIAL PRIMARY KEY,
    election_id INT REFERENCES election(election_id),
    title VARCHAR(255),
    description TEXT,
    votes_allowed INT,
    allow_write_in BOOLEAN,
    display_order INT
);

-- CANDIDATE

CREATE TABLE candidate (
    candidate_id SERIAL PRIMARY KEY,
    office_id INT REFERENCES office(office_id),
    name VARCHAR(255),
    title_position VARCHAR(255),
    biography TEXT,
    photo_url TEXT,
    display_order INT
);

-- VOTE

CREATE TABLE vote (
    vote_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES "user"(user_id),
    election_id INT REFERENCES election(election_id),
    submitted_at TIMESTAMP,
    ip_address VARCHAR(100)
);

-- CANDIDATE VOTE

CREATE TABLE candidate_vote (
    candidate_vote_id SERIAL PRIMARY KEY,
    vote_id INT REFERENCES vote(vote_id),
    office_id INT REFERENCES office(office_id),
    candidate_id INT REFERENCES candidate(candidate_id),
    write_in_name VARCHAR(255)
);

-- INITIATIVE

CREATE TABLE initiative (
    initiative_id SERIAL PRIMARY KEY,
    election_id INT REFERENCES election(election_id),
    title VARCHAR(255),
    description TEXT,
    display_order INT
);

-- INITIATIVE OPTION

CREATE TABLE initiative_option (
    option_id SERIAL PRIMARY KEY,
    initiative_id INT REFERENCES initiative(initiative_id),
    label VARCHAR(255),
    display_order INT
);

-- INITIATIVE VOTE

CREATE TABLE initiative_vote (
    initiative_vote_id INT PRIMARY KEY,
    vote_id INT REFERENCES vote(vote_id),
    initiative_id INT REFERENCES initiative(initiative_id),
    option_id INT REFERENCES initiative_option(option_id)
);

-- BALLOT EDIT AUDIT

CREATE TABLE ballot_edit_audit (
    audit_id SERIAL PRIMARY KEY,
    election_id INT REFERENCES election(election_id),
    user_id INT REFERENCES "user"(user_id),
    action VARCHAR(255),
    details TEXT,
    edited_at TIMESTAMP
);

-- INDEXES

-- User lookups
CREATE INDEX idx_user_email ON "user"(email);
CREATE INDEX idx_user_society_id ON "user"(society_id);
CREATE INDEX idx_user_role ON "user"(role);
CREATE INDEX idx_user_status ON "user"(status);

-- Election lookups
CREATE INDEX idx_election_society_id ON election(society_id);
CREATE INDEX idx_election_status ON election(status);
CREATE INDEX idx_election_created_by ON election(created_by);

-- Office and candidate lookups
CREATE INDEX idx_office_election_id ON office(election_id);
CREATE INDEX idx_candidate_office_id ON candidate(office_id);

-- Initiative lookups
CREATE INDEX idx_initiative_election_id ON initiative(election_id);
CREATE INDEX idx_initiative_option_initiative_id ON initiative_option(initiative_id);

-- Vote lookups (most critical — checked on every vote submission)
CREATE INDEX idx_vote_user_id ON vote(user_id);
CREATE INDEX idx_vote_election_id ON vote(election_id);
CREATE INDEX idx_vote_user_election ON vote(user_id, election_id);

-- Candidate vote lookups
CREATE INDEX idx_candidate_vote_vote_id ON candidate_vote(vote_id);
CREATE INDEX idx_candidate_vote_candidate_id ON candidate_vote(candidate_id);

-- Initiative vote lookups
CREATE INDEX idx_initiative_vote_vote_id ON initiative_vote(vote_id);
CREATE INDEX idx_initiative_vote_option_id ON initiative_vote(option_id);

-- Employee society assignment lookups
CREATE INDEX idx_esa_user_id ON employee_society_assignment(user_id);
CREATE INDEX idx_esa_society_id ON employee_society_assignment(society_id);

-- Audit log lookups
CREATE INDEX idx_audit_election_id ON ballot_edit_audit(election_id);
CREATE INDEX idx_audit_user_id ON ballot_edit_audit(user_id);
