import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { redisService } from '../src/services/redisClient.js';

describe('OAuth Endpoints', () => {
  beforeAll(async () => {
    // Only connect if not already connected
    const client = redisService.getClient();
    if (client.status !== 'ready' && client.status !== 'connecting') {
      await redisService.connect();
    }
  });

  describe('GET /internal/auth/oauth/google', () => {
    it('should redirect to Google OAuth page', async () => {
      const response = await request(app)
        .get('/internal/auth/oauth/google')
        .expect(302); // Redirect

      // Should redirect to Google OAuth
      expect(response.headers.location).toContain(
        'https://accounts.google.com/o/oauth2/v2/auth',
      );
      expect(response.headers.location).toContain('client_id');
      expect(response.headers.location).toContain('redirect_uri');
      expect(response.headers.location).toContain('scope');
    });
  });

  describe('GET /internal/auth/oauth/google/callback', () => {
    it('should handle missing code parameter', async () => {
      const response = await request(app)
        .get('/internal/auth/oauth/google/callback')
        .expect(302); // Redirect

      // Passport re-initiates OAuth flow when code is missing
      expect(response.headers.location).toContain(
        'https://accounts.google.com/o/oauth2/v2/auth',
      );
    });

    it('should handle invalid authorization code', async () => {
      const response = await request(app)
        .get(
          '/internal/auth/oauth/google/callback?code=invalid-code&state=test',
        )
        .expect(302); // Redirect to Core Service with error

      // Should redirect to Core Service callback with error
      expect(response.headers.location).toContain('/api/auth/google/callback');
      expect(response.headers.location).toContain('error=');
    });
  });
});
