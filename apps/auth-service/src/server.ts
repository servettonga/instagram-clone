import app from './app.js';
import { config } from './config/config.js';
import { redisService } from './services/redisClient.js';

const PORT = config.port || 4000;

// Connect to Redis and start server
redisService
  .connect()
  .then(() => {
    console.log('✓ Redis connected successfully');

    app.listen(PORT, () => {
      console.log(`Auth service running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
      console.log(`Detailed health: http://localhost:${PORT}/health/detailed`);
    });
  })
  .catch((err) => {
    console.error('Failed to connect to Redis:', err);
    process.exit(1);
  });

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  void redisService.disconnect().then(() => process.exit(0));
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  void redisService.disconnect().then(() => process.exit(0));
});
