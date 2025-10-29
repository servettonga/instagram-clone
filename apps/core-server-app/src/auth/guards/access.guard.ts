import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from '../auth.service';
import { AuthenticatedRequest } from '@repo/shared-types';
import { ERROR_MESSAGES } from '../../common/constants/messages';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class AccessGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if the route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

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
      // Verify JWT locally instead of calling auth service
      interface JwtPayload {
        userId: string;
        email: string;
        jti: string;
        iat?: number;
        exp?: number;
      }

      let payload: JwtPayload;
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        const decoded = this.jwtService.verify(token);
        payload = decoded as JwtPayload;
      } catch {
        throw new UnauthorizedException(ERROR_MESSAGES.INVALID_TOKEN);
      }

      // Get user from database (with caching if available)
      const user = await this.authService.validateUser(payload.userId);

      if (!user) {
        throw new UnauthorizedException(ERROR_MESSAGES.INVALID_TOKEN);
      }

      request.user = user;
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException(ERROR_MESSAGES.INVALID_TOKEN);
    }
  }
}
