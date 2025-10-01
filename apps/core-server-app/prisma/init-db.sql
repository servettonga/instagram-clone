-- Database initialization script for Innogram
-- Creates databases and application user with proper permissions

-- Create main application database
CREATE DATABASE innogram;

-- Create test database
CREATE DATABASE innogram_test;

-- Create application user with limited privileges
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_user WHERE usename = 'innogram_user') THEN
        CREATE USER innogram_user WITH PASSWORD 'innogram_app_password';
    END IF;
END
$$;

-- Grant CREATEDB privilege to allow schema management
ALTER USER innogram_user CREATEDB;

-- Configure main database
\c innogram;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Grant privileges to application user
GRANT CONNECT ON DATABASE innogram TO innogram_user;
GRANT USAGE ON SCHEMA public TO innogram_user;
GRANT CREATE ON SCHEMA public TO innogram_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO innogram_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO innogram_user;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO innogram_user;

-- Grant default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO innogram_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO innogram_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO innogram_user;

-- Configure test database
\c innogram_test;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Grant same privileges for test database
GRANT CONNECT ON DATABASE innogram_test TO innogram_user;
GRANT USAGE ON SCHEMA public TO innogram_user;
GRANT CREATE ON SCHEMA public TO innogram_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO innogram_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO innogram_user;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO innogram_user;

-- Grant default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO innogram_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO innogram_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO innogram_user;

-- Switch back to default database
\c postgres;
