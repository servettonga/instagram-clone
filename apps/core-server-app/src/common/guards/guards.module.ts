import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { UsersModule } from '../../users/users.module';
import { AccessGuard } from '../../auth/guards/access.guard';
import { OwnershipGuard } from './ownership.guard';

/**
 * GuardsModule
 *
 * This module resolves the circular dependency between AuthModule and UsersModule
 * by importing both and providing guards that depend on both services.
 *
 */
@Module({
  imports: [AuthModule, UsersModule],
  providers: [AccessGuard, OwnershipGuard],
  exports: [AccessGuard, OwnershipGuard],
})
export class GuardsModule {}
