/**
 * Cleanup Script: Remove old test users
 *
 * This script removes disabled users created during testing.
 * It identifies test users by email pattern and deletes users that:
 * - Are disabled (soft-deleted)
 * - Have test email patterns (authtest-*, e2etest-*, etc.)
 * - Are older than a specified retention period
 *
 * Usage:
 *   npm run cleanup:test-users
 *   npm run cleanup:test-users -- --dry-run
 *   npm run cleanup:test-users -- --days=7
 */

import { PrismaClient } from '@prisma/client';

interface CleanupOptions {
  dryRun: boolean;
  retentionDays: number;
  batchSize: number;
}

const DEFAULT_OPTIONS: CleanupOptions = {
  dryRun: false,
  retentionDays: 7, // Keep test users for 7 days before hard delete
  batchSize: 100,
};

async function cleanupTestUsers(options: CleanupOptions = DEFAULT_OPTIONS) {
  const prisma = new PrismaClient();

  try {
    console.log('Starting test user cleanup...\n');
    console.log(`Options:`);
    console.log(`  - Dry run: ${options.dryRun ? 'YES' : 'NO'}`);
    console.log(`  - Retention: ${options.retentionDays} days`);
    console.log(`  - Batch size: ${options.batchSize}`);
    console.log('');

    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - options.retentionDays);

    // Find test users to delete
    // Test users have email patterns like: authtest-*, e2etest-*, test-*
    const testEmailPatterns = ['authtest-%', 'e2etest-%', 'test-%@test.com'];

    const usersToDelete = await prisma.user.findMany({
      where: {
        disabled: true,
        updatedAt: {
          lt: cutoffDate,
        },
        accounts: {
          some: {
            OR: testEmailPatterns.map(pattern => ({
              email: {
                startsWith: pattern.replace('%', ''),
              },
            })),
          },
        },
      },
      include: {
        accounts: {
          select: { email: true },
        },
        profile: {
          select: { username: true },
        },
      },
      take: options.batchSize,
    });

    console.log(`Found ${usersToDelete.length} test user(s) to delete:\n`);

    if (usersToDelete.length === 0) {
      console.log('✓ No test users to clean up.');
      return;
    }

    // Display users to be deleted
    usersToDelete.forEach((user, index) => {
      const email = user.accounts[0]?.email || 'N/A';
      const username = user.profile?.username || 'N/A';
      const age = Math.floor(
        (Date.now() - user.updatedAt.getTime()) / (1000 * 60 * 60 * 24),
      );
      console.log(
        `  ${index + 1}. User ID: ${user.id}`,
        `| Email: ${email}`,
        `| Username: ${username}`,
        `| Age: ${age} days`,
      );
    });
    console.log('');

    if (options.dryRun) {
      console.log('🔍 DRY RUN - No users were deleted.');
      return;
    }

    // Delete users (hard delete)
    console.log('Deleting users...\n');

    let deletedCount = 0;
    let errorCount = 0;

    for (const user of usersToDelete) {
      try {
        await prisma.$transaction([
          // Delete related data first (due to foreign key constraints)
          prisma.account.deleteMany({ where: { userId: user.id } }),
          prisma.profile.deleteMany({ where: { userId: user.id } }),
          // Then delete the user
          prisma.user.delete({ where: { id: user.id } }),
        ]);

        deletedCount++;
        console.log(`  ✓ Deleted user: ${user.id}`);
      } catch (error) {
        errorCount++;
        console.error(`  ✗ Failed to delete user ${user.id}:`, error);
      }
    }

    console.log('\nCleanup Summary:');
    console.log(`  - Total found: ${usersToDelete.length}`);
    console.log(`  - Successfully deleted: ${deletedCount}`);
    console.log(`  - Errors: ${errorCount}`);
    console.log('\n✓ Cleanup complete!');

  } catch (error) {
    console.error('Cleanup failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Parse command line arguments
function parseArgs(): Partial<CleanupOptions> {
  const args = process.argv.slice(2);
  const options: Partial<CleanupOptions> = {};

  for (const arg of args) {
    if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg.startsWith('--days=')) {
      const value = arg.split('=')[1];
      if (value) options.retentionDays = parseInt(value, 10);
    } else if (arg.startsWith('--batch-size=')) {
      const value = arg.split('=')[1];
      if (value) options.batchSize = parseInt(value, 10);
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Usage: npm run cleanup:test-users [options]

Options:
  --dry-run           Show what would be deleted without actually deleting
  --days=N            Delete test users older than N days (default: 7)
  --batch-size=N      Process N users at a time (default: 100)
  --help, -h          Show this help message

Examples:
  npm run cleanup:test-users
  npm run cleanup:test-users -- --dry-run
  npm run cleanup:test-users -- --days=14
  npm run cleanup:test-users -- --days=1 --batch-size=50
      `);
      process.exit(0);
    }
  }

  return options;
}

// Run if called directly
if (require.main === module) {
  const customOptions = parseArgs();
  const options = { ...DEFAULT_OPTIONS, ...customOptions };

  cleanupTestUsers(options)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { cleanupTestUsers };
export type { CleanupOptions };
