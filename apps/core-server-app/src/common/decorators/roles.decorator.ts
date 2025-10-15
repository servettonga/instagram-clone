import { SetMetadata } from '@nestjs/common';
import { ROLES_KEY } from '../guards/roles.guard';

/**
 * Decorator to specify which roles can access a route
 *
 * @example
 * @Roles('ADMIN')
 * @UseGuards(AccessGuard, RolesGuard)
 * async deleteUser() { ... }
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
