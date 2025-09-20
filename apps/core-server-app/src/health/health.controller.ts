import { Controller, Get } from '@nestjs/common';
import {
  HealthCheckService,
  HealthCheck,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PrismaHealthIndicator } from './indicators/prisma-health.indicator';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prismaHealthIndicator: PrismaHealthIndicator,
    private readonly memoryHealthIndicator: MemoryHealthIndicator,
    private readonly diskHealthIndicator: DiskHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Get application health status' })
  @ApiResponse({
    status: 200,
    description: 'Health check passed',
  })
  @ApiResponse({
    status: 503,
    description: 'Health check failed',
  })
  async check() {
    return this.health.check([
      // Database health check
      async () => this.prismaHealthIndicator.isHealthy('database'),

      // Memory health checks (with reasonable limits)
      async () =>
        this.memoryHealthIndicator.checkHeap('memory_heap', 512 * 1024 * 1024), // 512MB
      async () =>
        this.memoryHealthIndicator.checkRSS('memory_rss', 512 * 1024 * 1024), // 512MB

      // Disk health check (90% threshold)
      async () =>
        this.diskHealthIndicator.checkStorage('storage', {
          thresholdPercent: 0.9,
          path: '/',
        }),
    ]);
  }

  @Get('ready')
  @ApiOperation({
    summary: 'Get application readiness status (for Kubernetes)',
  })
  @ApiResponse({
    status: 200,
    description: 'Application is ready',
  })
  @HealthCheck()
  async readiness() {
    return this.health.check([
      // Only check critical dependencies for readiness
      async () => this.prismaHealthIndicator.isHealthy('database'),
    ]);
  }

  @Get('live')
  @ApiOperation({ summary: 'Get application liveness status (for Kubernetes)' })
  @ApiResponse({
    status: 200,
    description: 'Application is alive',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        timestamp: { type: 'string', example: '2025-09-14T00:00:00.000Z' },
        uptime: { type: 'number', example: 123.456 },
        version: { type: 'string', example: '1.0.0' },
        environment: { type: 'string', example: 'development' },
      },
    },
  })
  liveness() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    };
  }
}
