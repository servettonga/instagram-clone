import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { config } from '../config/config.js';
import { coreServiceClient } from '../services/coreServiceClient.js';

export function setupGoogleStrategy() {
  passport.use(
    new GoogleStrategy(
      {
        clientID: config.oauth.google.clientId,
        clientSecret: config.oauth.google.clientSecret,
        callbackURL: config.oauth.google.redirectUri,
        scope: ['profile', 'email'],
        passReqToCallback: false,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Extract user data from Google profile
          const email = profile.emails?.[0]?.value;
          if (!email) {
            return done(new Error('No email from Google'), undefined);
          }

          const userData = {
            provider: 'GOOGLE',
            providerId: profile.id,
            email,
            name: profile.displayName,
            avatarUrl: profile.photos?.[0]?.value,
          };

          // Find or create user via Core Service
          const user = await coreServiceClient.findOrCreateOAuthUser(userData);

          done(null, user);
        } catch (error) {
          console.error('Google OAuth error:', error);
          done(error as Error, undefined);
        }
      },
    ),
  );

  // Serialize/deserialize not needed for stateless JWT auth
  passport.serializeUser((user, done) => done(null, user));
  passport.deserializeUser((user, done) => done(null, user as Express.User));
}
