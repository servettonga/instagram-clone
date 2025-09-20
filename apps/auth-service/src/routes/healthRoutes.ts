import { Router, Request, Response } from 'express';
import { AUTH_MESSAGES } from '../constants/messages.js';

const router = Router();

// Helper function to format CPU usage
const formatCpuUsage = (cpuUsage: NodeJS.CpuUsage) => {
  // Convert microseconds to milliseconds and calculate percentages
  const userMs = Math.round(cpuUsage.user / 1000);
  const systemMs = Math.round(cpuUsage.system / 1000);
  const totalMs = userMs + systemMs;

  return {
    user: {
      ms: userMs,
      seconds: Math.round((userMs / 1000) * 100) / 100, // 2 decimal places
    },
    system: {
      ms: systemMs,
      seconds: Math.round((systemMs / 1000) * 100) / 100,
    },
    total: {
      ms: totalMs,
      seconds: Math.round((totalMs / 1000) * 100) / 100,
    },
  };
};

// Helper function to format uptime
const formatUptime = (uptime: number) => {
  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = Math.round(uptime % 60);

  return {
    seconds: Math.round(uptime * 100) / 100,
    formatted: `${hours}h ${minutes}m ${seconds}s`,
  };
};

// Health check endpoint
router.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    status: AUTH_MESSAGES.HEALTH.STATUS_OK,
    message: AUTH_MESSAGES.HEALTH.SERVICE_RUNNING,
    timestamp: new Date().toISOString(),
    service: 'auth-service',
    version: process.env.npm_package_version || '1.0.0',
    uptime: formatUptime(process.uptime()),
  });
});

// Detailed health check (for monitoring systems)
router.get('/detailed', (req: Request, res: Response) => {
  const memUsage = process.memoryUsage();

  res.status(200).json({
    status: AUTH_MESSAGES.HEALTH.STATUS_OK,
    message: AUTH_MESSAGES.HEALTH.SERVICE_RUNNING,
    timestamp: new Date().toISOString(),
    service: 'auth-service',
    version: process.env.npm_package_version || '1.0.0',
    uptime: formatUptime(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
    memory: {
      used: Math.round(memUsage.heapUsed / 1024 / 1024),
      total: Math.round(memUsage.heapTotal / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024),
      rss: Math.round(memUsage.rss / 1024 / 1024), // Resident Set Size
      arrayBuffers: Math.round(memUsage.arrayBuffers / 1024 / 1024),
      unit: 'MB',
    },
    cpu: formatCpuUsage(process.cpuUsage()),
    node: {
      version: process.version,
      platform: process.platform,
      arch: process.arch,
    },
  });
});

export default router;
