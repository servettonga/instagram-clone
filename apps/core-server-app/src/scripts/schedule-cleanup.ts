/**
 * Scheduled Cleanup Service
 *
 * Runs periodic cleanup of test users on a schedule.
 * This can be integrated into the main app or run as a separate process.
 *
 * Usage:
 *   npm run cleanup:schedule
 */

import * as cron from 'node-cron';
import { cleanupTestUsers } from './cleanup-test-users';

interface ScheduleConfig {
  cronSchedule: string;
  retentionDays: number;
  enabled: boolean;
}

const DEFAULT_CONFIG: ScheduleConfig = {
  // Run every day at 2 AM
  cronSchedule: '0 2 * * *',
  retentionDays: 7,
  enabled: process.env.NODE_ENV !== 'production', // Only in dev/test by default
};

export class CleanupScheduler {
  private task: cron.ScheduledTask | null = null;
  private config: ScheduleConfig;

  constructor(config: Partial<ScheduleConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  start(): void {
    if (!this.config.enabled) {
      console.log('⏸Cleanup scheduler is disabled (NODE_ENV=production)');
      return;
    }

    console.log('Starting cleanup scheduler...');
    console.log(`  Schedule: ${this.config.cronSchedule}`);
    console.log(`  Retention: ${this.config.retentionDays} days`);

    this.task = cron.schedule(
      this.config.cronSchedule,
      () => {
        void (async () => {
          console.log('\nRunning scheduled cleanup...');
          try {
            await cleanupTestUsers({
              dryRun: false,
              retentionDays: this.config.retentionDays,
              batchSize: 100,
            });
            console.log('✓ Scheduled cleanup completed successfully\n');
          } catch (error) {
            console.error('✗ Scheduled cleanup failed:', error, '\n');
          }
        })();
      },
      {
        scheduled: true,
        timezone: 'UTC',
      },
    );

    console.log('✓ Cleanup scheduler started');
  }

  stop(): void {
    if (this.task) {
      this.task.stop();
      console.log('✓ Cleanup scheduler stopped');
    }
  }

  isRunning(): boolean {
    return this.task !== null;
  }

  getNextRun(): string {
    return 'Check cron schedule: ' + this.config.cronSchedule;
  }
}

// Run if called directly
if (require.main === module) {
  const scheduler = new CleanupScheduler({
    // Override config from environment variables
    cronSchedule: process.env.CLEANUP_CRON_SCHEDULE || '0 2 * * *',
    retentionDays: parseInt(process.env.CLEANUP_RETENTION_DAYS || '7', 10),
    enabled: process.env.CLEANUP_ENABLED !== 'false',
  });

  scheduler.start();

  const nextRun = scheduler.getNextRun();
  if (nextRun) {
    console.log(`\nNext cleanup scheduled for: ${nextRun.toString()}\n`);
  }

  // Keep process alive
  process.on('SIGINT', () => {
    console.log('\nReceived SIGINT, stopping scheduler...');
    scheduler.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\nReceived SIGTERM, stopping scheduler...');
    scheduler.stop();
    process.exit(0);
  });
}

export type { ScheduleConfig };
