import { Router } from 'express';
import passport from 'passport';
import { AuthController } from '../controllers/authController.js';
import { config } from '../config/config.js';

const router = Router();

// Public routes (called by Core Service)
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/refresh', AuthController.refreshToken);
router.post('/validate', AuthController.validateToken);
router.post('/logout', AuthController.logout);

// OAuth routes with Passport
router.get(
  '/oauth/google',
  passport.authenticate('google', {
    session: false,
    scope: ['openid', 'email', 'profile'],
  }),
);

router.get(
  '/oauth/google/callback',
  (req, res, next) => {
    passport.authenticate('google', {
      session: false,
      failureRedirect: `${config.coreServiceUrl}/api/auth/google/callback?error=auth_failed`,
    })(req, res, (err) => {
      if (err) {
        console.error('OAuth authentication error:', err);
        return res.redirect(
          `${config.coreServiceUrl}/api/auth/google/callback?error=auth_failed`,
        );
      }
      next();
    });
  },
  AuthController.handleOAuthCallback,
);

export default router;
