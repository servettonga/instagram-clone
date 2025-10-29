import {
  Controller,
  Post,
  Get,
  Body,
  Res,
  Query,
  Param,
  BadRequestException,
  Req,
  Delete,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiExcludeEndpoint,
  ApiBearerAuth,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { ERROR_MESSAGES } from '../common/constants/messages';
import { getConfig } from '../config/config';
import { AccessGuard } from './guards/access.guard';
import { Public } from './decorators/public.decorator';
import type {
  LoginCredentials,
  SignupData,
  AuthResponse,
  AuthenticatedRequest,
} from '@repo/shared-types';

@ApiTags('Authentication')
@Controller('auth')
@UseGuards(AccessGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  @Public()
  @ApiOperation({ summary: 'Register a new user' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', example: 'john@example.com' },
        username: { type: 'string', example: 'johndoe' },
        password: { type: 'string', example: 'SecurePass123!' },
      },
      required: ['email', 'username', 'password'],
    },
  })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 409, description: 'Email or username already exists' })
  async signup(@Body() signUpDto: SignupData): Promise<AuthResponse> {
    return this.authService.handleSignUp(signUpDto);
  }

  @Post('login')
  @Public()
  @ApiOperation({ summary: 'Login user' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        identifier: { type: 'string', example: 'john@example.com or johndoe' },
        password: { type: 'string', example: 'SecurePass123!' },
      },
      required: ['identifier', 'password'],
    },
  })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() credentials: LoginCredentials): Promise<AuthResponse> {
    return this.authService.handleLogin(credentials);
  }

  @Post('refresh')
  @Public()
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        refreshToken: { type: 'string' },
      },
      required: ['refreshToken'],
    },
  })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refresh(@Body() body: { refreshToken: string }) {
    return this.authService.handleRefresh(body.refreshToken);
  }

  @Post('logout')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Logout user (requires valid access token)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        refreshToken: { type: 'string' },
      },
      required: ['refreshToken'],
    },
  })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async logout(@Body() body: { refreshToken: string }) {
    return this.authService.handleLogout(body.refreshToken);
  }

  @Get('login/:provider')
  @Public()
  @ApiOperation({ summary: 'Initiate OAuth login' })
  @ApiResponse({ status: 302, description: 'Redirects to OAuth provider' })
  @ApiResponse({ status: 400, description: 'Invalid provider' })
  oauthLogin(@Param('provider') provider: string, @Res() res: Response) {
    if (!provider || provider.toLowerCase() !== 'google') {
      throw new BadRequestException(ERROR_MESSAGES.PROVIDER_REQUIRED);
    }

    const authServiceUrl = getConfig().authServiceUrl;
    res.redirect(`${authServiceUrl}/internal/auth/oauth/google`);
  }

  @Get('google/callback')
  @Public()
  @ApiOperation({ summary: 'OAuth callback handler' })
  googleCallback(@Res() res: Response, @Query() query: Record<string, string>) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const { accessToken, refreshToken, error } = query;

    if (error) {
      console.error('OAuth error:', error);
      return res.redirect(
        `${frontendUrl}/auth/error?error=${encodeURIComponent(error)}`,
      );
    }

    if (!accessToken || !refreshToken) {
      console.error('Missing tokens in callback');
      return res.redirect(`${frontendUrl}/auth/error?error=missing_tokens`);
    }

    res.redirect(
      `${frontendUrl}/auth/callback?accessToken=${accessToken}&refreshToken=${refreshToken}`,
    );
  }

  @Post('verify-credentials')
  @Public()
  @ApiExcludeEndpoint()
  async verifyCredentials(@Body() credentials: LoginCredentials) {
    return this.authService.verifyCredentials(credentials);
  }

  @Post('oauth')
  @Public()
  @ApiExcludeEndpoint()
  async handleOAuth(
    @Body()
    oauthData: {
      provider: string;
      providerId: string;
      email: string;
      name: string;
      avatarUrl?: string;
    },
  ) {
    return this.authService.findOrCreateOAuthUser(oauthData);
  }

  @Post('change-password')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Change password (requires current password)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        oldPassword: { type: 'string', example: 'CurrentPass123!' },
        newPassword: { type: 'string', example: 'NewPass123!' },
      },
      required: ['oldPassword', 'newPassword'],
    },
  })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({
    status: 400,
    description: 'Invalid old password or validation error',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async changePassword(
    @Body() body: { oldPassword: string; newPassword: string },
    @Req() req: AuthenticatedRequest,
  ) {
    return this.authService.changePassword(
      req.user!.id,
      body.oldPassword,
      body.newPassword,
    );
  }

  @Post('set-password')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Set password for OAuth-only account' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        password: { type: 'string', example: 'SecurePass123!' },
      },
      required: ['password'],
    },
  })
  @ApiResponse({ status: 200, description: 'Password set successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async setPassword(
    @Body() body: { password: string },
    @Req() req: AuthenticatedRequest,
  ) {
    return this.authService.setPassword(req.user!.id, body.password);
  }

  @Delete('unlink/:provider')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Unlink OAuth provider' })
  async unlinkProvider(
    @Param('provider') provider: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.authService.unlinkProvider(req.user!.id, provider);
  }

  @Get('linked-accounts')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get all linked accounts' })
  async getLinkedAccounts(@Req() req: AuthenticatedRequest) {
    return this.authService.getLinkedAccounts(req.user!.id);
  }

  /**
   * Used by: AuthProvider on app initialization
   */
  @Get('me')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current user' })
  @ApiResponse({ status: 200, description: 'Current user data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCUrrentUser(@Req() req: AuthenticatedRequest) {
    // AccessGuard already validates token and attaches user to request
    return this.authService.validateUser(req.user!.id);
  }
}
