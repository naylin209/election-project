-- Run this as the postgres superuser:
--   sudo -u postgres psql -f setup_db.sql

-- Create the database
CREATE DATABASE american_dream;

-- Create the app user
CREATE USER appuser WITH PASSWORD 'student';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE american_dream TO appuser;

-- Connect to the new database and grant schema access
\c american_dream
GRANT ALL ON SCHEMA public TO appuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO appuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO appuser;
