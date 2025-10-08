import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { AUTH_MESSAGES } from '../src/constants/messages.js';
import { redisService } from '../src/services/redisClient.js';

describe('Authentication Endpoints', () => {
  let authTokens: { accessToken: string; refreshToken: string };
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
    if (authTokens) {
      await request(app).post('/internal/auth/logout').send({
        refreshToken: authTokens.refreshToken,
      });
    }
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
      expect(response.body).toHaveProperty(
        'message',
        AUTH_MESSAGES.SUCCESS.REGISTRATION,
      );
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('tokens');
      expect(response.body.user).toHaveProperty('email', testUser.email);
      expect(response.body.user).toHaveProperty('username', testUser.username);
      expect(response.body.user).not.toHaveProperty('passwordHash');
      expect(response.body.tokens).toHaveProperty('accessToken');
      expect(response.body.tokens).toHaveProperty('refreshToken');

      authTokens = response.body.tokens;
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
        email: testUser.email,
        password: testUser.password,
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty(
        'message',
        AUTH_MESSAGES.SUCCESS.LOGIN,
      );
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('tokens');
      expect(response.body.user).toHaveProperty('email', testUser.email);
      expect(response.body.tokens).toHaveProperty('accessToken');
      expect(response.body.tokens).toHaveProperty('refreshToken');

      // Update tokens for later tests
      authTokens = response.body.tokens;
    });

    it('should not login with missing credentials', async () => {
      const response = await request(app).post('/internal/auth/login').send({
        email: testUser.email,
        // missing password
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty(
        'error',
        AUTH_MESSAGES.ERRORS.EMAIL_PASSWORD_REQUIRED,
      );
    });

    it('should not login with invalid email', async () => {
      const response = await request(app).post('/internal/auth/login').send({
        email: 'nonexistent@example.com',
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
        email: testUser.email,
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
      const response = await request(app).post('/internal/auth/refresh').send({
        refreshToken: authTokens.refreshToken,
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty(
        'message',
        AUTH_MESSAGES.SUCCESS.TOKEN_REFRESH,
      );
      expect(response.body).toHaveProperty('tokens');
      expect(response.body.tokens).toHaveProperty('accessToken');
      expect(response.body.tokens).toHaveProperty('refreshToken');

      // Update tokens
      authTokens = response.body.tokens;
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
