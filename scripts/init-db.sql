-- Initialize databases for Polaroid application
-- This script runs when PostgreSQL container starts

-- Create production database
CREATE DATABASE polaroid;

-- Create test database for testing
CREATE DATABASE polaroid_test;

-- Grant all privileges
GRANT ALL PRIVILEGES ON DATABASE polaroid TO postgres;
GRANT ALL PRIVILEGES ON DATABASE polaroid_test TO postgres;

-- Additional schemas if needed in the future
-- \c polaroid;
-- CREATE SCHEMA IF NOT EXISTS app_schema;
