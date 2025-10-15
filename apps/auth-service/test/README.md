# Auth Service Tests

## Test Setup

The auth service tests are integration tests that verify the authentication endpoints by making HTTP requests to both the auth service and the Core Service.

### Database Isolation

**Current Approach**: Test cleanup via HTTP API

The auth service tests interact with a running Core Service instance, which uses the main development database. To prevent test data pollution, tests clean up created users after completion using the `AuthServiceTestHelper` class.

```typescript
// In test file
import { AuthServiceTestHelper } from './setup.js';

const testHelper = new AuthServiceTestHelper();

afterAll(async () => {
  // Register all test user IDs created during tests
  if (testUserId) {
    testHelper.registerTestUser(testUserId);
  }

  // Clean up all test users from Core Service database
  await testHelper.cleanupTestUsers();
});
```

### Test Flow

1. **beforeAll**: Connect to Redis, flush Redis database
2. **Tests**: Create test users, perform auth operations
3. **afterAll**:
   - Logout (invalidate tokens in Redis)
   - Delete test users from Core Service database
   - Flush Redis
   - Disconnect from Redis

### Running Tests

```bash
# From auth-service directory
npm test

# Or from project root
npm test -- apps/auth-service
```

### Prerequisites

- Redis must be running (via Docker: `npm run docker:dev`)
- Core Service must be running on `http://localhost:8000`
- PostgreSQL must be running (via Docker)

### Alternative Approach: Isolated Test Database

For better test isolation, you could configure the Core Service to use a separate test database. This would require:

1. Creating a test database before tests run
2. Setting `TEST_DATABASE_URL` environment variable
3. Restarting Core Service with test database configuration
4. Cleaning up test database after tests complete

The code for this approach is available in `setup.ts` (commented out) but requires more complex infrastructure setup.

## Test Structure

### Files

- `auth.test.ts` - Main authentication endpoint tests
- `oauth.test.ts` - OAuth flow tests (Google login)
- `setup.ts` - Test utilities and cleanup helpers

### Test Suites

- **POST /internal/auth/register** - User registration
- **POST /internal/auth/login** - User login
- **POST /internal/auth/refresh** - Token refresh (skipped - requires Core Service test mode)
- **POST /internal/auth/validate** - Token validation (skipped - requires Core Service test mode)
- **POST /internal/auth/logout** - User logout
- **Health Check** - Service health endpoints

### Known Limitations

Some tests are skipped because they require the Core Service to validate user existence:

- **Token refresh**: Validates that the user in the refresh token still exists
- **Token validation**: Checks if the user in the access token still exists

These tests fail in the current setup because they try to fetch users from the Core Service, but the database connection in the running Core Service uses the main database which may not have the test user at the time of validation.

To enable these tests, you need to either:

1. Run Core Service in test mode with a dedicated test database
2. Mock the Core Service HTTP calls in auth service tests
3. Accept that these tests validate against the main development database

## Troubleshooting

### Tests create users in main database

This is expected behavior. Test cleanup removes these users after tests complete. If cleanup fails (test crash, etc.), you may need to manually delete test users from the database.

Test users are identifiable by their email/username pattern:

- Email: `authtest-[timestamp]@example.com`
- Username: `authtest[timestamp]`

### Tests fail with "Core Service unavailable"

Ensure the Core Service is running:

```bash
cd apps/core-server-app
npm run start:dev
```

### Redis connection errors

Ensure Redis is running:

```bash
npm run docker:dev
```

Check Redis is accessible at the configured port (6380 by default).
