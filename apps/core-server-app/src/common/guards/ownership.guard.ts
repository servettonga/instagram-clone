import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { AuthenticatedRequest, UserRole } from '@repo/shared-types';
import { ERROR_MESSAGES } from '../constants/messages';

/**
 * Guard that checks if the authenticated user is the owner of the resource
 * or is an ADMIN. Should be used after AccessGuard.
 *
 * Expects the resource user ID to be in the route parameter 'id'
 */
@Injectable()
export class OwnershipGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;
    const resourceUserId = request.params['id']; // User ID from route param

    if (!user) {
      throw new ForbiddenException(ERROR_MESSAGES.UNAUTHORIZED);
    }

    // Allow ADMIN to access any resource
    if (user.role === UserRole.ADMIN) {
      return true;
    }

    // Check if user is the owner
    if (user.id !== resourceUserId) {
      throw new ForbiddenException(ERROR_MESSAGES.NOT_RESOURCE_OWNER);
    }

    return true;
  }
}
