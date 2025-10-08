import { Router } from 'express';
import { redisService } from '../services/redisClient.js';
import { coreServiceClient } from '../services/coreServiceClient.js';
import { AUTH_MESSAGES } from '../constants/messages.js';

const router = Router();

router.get('/', (req, res) => {
  res.status(200).json({
    status: AUTH_MESSAGES.HEALTH.STATUS_OK,
    message: AUTH_MESSAGES.HEALTH.SERVICE_RUNNING,
    timestamp: new Date().toISOString(),
  });
});

router.get('/detailed', async (req, res) => {
  const redisInfo = await redisService.getInfo();
  const coreServiceHealthy = await coreServiceClient.healthCheck();

  res.status(200).json({
    status: AUTH_MESSAGES.HEALTH.STATUS_OK,
    service: 'auth-service',
    timestamp: new Date().toISOString(),
    redis: {
      connected: redisInfo.connected,
      usedMemory: redisInfo.usedMemory,
      totalKeys: redisInfo.totalKeys,
    },
    coreService: {
      healthy: coreServiceHealthy,
    },
  });
});

export default router;
