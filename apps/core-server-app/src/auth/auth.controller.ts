import {
  Controller,
  Post,
  Get,
  Body,
  Res,
  Query,
  UseGuards,
  Param,
  BadRequestException,
  Req,
  Delete,
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
import { AccessGuard } from './guards';
import { ERROR_MESSAGES } from '../common/constants/messages';
import { getConfig } from '../config/config';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
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
  async signup(
    @Body() signUpDto: { email: string; username: string; password: string },
  ) {
    return this.authService.handleSignUp(signUpDto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', example: 'john@example.com' },
        password: { type: 'string', example: 'SecurePass123!' },
      },
      required: ['email', 'password'],
    },
  })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() credentials: { email: string; password: string }) {
    return this.authService.handleLogin(credentials);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
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
  @UseGuards(AccessGuard)
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
  @ApiOperation({ summary: 'Initiate OAuth login (e.g., Google)' })
  @ApiResponse({ status: 302, description: 'Redirects to OAuth provider' })
  @ApiResponse({ status: 400, description: 'Invalid provider' })
  async oauthLogin(@Param('provider') provider: string, @Res() res: Response) {
    if (!provider || provider.toLowerCase() !== 'google') {
      throw new BadRequestException(ERROR_MESSAGES.PROVIDER_REQUIRED);
    }

    const authServiceUrl = getConfig().authServiceUrl;
    res.redirect(`${authServiceUrl}/internal/auth/oauth/google`);
  }

  @Get('google/callback')
  @ApiExcludeEndpoint()
  async googleCallback(
    @Res() res: Response,
    @Query() query: Record<string, string>,
  ) {
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
  @ApiExcludeEndpoint()
  async verifyCredentials(
    @Body() credentials: { email: string; password: string },
  ) {
    return this.authService.verifyCredentials(credentials);
  }

  @Post('oauth')
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

  @Post('set-password')
  @UseGuards(AccessGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Set password for OAuth-only account' })
  async setPassword(
    @Body() body: { password: string },
    @Req() req: Request & { user: any },
  ) {
    return this.authService.setPassword(req.user.userId, body.password);
  }

  @Delete('unlink/:provider')
  @UseGuards(AccessGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Unlink OAuth provider' })
  async unlinkProvider(
    @Param('provider') provider: string,
    @Req() req: Request & { user: any },
  ) {
    return this.authService.unlinkProvider(req.user.userId, provider);
  }

  @Get('linked-accounts')
  @UseGuards(AccessGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get all linked accounts' })
  async getLinkedAccounts(@Req() req: Request & { user: any }) {
    return this.authService.getLinkedAccounts(req.user.userId);
  }
}
