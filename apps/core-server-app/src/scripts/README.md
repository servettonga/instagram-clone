# Test User Cleanup Scripts

This directory contains scripts for cleaning up test users from the database.

## Overview

During testing, the auth service creates test users in the core database. These users are soft-deleted (marked as `disabled: true`) after tests, but they remain in the database. The cleanup scripts provide a way to permanently remove old test users.

## Scripts

### 1. Manual Cleanup: `cleanup-test-users.ts`

Manually remove old test users from the database.

**Usage:**

```bash
# Basic cleanup (removes test users older than 7 days)
npm run cleanup:test-users

# Dry run (see what would be deleted without actually deleting)
npm run cleanup:test-users:dry-run
npm run cleanup:test-users -- --dry-run

# Immediate cleanup (removes ALL disabled test users, regardless of age)
npm run cleanup:test-users:now

# Custom retention period (14 days)
npm run cleanup:test-users -- --days=14

# Custom batch size
npm run cleanup:test-users -- --batch-size=50

# Combine options
npm run cleanup:test-users -- --days=1 --batch-size=100
```

**Options:**

- `--dry-run`: Show what would be deleted without actually deleting
- `--days=N`: Delete test users older than N days (default: 7)
- `--batch-size=N`: Process N users at a time (default: 100)
- `--help`, `-h`: Show help message

### 2. Scheduled Cleanup: `schedule-cleanup.ts`

Automatically run cleanup on a schedule (e.g., daily at 2 AM).

**Usage:**

```bash
# Start the scheduler (runs daily at 2 AM by default)
npm run cleanup:schedule
```

**Configuration:**

Set environment variables to customize the schedule:

```bash
# Run every day at 3 AM
export CLEANUP_CRON_SCHEDULE="0 3 * * *"

# Keep test users for 14 days
export CLEANUP_RETENTION_DAYS=14

# Disable scheduled cleanup
export CLEANUP_ENABLED=false

npm run cleanup:schedule
```

**Cron Schedule Format:**

```sh
* * * * *
│ │ │ │ │
│ │ │ │ └── Day of week (0-7, 0 and 7 are Sunday)
│ │ │ └──── Month (1-12)
│ │ └────── Day of month (1-31)
│ └──────── Hour (0-23)
└────────── Minute (0-59)
```

**Examples:**

- `0 2 * * *` - Every day at 2:00 AM
- `0 */6 * * *` - Every 6 hours
- `0 0 * * 0` - Every Sunday at midnight
- `0 0 1 * *` - First day of every month

## How It Works

### Test User Identification

Test users are identified by:

1. Email patterns: `authtest-*`, `e2etest-*`, `test-*@test.com`
2. Status: `disabled: true` (soft-deleted)
3. Age: Older than retention period (default: 7 days)

### Cleanup Process

1. Find test users matching criteria
2. For each user:
   - Delete related accounts
   - Delete related profiles
   - Delete the user record
3. Report summary of deletions

### Safety Features

- **Dry run mode**: Preview what would be deleted
- **Retention period**: Only delete old test users
- **Batch processing**: Process in manageable batches
- **Transaction safety**: All deletions in a transaction
- **Error handling**: Continue on individual failures
- **Detailed logging**: Track all operations

## Integration

### Manual Cleanup (Recommended for Development)

Run manually when needed:

```bash
npm run cleanup:test-users:dry-run  # Check what would be deleted
npm run cleanup:test-users          # Delete old test users (7+ days)
npm run cleanup:test-users:now      # Delete ALL disabled test users (after tests)
```

### Scheduled Cleanup (Recommended for CI/Test Environments)

Add to your CI/CD pipeline or run as a background service:

**Docker Compose:**

```yaml
services:
  cleanup-scheduler:
    build: .
    command: npm run cleanup:schedule
    environment:
      - NODE_ENV=development
      - CLEANUP_CRON_SCHEDULE=0 2 * * *
      - CLEANUP_RETENTION_DAYS=7
    depends_on:
      - postgres
```

**Kubernetes CronJob:**

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: cleanup-test-users
spec:
  schedule: "0 2 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: cleanup
            image: core-server-app:latest
            command: ["npm", "run", "cleanup:test-users"]
            env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: db-credentials
                  key: url
```

## Production Considerations

**Important:** By default, scheduled cleanup is **disabled in production** (`NODE_ENV=production`).

If you need cleanup in production:

1. Use a separate test database
2. Or explicitly enable with `CLEANUP_ENABLED=true`
3. Set appropriate retention period
4. Test thoroughly first

## Monitoring

The scripts log:

- Number of users found
- List of users to delete
- Success/failure for each deletion
- Summary statistics

Example output:

```sh
Starting test user cleanup...

Options:
  - Dry run: NO
  - Retention: 7 days
  - Batch size: 100

Found 3 test user(s) to delete:

  1. User ID: abc-123 | Email: authtest-123@example.com | Username: authtest123 | Age: 10 days
  2. User ID: def-456 | Email: authtest-456@example.com | Username: authtest456 | Age: 8 days
  3. User ID: ghi-789 | Email: e2etest-789@example.com | Username: e2etest789 | Age: 7 days

Deleting users...

  ✓ Deleted user: abc-123
  ✓ Deleted user: def-456
  ✓ Deleted user: ghi-789

Cleanup Summary:
  - Total found: 3
  - Successfully deleted: 3
  - Errors: 0

✓ Cleanup complete!
```

## Troubleshooting

**Issue: "Cannot find module 'node-cron'"**

```bash
cd apps/core-server-app
npm install
```

**Issue: Cleanup doesn't find any users (just ran tests!)**

This is expected! By default, the cleanup script only deletes test users older than 7 days as a safety feature. If you want to delete recently created test users:

```bash
# Delete ALL disabled test users (regardless of age)
npm run cleanup:test-users:now

# Or use a shorter retention period
npm run cleanup:test-users -- --days=0
```

**Issue: Cleanup finds users but doesn't delete them**

- Check retention period (default: 7 days)
- Verify test users are actually disabled
- Confirm email patterns match your test users

**Issue: Permission errors**

- Ensure database connection has DELETE permissions
- Check Prisma schema foreign key constraints

**Issue: Scheduler not running**

- Check `CLEANUP_ENABLED` environment variable
- Verify `NODE_ENV` is not `production`
- Confirm cron schedule syntax

## Related Files

- `cleanup-test-users.ts` - Manual cleanup script
- `schedule-cleanup.ts` - Scheduled cleanup service
- `../../test/setup.ts` (auth-service) - Test helper that registers users for cleanup
- `../../test/README.md` (auth-service) - Auth service test documentation
