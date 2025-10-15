import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { AccountProvider } from '@prisma/client';
import { getConfig } from '../config/config';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from '../common/constants/messages';
import type {
  AuthResponse,
  TokenValidationResponse,
  RefreshTokenResponse,
  LogoutResponse,
  ErrorResponse,
  LoginCredentials,
  SignupData,
} from '@repo/shared-types';

@Injectable()
export class AuthService {
  private readonly authServiceUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly usersService: UsersService,
    private readonly prisma: PrismaService,
  ) {
    this.authServiceUrl = getConfig().authServiceUrl;
  }

  /**
   * Helper method to extract error message from Axios error
   */
  private getErrorMessage(error: unknown, defaultMessage: string): string {
    if (error instanceof AxiosError) {
      const errorData = error.response?.data as ErrorResponse | undefined;
      return errorData?.error || errorData?.message || defaultMessage;
    }
    if (error instanceof Error) {
      return error.message;
    }
    return defaultMessage;
  }

  /**
   * Forward signup request to Auth Service
   */
  async handleSignUp(signUpDto: SignupData): Promise<AuthResponse> {
    try {
      const response = await firstValueFrom(
        this.httpService.post<AuthResponse>(
          `${this.authServiceUrl}/internal/auth/register`,
          signUpDto,
        ),
      );
      return response.data;
    } catch (error) {
      throw new BadRequestException(
        this.getErrorMessage(error, ERROR_MESSAGES.REGISTRATION_FAILED),
      );
    }
  }

  /**
   * Forward login request to Auth Service
   */
  async handleLogin(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await firstValueFrom(
        this.httpService.post<AuthResponse>(
          `${this.authServiceUrl}/internal/auth/login`,
          credentials,
        ),
      );
      return response.data;
    } catch (error) {
      throw new UnauthorizedException(
        this.getErrorMessage(error, ERROR_MESSAGES.LOGIN_FAILED),
      );
    }
  }

  /**
   * Forward token refresh request to Auth Service
   */
  async handleRefresh(refreshToken: string): Promise<RefreshTokenResponse> {
    try {
      const response = await firstValueFrom(
        this.httpService.post<RefreshTokenResponse>(
          `${this.authServiceUrl}/internal/auth/refresh`,
          { refreshToken },
        ),
      );
      return response.data;
    } catch (error) {
      throw new UnauthorizedException(
        this.getErrorMessage(error, ERROR_MESSAGES.TOKEN_REFRESH_FAILED),
      );
    }
  }

  /**
   * Forward logout request to Auth Service
   */
  async handleLogout(refreshToken: string): Promise<LogoutResponse> {
    try {
      const response = await firstValueFrom(
        this.httpService.post<LogoutResponse>(
          `${this.authServiceUrl}/internal/auth/logout`,
          { refreshToken },
        ),
      );
      return response.data;
    } catch (error) {
      throw new BadRequestException(
        this.getErrorMessage(error, ERROR_MESSAGES.LOGOUT_FAILED),
      );
    }
  }

  /**
   * Validate access token via Auth Service
   */
  async validateToken(accessToken: string): Promise<TokenValidationResponse> {
    try {
      const response = await firstValueFrom(
        this.httpService.post<TokenValidationResponse>(
          `${this.authServiceUrl}/internal/auth/validate`,
          { accessToken },
        ),
      );
      return response.data;
    } catch {
      throw new UnauthorizedException(ERROR_MESSAGES.INVALID_TOKEN);
    }
  }

  /**
   * Validate and return user by ID
   */
  async validateUser(userId: string) {
    const user = await this.usersService.findOne(userId);

    if (!user || user.disabled) {
      throw new UnauthorizedException('User not found or disabled');
    }

    return user;
  }

  /**
   * Verify user credentials (called by Auth Service)
   * This is an internal endpoint
   * Supports login with email or username
   */
  async verifyCredentials(credentials: {
    identifier: string;
    password: string;
  }) {
    // Determine if identifier is email or username
    const isEmail = credentials.identifier.includes('@');

    type AccountWithUser = NonNullable<
      Awaited<
        ReturnType<
          typeof this.prisma.account.findFirst<{
            include: {
              user: {
                include: {
                  profile: true;
                };
              };
            };
          }>
        >
      >
    >;

    let account: AccountWithUser | null = null;

    if (isEmail) {
      // Find LOCAL account by email (skip OAuth accounts that don't have passwords)
      account = await this.prisma.account.findFirst({
        where: {
          email: credentials.identifier,
          provider: AccountProvider.LOCAL,
        },
        include: {
          user: {
            include: {
              profile: true,
            },
          },
        },
      });
    } else {
      // Find by username
      const profile = await this.prisma.profile.findUnique({
        where: { username: credentials.identifier },
        include: {
          user: {
            include: {
              accounts: true,
            },
          },
        },
      });

      if (profile && profile.user.accounts.length > 0) {
        // Get the LOCAL account for password verification
        const localAccount = profile.user.accounts.find(
          (acc) => acc.provider === 'LOCAL',
        );

        if (localAccount) {
          account = await this.prisma.account.findUnique({
            where: { id: localAccount.id },
            include: {
              user: {
                include: {
                  profile: true,
                },
              },
            },
          });
        }
      }
    }

    if (!account || !account.passwordHash) {
      throw new UnauthorizedException(ERROR_MESSAGES.INVALID_CREDENTIALS);
    }

    const isPasswordValid = await bcrypt.compare(
      credentials.password,
      account.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException(ERROR_MESSAGES.INVALID_CREDENTIALS);
    }

    if (account.user.disabled || account.user.profile?.deleted) {
      throw new UnauthorizedException(ERROR_MESSAGES.ACCOUNT_DISABLED);
    }

    // Update last login
    await this.prisma.account.update({
      where: { id: account.id },
      data: { lastLoginAt: new Date() },
    });

    return this.usersService.findOne(account.user.id);
  }

  async findOrCreateOAuthUser(oauthData: {
    provider: string;
    providerId: string;
    email: string;
    name: string;
    avatarUrl?: string;
  }) {
    // Validate email format
    if (!oauthData.email || !oauthData.email.includes('@')) {
      throw new BadRequestException(ERROR_MESSAGES.INVALID_EMAIL_FROM_PROVIDER);
    }

    const providerEnum = oauthData.provider.toUpperCase() as AccountProvider;

    // 1. Try to find existing OAuth account by provider + providerId
    const account = await this.prisma.account.findFirst({
      where: {
        provider: providerEnum,
        providerId: oauthData.providerId,
      },
      include: {
        user: {
          include: {
            profile: true,
          },
        },
      },
    });

    if (account) {
      // OAuth account exists - update last login and return user
      await this.prisma.account.update({
        where: { id: account.id },
        data: { lastLoginAt: new Date() },
      });

      return this.usersService.findOne(account.userId);
    }

    // 2. Check if user exists with this email (any provider)
    const existingUser = await this.prisma.account.findFirst({
      where: { email: oauthData.email },
      include: {
        user: {
          include: {
            profile: true,
          },
        },
      },
    });

    if (existingUser?.user) {
      // User exists with this email - CREATE NEW OAUTH ACCOUNT

      // Check if user already has this OAuth provider (prevent duplicates)
      const existingOAuthAccount = await this.prisma.account.findFirst({
        where: {
          userId: existingUser.userId,
          provider: providerEnum,
        },
      });

      if (existingOAuthAccount) {
        // User already linked this OAuth provider - just update providerId
        await this.prisma.account.update({
          where: { id: existingOAuthAccount.id },
          data: {
            providerId: oauthData.providerId,
            lastLoginAt: new Date(),
          },
        });
      } else {
        // Create new OAuth account for existing user
        await this.prisma.account.create({
          data: {
            userId: existingUser.userId,
            email: oauthData.email,
            provider: providerEnum,
            providerId: oauthData.providerId,
            passwordHash: null,
            lastLoginAt: new Date(),
            createdBy: existingUser.userId,
          },
        });
      }

      return this.usersService.findOne(existingUser.userId);
    }

    // 3. No user with this email - create new user with OAuth account

    // Generate username from email (max 40 chars, leaving room for counter)
    const emailLocalPart = oauthData.email?.split('@')[0] ?? 'user';
    const baseUsername = emailLocalPart.toLowerCase();
    const maxUsernameLength = 40;
    const truncatedBase = baseUsername.substring(0, maxUsernameLength);

    let username = truncatedBase;
    let counter = 1;

    while (await this.usersService.findByUsername(username)) {
      const suffix = counter.toString();
      const maxBaseLength = maxUsernameLength - suffix.length;
      username = `${truncatedBase.substring(0, maxBaseLength)}${counter}`;
      counter++;

      if (counter > 9999) {
        const randomSuffix = Math.random().toString(36).substring(2, 8);
        username = `${truncatedBase.substring(0, maxUsernameLength - 6)}${randomSuffix}`;
        break;
      }
    }

    // Truncate displayName to max 100 characters (database limit)
    const maxDisplayNameLength = 97;
    let displayName = oauthData.name || username;
    if (displayName.length > 100) {
      displayName = displayName.substring(0, maxDisplayNameLength) + '...';
    }

    // Create user with OAuth account
    const user = await this.usersService.create({
      email: oauthData.email,
      username,
      displayName,
      avatarUrl: oauthData.avatarUrl,
    });

    // Update the account to OAuth provider
    await this.prisma.account.updateMany({
      where: {
        userId: user.id,
        provider: AccountProvider.LOCAL,
      },
      data: {
        provider: providerEnum,
        providerId: oauthData.providerId,
        passwordHash: null,
        lastLoginAt: new Date(),
      },
    });

    // Refetch user with updated account information
    return this.usersService.findOne(user.id);
  }

  /**
   * Change password for users with LOCAL account (requires old password)
   */
  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
  ) {
    // Find LOCAL account
    const localAccount = await this.prisma.account.findFirst({
      where: {
        userId,
        provider: AccountProvider.LOCAL,
      },
    });

    if (!localAccount) {
      throw new BadRequestException(
        ERROR_MESSAGES.NO_LOCAL_ACCOUNT_FOR_PASSWORD_CHANGE,
      );
    }

    if (!localAccount.passwordHash) {
      throw new BadRequestException(ERROR_MESSAGES.NO_PASSWORD_SET);
    }

    // Verify old password
    const isOldPasswordValid = await bcrypt.compare(
      oldPassword,
      localAccount.passwordHash,
    );

    if (!isOldPasswordValid) {
      throw new UnauthorizedException(ERROR_MESSAGES.INVALID_OLD_PASSWORD);
    }

    // Validate new password is different
    if (oldPassword === newPassword) {
      throw new BadRequestException(ERROR_MESSAGES.NEW_PASSWORD_SAME_AS_OLD);
    }

    // Hash and update password
    const passwordHash = await bcrypt.hash(newPassword, 6);
    await this.prisma.account.update({
      where: { id: localAccount.id },
      data: {
        passwordHash,
        lastLoginAt: new Date(),
      },
    });

    return { message: SUCCESS_MESSAGES.PASSWORD_CHANGED };
  }

  /**
   * Set password for OAuth-only users (no old password required)
   */
  async setPassword(userId: string, password: string) {
    // Check if user already has LOCAL account
    const existingLocalAccount = await this.prisma.account.findFirst({
      where: {
        userId,
        provider: AccountProvider.LOCAL,
      },
    });

    if (existingLocalAccount) {
      // Update existing LOCAL account password
      const passwordHash = await bcrypt.hash(password, 6);
      await this.prisma.account.update({
        where: { id: existingLocalAccount.id },
        data: { passwordHash },
      });

      return { message: SUCCESS_MESSAGES.PASSWORD_UPDATED };
    }

    // Get user's email from any existing account
    const anyAccount = await this.prisma.account.findFirst({
      where: { userId },
    });

    if (!anyAccount) {
      throw new NotFoundException('User not found');
    }

    // Create new LOCAL account
    const passwordHash = await bcrypt.hash(password, 6);
    await this.prisma.account.create({
      data: {
        userId,
        email: anyAccount.email,
        provider: AccountProvider.LOCAL,
        passwordHash,
        createdBy: userId,
      },
    });

    return { message: SUCCESS_MESSAGES.PASSWORD_SET };
  }

  async unlinkProvider(userId: string, provider: string) {
    const providerEnum = provider.toUpperCase() as AccountProvider;

    // Check how many accounts user has
    const userAccounts = await this.prisma.account.findMany({
      where: { userId },
    });

    if (userAccounts.length <= 1) {
      throw new BadRequestException(
        'Cannot unlink last login method. Set a password first.',
      );
    }

    // Delete OAuth account
    const deleted = await this.prisma.account.deleteMany({
      where: {
        userId,
        provider: providerEnum,
      },
    });

    if (deleted.count === 0) {
      throw new NotFoundException(`${provider} account not found`);
    }

    return { message: `${provider} account unlinked successfully` };
  }

  async getLinkedAccounts(userId: string) {
    const accounts = await this.prisma.account.findMany({
      where: { userId },
      select: {
        id: true,
        provider: true,
        email: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    return {
      accounts: accounts.map((account) => ({
        provider: account.provider,
        email: account.email,
        lastUsed: account.lastLoginAt,
        linkedAt: account.createdAt,
        hasPassword: account.provider === 'LOCAL',
      })),
    };
  }
}
