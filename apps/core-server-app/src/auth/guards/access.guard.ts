import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from '../auth.service';
import { AuthenticatedRequest } from '@repo/shared-types';
import { ERROR_MESSAGES } from '../../common/constants/messages';

@Injectable()
export class AccessGuard implements CanActivate {
  constructor(private authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authHeader = request.headers.authorization;

    if (!authHeader || typeof authHeader !== 'string') {
      throw new UnauthorizedException(ERROR_MESSAGES.NO_AUTHORIZATION_HEADER);
    }

    const [bearer, token] = authHeader.split(' ');

    if (bearer !== 'Bearer' || !token) {
      throw new UnauthorizedException(
        ERROR_MESSAGES.INVALID_AUTHORIZATION_FORMAT,
      );
    }

    try {
      const validationResult = await this.authService.validateToken(token);

      if (!validationResult.valid || !validationResult.user) {
        throw new UnauthorizedException(ERROR_MESSAGES.INVALID_TOKEN);
      }
      request.user = validationResult.user;
      return true;
    } catch {
      throw new UnauthorizedException(ERROR_MESSAGES.INVALID_TOKEN);
    }
  }
}
