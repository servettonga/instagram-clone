/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { AUTH_MESSAGES } from '../src/constants/messages.js';
import { redisService } from '../src/services/redisClient.js';
import { AuthServiceTestHelper } from './setup.js';

describe('Authentication Endpoints', () => {
  let authTokens: { accessToken: string; refreshToken: string } | undefined;
  let testUserId: string | undefined;
  const testHelper = new AuthServiceTestHelper();
  const testUser = {
    email: `authtest-${Date.now()}@example.com`,
    username: `authtest${Date.now()}`,
    password: 'SecurePass123!',
  };

  beforeAll(async () => {
    // Connect to Redis
    const client = redisService.getClient();
    if (client.status !== 'ready' && client.status !== 'connecting') {
      await redisService.connect();
    }
    // Clean Redis ONCE before all tests start
    await client.flushdb();
  });

  afterAll(async () => {
    // Clean up ONCE after all tests finish

    // 1. Logout to invalidate tokens
    if (authTokens) {
      await request(app).post('/internal/auth/logout').send({
        refreshToken: authTokens.refreshToken,
      });
    }

    // 2. Clean up test user from Core Service database
    if (testUserId) {
      testHelper.registerTestUser(testUserId);
    }
    await testHelper.cleanupTestUsers();

    // 3. Disconnect from Redis
    const client = redisService.getClient();
    await client.flushdb();
    await redisService.disconnect();
  });

  describe('POST /internal/auth/register', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/internal/auth/register')
        .send(testUser);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('tokens');
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user).toHaveProperty('profile');
      expect(response.body.user.profile).toHaveProperty(
        'username',
        testUser.username,
      );
      expect(response.body.user).toHaveProperty('accounts');
      expect(response.body.user.accounts[0]).toHaveProperty(
        'email',
        testUser.email,
      );
      expect(response.body.user).not.toHaveProperty('passwordHash');
      expect(response.body.tokens).toHaveProperty('accessToken');
      expect(response.body.tokens).toHaveProperty('refreshToken');

      authTokens = response.body.tokens;

      // Store user ID for cleanup
      testUserId = response.body.user.id;
    });

    it('should not register user with missing fields', async () => {
      const response = await request(app).post('/internal/auth/register').send({
        email: 'test2@example.com',
        // missing username and password
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty(
        'error',
        AUTH_MESSAGES.ERRORS.ALL_FIELDS_REQUIRED,
      );
    });

    it('should not register user with invalid email', async () => {
      const response = await request(app).post('/internal/auth/register').send({
        username: 'testuser',
        email: 'invalid-email',
        password: 'password123',
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty(
        'error',
        AUTH_MESSAGES.ERRORS.INVALID_EMAIL_FORMAT,
      );
    });

    it('should not register user with short password', async () => {
      const response = await request(app).post('/internal/auth/register').send({
        username: 'testuser',
        email: 'test3@example.com',
        password: '123',
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty(
        'error',
        AUTH_MESSAGES.ERRORS.PASSWORD_MIN_LENGTH,
      );
    });

    it('should not register user with existing email', async () => {
      const response = await request(app)
        .post('/internal/auth/register')
        .send(testUser);

      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty(
        'error',
        AUTH_MESSAGES.ERRORS.USER_EXISTS,
      );
    });
  });

  describe('POST /internal/auth/login', () => {
    it('should login user successfully', async () => {
      const response = await request(app).post('/internal/auth/login').send({
        identifier: testUser.email,
        password: testUser.password,
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('tokens');
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user.accounts[0]).toHaveProperty(
        'email',
        testUser.email,
      );
      expect(response.body.tokens).toHaveProperty('accessToken');
      expect(response.body.tokens).toHaveProperty('refreshToken');

      // Update tokens for later tests
      authTokens = response.body.tokens;

      // Verify tokens were updated
      if (!authTokens) {
        throw new Error('Failed to update authTokens from login response');
      }
      expect(authTokens.accessToken).toBeTruthy();
      expect(authTokens.refreshToken).toBeTruthy();
      console.log('Login successful, tokens updated for subsequent tests');
    });

    it('should not login with missing credentials', async () => {
      const response = await request(app).post('/internal/auth/login').send({
        identifier: testUser.email,
        // missing password
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty(
        'error',
        AUTH_MESSAGES.ERRORS.IDENTIFIER_PASSWORD_REQUIRED,
      );
    });

    it('should not login with invalid email', async () => {
      const response = await request(app).post('/internal/auth/login').send({
        identifier: 'nonexistent@example.com',
        password: testUser.password,
      });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty(
        'error',
        AUTH_MESSAGES.ERRORS.INVALID_CREDENTIALS,
      );
    });

    it('should not login with invalid password', async () => {
      const response = await request(app).post('/internal/auth/login').send({
        identifier: testUser.email,
        password: 'wrong_password',
      });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty(
        'error',
        AUTH_MESSAGES.ERRORS.INVALID_CREDENTIALS,
      );
    });
  });

  describe('POST /internal/auth/refresh', () => {
    it('should refresh token successfully', async () => {
      // Ensure to have valid tokens from login
      if (!authTokens || !authTokens.refreshToken) {
        throw new Error('authTokens not set from login test');
      }

      const response = await request(app).post('/internal/auth/refresh').send({
        refreshToken: authTokens.refreshToken,
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');

      // Update tokens
      authTokens = {
        accessToken: response.body.accessToken,
        refreshToken: response.body.refreshToken,
      };
    });

    it('should not refresh with missing token', async () => {
      const response = await request(app)
        .post('/internal/auth/refresh')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty(
        'error',
        AUTH_MESSAGES.ERRORS.REFRESH_TOKEN_REQUIRED,
      );
    });

    it('should not refresh with invalid token', async () => {
      const response = await request(app).post('/internal/auth/refresh').send({
        refreshToken: 'invalid-token',
      });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty(
        'error',
        AUTH_MESSAGES.ERRORS.INVALID_REFRESH_TOKEN,
      );
    });
  });

  describe('POST /internal/auth/validate', () => {
    it('should validate valid token', async () => {
      // Ensure to have valid tokens
      if (!authTokens || !authTokens.accessToken) {
        throw new Error('authTokens not set from previous tests');
      }

      const response = await request(app)
        .post('/internal/auth/validate')
        .send({ accessToken: authTokens.accessToken });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('valid', true);
      expect(response.body).toHaveProperty('user');
    });

    it('should not validate without token', async () => {
      const response = await request(app)
        .post('/internal/auth/validate')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty(
        'error',
        AUTH_MESSAGES.ERRORS.ACCESS_TOKEN_REQUIRED,
      );
    });

    it('should not validate invalid token', async () => {
      const response = await request(app)
        .post('/internal/auth/validate')
        .send({ accessToken: 'invalid-token' });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('valid', false);
    });
  });

  describe('POST /internal/auth/logout', () => {
    it('should logout successfully', async () => {
      if (!authTokens || !authTokens.refreshToken) {
        throw new Error('authTokens not set from previous tests');
      }

      const response = await request(app)
        .post('/internal/auth/logout')
        .send({ refreshToken: authTokens.refreshToken });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty(
        'message',
        AUTH_MESSAGES.SUCCESS.LOGOUT,
      );
    });

    it('should not use refresh token after logout', async () => {
      if (!authTokens || !authTokens.refreshToken) {
        throw new Error('authTokens not set from previous tests');
      }

      const response = await request(app).post('/internal/auth/refresh').send({
        refreshToken: authTokens.refreshToken,
      });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty(
        'error',
        AUTH_MESSAGES.ERRORS.INVALID_REFRESH_TOKEN,
      );
    });
  });
});

describe('Health Check', () => {
  it('should return basic health status', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status');
  });

  it('should return detailed health with Redis status', async () => {
    const response = await request(app).get('/health/detailed');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('redis');
    expect(response.body.redis).toHaveProperty('connected');
  });
});
