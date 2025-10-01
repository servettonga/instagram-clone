// Extend Jest timeout for integration tests
jest.setTimeout(30000);

// Global setup - just verify infrastructure is ready
beforeAll(() => {
  console.log('Starting E2E tests...');

  // Verify Docker container is running
  const { execSync } = require('child_process');
  const POSTGRES_CONTAINER = process.env.POSTGRES_CONTAINER || 'intern_project_postgres_dev';

  try {
    execSync(`docker exec ${POSTGRES_CONTAINER} pg_isready`, {
      stdio: 'pipe',
    });
    console.log('✓ PostgreSQL container is ready');
  } catch (error) {
    throw new Error(
      'PostgreSQL container is not ready. Run: npm run docker:dev',
    );
  }
});

afterAll(() => {
  console.log('E2E tests completed');
});
