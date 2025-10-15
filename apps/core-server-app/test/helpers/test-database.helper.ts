import { execSync } from 'child_process';
import { randomBytes } from 'crypto';
import { writeFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

export class TestDatabase {
  private static readonly POSTGRES_CONTAINER =
    process.env.POSTGRES_CONTAINER || 'intern_project_postgres_dev';
  private static readonly POSTGRES_USER = process.env.POSTGRES_USER || 'postgres';
  private static readonly POSTGRES_PASSWORD = process.env.POSTGRES_PASSWORD || 'password';
  private static readonly APP_DB_PASSWORD =
    process.env.APP_DB_PASSWORD || 'innogram_app_password';

  public readonly databaseName: string;
  public readonly databaseUrl: string;

  constructor(testSuiteName: string) {
    // Create unique database name per test suite
    const suffix = randomBytes(4).toString('hex');
    this.databaseName = `test_${testSuiteName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${suffix}`;
    this.databaseUrl = process.env.DATABASE_URL?.replace(
      '/innogram?',
      `/${this.databaseName}?`,
    ) || '';
  }

  /**
   * Create and configure the test database
   */
  async setup(): Promise<void> {
    console.log(`Setting up test database: ${this.databaseName}`);

    try {
      // Step 1: Create the database
      this.execCommand(
        `createdb -U ${TestDatabase.POSTGRES_USER} ${this.databaseName}`,
      );
      console.log(`✓ Database created: ${this.databaseName}`);
    } catch (error) {
      throw new Error(`Failed to create database: ${error}`);
    }

    try {
      // Step 2: Create a temporary SQL file for configuration
      const sqlContent = `
-- Create application user if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_user WHERE usename = 'innogram_user') THEN
        CREATE USER innogram_user WITH PASSWORD '${TestDatabase.APP_DB_PASSWORD}' CREATEDB;
    ELSE
        ALTER USER innogram_user WITH PASSWORD '${TestDatabase.APP_DB_PASSWORD}' CREATEDB;
    END IF;
END
$$;

-- Connect to test database
\\c ${this.databaseName};

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Grant privileges to application user
GRANT CONNECT ON DATABASE ${this.databaseName} TO innogram_user;
GRANT USAGE ON SCHEMA public TO innogram_user;
GRANT CREATE ON SCHEMA public TO innogram_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO innogram_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO innogram_user;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO innogram_user;

-- Grant default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO innogram_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO innogram_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO innogram_user;
`;

      // Write SQL to temporary file
      const tempSqlPath = join(tmpdir(), `test-db-setup-${this.databaseName}.sql`);
      writeFileSync(tempSqlPath, sqlContent);

      // Copy to container
      execSync(
        `docker cp ${tempSqlPath} ${TestDatabase.POSTGRES_CONTAINER}:/tmp/test-db-setup.sql`,
        { stdio: 'pipe' },
      );

      // Execute SQL file in container
      this.execCommand(
        `psql -U ${TestDatabase.POSTGRES_USER} -d postgres -f /tmp/test-db-setup.sql`,
      );

      // Clean up temporary files
      unlinkSync(tempSqlPath);
      execSync(
        `docker exec ${TestDatabase.POSTGRES_CONTAINER} rm -f /tmp/test-db-setup.sql`,
        { stdio: 'pipe' },
      );

      console.log('✓ Application user and permissions configured');
    } catch (error) {
      await this.teardown();
      throw new Error(`Failed to configure database: ${error}`);
    }

    try {
      // Step 3: Apply Prisma schema
      execSync('npx prisma db push --force-reset --skip-generate', {
        stdio: 'pipe',
        env: {
          ...process.env,
          DATABASE_URL: this.databaseUrl,
        },
      });
      console.log('✓ Schema synchronized');
    } catch (error) {
      await this.teardown();
      throw new Error(`Failed to sync schema: ${error}`);
    }
  }

  /**
   * Clean up and drop the test database
   */
  async teardown(): Promise<void> {
    try {
      // Terminate all connections
      this.execCommand(
        `psql -U ${TestDatabase.POSTGRES_USER} -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='${this.databaseName}' AND pid <> pg_backend_pid();"`,
      );

      // Drop the database
      this.execCommand(
        `dropdb -U ${TestDatabase.POSTGRES_USER} ${this.databaseName} --if-exists`,
      );
      console.log(`✓ Database cleaned up: ${this.databaseName}`);
    } catch (error) {
      console.error(`Warning: Could not clean up database ${this.databaseName}:`, error);
    }
  }

  /**
   * Truncate all tables (for cleanup between tests)
   */
  async truncateAll(): Promise<void> {
    try {
      const truncateSql = `
        DO $$
        DECLARE
          r RECORD;
        BEGIN
          FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
            EXECUTE 'TRUNCATE TABLE ' || quote_ident(r.tablename) || ' CASCADE';
          END LOOP;
        END $$;
      `;

      // Use a temp file for truncate as well to avoid escaping issues
      const tempSqlPath = join(tmpdir(), `truncate-${this.databaseName}.sql`);
      writeFileSync(tempSqlPath, truncateSql);

      execSync(
        `docker cp ${tempSqlPath} ${TestDatabase.POSTGRES_CONTAINER}:/tmp/truncate.sql`,
        { stdio: 'pipe' },
      );

      this.execCommand(
        `psql -U ${TestDatabase.POSTGRES_USER} -d ${this.databaseName} -f /tmp/truncate.sql`,
      );

      unlinkSync(tempSqlPath);
      execSync(
        `docker exec ${TestDatabase.POSTGRES_CONTAINER} rm -f /tmp/truncate.sql`,
        { stdio: 'pipe' },
      );
    } catch (error) {
      console.error('Failed to truncate tables:', error);
      throw error;
    }
  }

  /**
   * Execute a docker command on the PostgreSQL container
   */
  private execCommand(command: string): void {
    execSync(
      `docker exec -e PGPASSWORD=${TestDatabase.POSTGRES_PASSWORD} ${TestDatabase.POSTGRES_CONTAINER} ${command}`,
      {
        stdio: 'pipe',
      },
    );
  }
}
