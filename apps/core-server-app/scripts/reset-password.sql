-- Manual Password Reset Script
-- Usage: Replace the identifier (email or username) and run in psql or database tool
-- 
-- This script hashes the password 'password123' using bcrypt
-- The hash below is: bcrypt('password123', 10)
-- 
-- IMPORTANT: Run this against your database to reset a user's password for testing

-- Option 1: Reset by EMAIL
-- Replace 'user@example.com' with the actual email
UPDATE "Account"
SET "passwordHash" = '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'
WHERE "userId" IN (
  SELECT u."id" FROM "User" u
  JOIN "Account" a ON a."userId" = u."id"
  WHERE a."email" = 'user@example.com' AND a."provider" = 'LOCAL'
)
AND "provider" = 'LOCAL';

-- Option 2: Reset by USERNAME
-- Replace 'johndoe' with the actual username
UPDATE "Account"
SET "passwordHash" = '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'
WHERE "userId" IN (
  SELECT u."id" FROM "User" u
  JOIN "Profile" p ON p."userId" = u."id"
  WHERE p."username" = 'johndoe'
)
AND "provider" = 'LOCAL';

-- Verify the update (by email)
SELECT u.id, a.email, p.username, a.provider, a."createdAt"
FROM "User" u
JOIN "Account" a ON a."userId" = u.id
LEFT JOIN "Profile" p ON p."userId" = u.id
WHERE a.email = 'user@example.com';

-- Verify the update (by username)
SELECT u.id, a.email, p.username, a.provider, a."createdAt"
FROM "User" u
JOIN "Account" a ON a."userId" = u.id
JOIN "Profile" p ON p."userId" = u.id
WHERE p.username = 'johndoe';

-- After running this, you can login with:
-- Email/Username: [the user's email or username]
-- Password: password123