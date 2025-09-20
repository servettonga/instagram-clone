import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { AUTH_MESSAGES } from '../src/constants/messages.js';

describe('Authentication Endpoints', () => {
  let authTokens: { accessToken: string; refreshToken: string };
  const testUser = {
    name: 'Test User',
    email: 'test@example.com',
    password: 'password123',
  };

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty(
        'message',
        AUTH_MESSAGES.SUCCESS.REGISTRATION,
      );
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('tokens');
      expect(response.body.user).toHaveProperty('email', testUser.email);
      expect(response.body.user).toHaveProperty('name', testUser.name);
      expect(response.body.user).not.toHaveProperty('passwordHash');
      expect(response.body.tokens).toHaveProperty('accessToken');
      expect(response.body.tokens).toHaveProperty('refreshToken');

      authTokens = response.body.tokens;
    });

    it('should not register user with missing fields', async () => {
      const response = await request(app).post('/api/auth/register').send({
        email: 'test2@example.com',
        // missing name and password
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty(
        'error',
        AUTH_MESSAGES.ERRORS.ALL_FIELDS_REQUIRED,
      );
    });

    it('should not register user with invalid email', async () => {
      const response = await request(app).post('/api/auth/register').send({
        name: 'Test User',
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
      const response = await request(app).post('/api/auth/register').send({
        name: 'Test User',
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
        .post('/api/auth/register')
        .send(testUser);

      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty(
        'error',
        AUTH_MESSAGES.ERRORS.USER_EXISTS,
      );
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login user successfully', async () => {
      const response = await request(app).post('/api/auth/login').send({
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
    });

    it('should not login with missing credentials', async () => {
      const response = await request(app).post('/api/auth/login').send({
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
      const response = await request(app).post('/api/auth/login').send({
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
      const response = await request(app).post('/api/auth/login').send({
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

  describe('POST /api/auth/refresh-token', () => {
    it('should refresh token successfully', async () => {
      const response = await request(app).post('/api/auth/refresh-token').send({
        refreshToken: authTokens.refreshToken,
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty(
        'message',
        AUTH_MESSAGES.SUCCESS.TOKEN_REFRESH,
      );
      expect(response.body).toHaveProperty('accessToken');
    });

    it('should not refresh with missing token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh-token')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty(
        'error',
        AUTH_MESSAGES.ERRORS.REFRESH_TOKEN_REQUIRED,
      );
    });

    it('should not refresh with invalid token', async () => {
      const response = await request(app).post('/api/auth/refresh-token').send({
        refreshToken: 'invalid-token',
      });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty(
        'error',
        AUTH_MESSAGES.ERRORS.INVALID_REFRESH_TOKEN,
      );
    });
  });

  describe('GET /api/auth/profile', () => {
    it('should get user profile with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${authTokens.accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty(
        'message',
        AUTH_MESSAGES.SUCCESS.PROFILE_RETRIEVED,
      );
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('email', testUser.email);
      expect(response.body.user).toHaveProperty('name', testUser.name);
      expect(response.body.user).not.toHaveProperty('passwordHash');
    });

    it('should not get profile without token', async () => {
      const response = await request(app).get('/api/auth/profile');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty(
        'error',
        AUTH_MESSAGES.ERRORS.ACCESS_TOKEN_REQUIRED,
      );
    });

    it('should not get profile with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty(
        'error',
        AUTH_MESSAGES.ERRORS.INVALID_TOKEN,
      );
    });
  });

  describe('POST /api/auth/validate-token', () => {
    it('should validate valid token', async () => {
      const response = await request(app)
        .post('/api/auth/validate-token')
        .set('Authorization', `Bearer ${authTokens.accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('valid', true);
      expect(response.body).toHaveProperty('user');
    });

    it('should not validate without token', async () => {
      const response = await request(app).post('/api/auth/validate-token');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty(
        'error',
        AUTH_MESSAGES.ERRORS.TOKEN_REQUIRED,
      );
    });

    it('should not validate invalid token', async () => {
      const response = await request(app)
        .post('/api/auth/validate-token')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('valid', false);
      expect(response.body).toHaveProperty(
        'error',
        AUTH_MESSAGES.ERRORS.INVALID_TOKEN,
      );
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout successfully', async () => {
      const response = await request(app).post('/api/auth/logout');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty(
        'message',
        AUTH_MESSAGES.SUCCESS.LOGOUT,
      );
    });
  });
});

describe('Health Check', () => {
  it('should return basic health status with formatted uptime', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('uptime');
    expect(response.body.uptime).toHaveProperty('seconds');
    expect(response.body.uptime).toHaveProperty('formatted');
    expect(typeof response.body.uptime.seconds).toBe('number');
    expect(typeof response.body.uptime.formatted).toBe('string');
  });

  it('should return detailed health with readable CPU info', async () => {
    const response = await request(app).get('/health/detailed');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('cpu');
    expect(response.body.cpu).toHaveProperty('user');
    expect(response.body.cpu).toHaveProperty('system');
    expect(response.body.cpu).toHaveProperty('total');
    expect(response.body.cpu.user).toHaveProperty('ms');
    expect(response.body.cpu.user).toHaveProperty('seconds');
    expect(response.body.memory).toHaveProperty('unit', 'MB');
    expect(response.body).toHaveProperty('node');
  });
});

describe('404 Handler', () => {
  it('should return 404 for unknown routes', async () => {
    const response = await request(app).get('/unknown-route');

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('error', 'Route not found');
  });
});
