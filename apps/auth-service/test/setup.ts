/**
 * Test setup utilities for Auth Service
 *
 * Note: Auth service tests interact with the Core Service via HTTP.
 * For proper test isolation, you should:
 *
 * 1. Either run Core Service in test mode with TEST_DATABASE_URL
 * 2. Or clean up test data after tests complete
 *
 * This helper provides cleanup utilities to remove test users from the database.
 */

import axios from 'axios';

export class AuthServiceTestHelper {
  private readonly coreServiceUrl: string;
  private readonly testUserIds: Set<string> = new Set();

  constructor(coreServiceUrl?: string) {
    this.coreServiceUrl = coreServiceUrl || process.env.CORE_SERVICE_URL || 'http://localhost:8000';
  }

  /**
   * Register a test user ID for cleanup
   */
  registerTestUser(userId: string): void {
    this.testUserIds.add(userId);
  }

  /**
   * Clean up all registered test users
   */
  async cleanupTestUsers(): Promise<void> {
    console.log(`\nCleaning up ${this.testUserIds.size} test user(s)...`);

    for (const userId of this.testUserIds) {
      try {
        await axios.delete(`${this.coreServiceUrl}/api/users/${userId}`);
        console.log(`  ✓ Deleted test user: ${userId}`);
      } catch (error) {
        // Ignore 404 errors (user already deleted)
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          console.log(`  ⚠ User ${userId} already deleted or not found`);
        } else {
          console.error(`  ✗ Failed to delete user ${userId}:`, error);
        }
      }
    }

    this.testUserIds.clear();
    console.log('  ✓ Cleanup complete\n');
  }
}

// Legacy implementation using dedicated test database
// This is more complex but provides better isolation
// Keeping it commented for reference if needed in the future
/*
import { execSync } from 'child_process';
import { randomBytes } from 'crypto';
import { writeFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

export class AuthServiceTestDatabase {
*/
