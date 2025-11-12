import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import passport from 'passport';

import { config } from './config/config.js';
import authRoutes from './routes/authRoutes.js';
import healthRoutes from './routes/healthRoutes.js';
import { AUTH_MESSAGES } from './constants/messages.js';
import { setupGoogleStrategy } from './strategies/googleStrategy.js';

const app = express();
const PORT = config.port || 4000;

app.use(passport.initialize());
setupGoogleStrategy();

app.use(helmet()); // Security middleware

app.use(
  cors({
    origin: config.frontendUrl,
    credentials: true,
  }),
);

app.use(morgan('combined')); // Logging middleware

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // each IP can make up to 100 requests per `windowsMs` (15 minutes)
  standardHeaders: true, // add the `RateLimit-*` headers to the response// add the `RateLimit-*` headers to the response
  legacyHeaders: false, // remove the `X-RateLimit-*` headers from the response
});
app.use(limiter);

// Routes
app.use('/health', healthRoutes);
app.use('/internal/auth', authRoutes);

// Error handling middleware
app.use((err: Error, _req: express.Request, res: express.Response) => {
  console.error(err.stack);
  res.status(500).json({
    error: AUTH_MESSAGES.ERRORS.INTERNAL_SERVER_ERROR,
    message:
      config.nodeEnv === 'development'
        ? err.message
        : AUTH_MESSAGES.ERRORS.INTERNAL_SERVER_ERROR,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: AUTH_MESSAGES.ERRORS.ROUTE_NOT_FOUND });
});

app.listen(PORT, () => {
  console.log(`Auth service running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Detailed health: http://localhost:${PORT}/health/detailed`);
});

export default app;
