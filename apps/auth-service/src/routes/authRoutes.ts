import { Router, Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { AuthController } from '../controllers/authController.js';
import { config } from '../config/config.js';

const router = Router();

// Public routes (called by Core Service)
router.post('/register', (req, res) => AuthController.register(req, res));
router.post('/login', (req, res) => AuthController.login(req, res));
router.post('/refresh', (req, res) => AuthController.refreshToken(req, res));
router.post('/validate', (req, res) => AuthController.validateToken(req, res));
router.post('/logout', (req, res) => AuthController.logout(req, res));

// Password reset routes
router.post('/forgot-password', (req, res) =>
  AuthController.forgotPassword(req, res),
);
router.post('/reset-password', (req, res) =>
  AuthController.resetPassword(req, res),
);

// OAuth session routes (for account selection)
router.get('/oauth/session/:sessionId', (req, res) =>
  AuthController.getOAuthSession(req, res),
);
router.post('/oauth/link', (req, res) =>
  AuthController.linkOAuthAccount(req, res),
);

// OAuth routes with Passport
router.get(
  '/oauth/google',
  passport.authenticate('google', {
    session: false,
    scope: ['openid', 'email', 'profile'],
  }) as (req: Request, res: Response, next: NextFunction) => void,
);

router.get(
  '/oauth/google/callback',
  (req: Request, res: Response, next: NextFunction) => {
    const authenticator = passport.authenticate('google', {
      session: false,
      failureRedirect: `${config.coreServiceUrl}/api/auth/google/callback?error=auth_failed`,
    }) as (req: Request, res: Response, next: (err?: Error) => void) => void;

    authenticator(req, res, (err?: Error) => {
      if (err) {
        console.error('OAuth authentication error:', err);
        return res.redirect(
          `${config.coreServiceUrl}/api/auth/google/callback?error=auth_failed`,
        );
      }
      next();
    });
  },
  (req, res) => AuthController.handleOAuthCallback(req, res),
);

export default router;
