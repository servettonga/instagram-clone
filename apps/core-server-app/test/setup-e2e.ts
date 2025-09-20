import { execSync } from 'child_process';

// Extend Jest timeout for integration tests
jest.setTimeout(30000);

// Global setup flag to ensure database setup runs only once
let isSetupComplete = false;

// Set up test database before all tests
beforeAll(() => {
  if (isSetupComplete) {
    return;
  }

  console.log('Setting up test database...');

  // Set test environment variables
  process.env.DATABASE_URL =
    'postgresql://postgres:password@localhost:5432/polaroid_clone_test?schema=public';
  process.env.NODE_ENV = 'test';

  try {
    // Create test database if it doesn't exist (suppress output)
    try {
      execSync('docker exec postgres-temp createdb -U postgres polaroid_test', {
        stdio: 'pipe',
      });
      console.log('Test database created');
    } catch (error) {
      // Database might already exist
      console.log('Test database already exists');
    }

    // Reset and sync Prisma schema to test database
    execSync('npx prisma db push --force-reset --skip-generate', {
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
      stdio: 'pipe', // Suppress output to avoid conflicts
    });

    console.log('Test database schema synchronized');
    isSetupComplete = true;
  } catch (error) {
    console.error('Failed to setup test database:', error);
    throw error;
  }
});

// Clean up after all tests
afterAll(() => {
  try {
    execSync(
      'docker exec postgres-temp dropdb -U postgres polaroid_test --if-exists',
      {
        stdio: 'pipe',
      },
    );
    console.log('Test database cleaned up');
  } catch (error) {
    console.log('Could not clean up test database:', error.message);
  }
});
