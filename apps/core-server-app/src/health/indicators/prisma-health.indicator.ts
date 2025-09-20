import { Injectable } from '@nestjs/common';
import {
  HealthIndicatorService,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PrismaHealthIndicator {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly healthIndicatorService: HealthIndicatorService,
  ) {}

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const indicator = this.healthIndicatorService.check(key);

    try {
      // Simple database connectivity check
      await this.prismaService.$queryRaw`SELECT 1`;

      return indicator.up();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Database connection failed';
      return indicator.down(errorMessage);
    }
  }
}
