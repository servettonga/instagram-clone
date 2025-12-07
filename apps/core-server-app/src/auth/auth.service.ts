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
import { NotificationProducerService } from '../notifications/services/notification-producer.service';
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
  AccountOption,
  AuthTokens,
} from '@repo/shared-types';

@Injectable()
export class AuthService {
  private readonly authServiceUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly usersService: UsersService,
    private readonly prisma: PrismaService,
    private readonly notificationProducer: NotificationProducerService,
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
   * Get OAuth session data (for account selection)
   */
  async getOAuthSession(sessionId: string): Promise<{
    email: string;
    provider: string;
    providerId: string;
    multipleAccounts: AccountOption[];
  }> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.authServiceUrl}/internal/auth/oauth/session/${sessionId}`,
        ),
      );
      return response.data as {
        email: string;
        provider: string;
        providerId: string;
        multipleAccounts: AccountOption[];
      };
    } catch (error) {
      throw new BadRequestException(
        this.getErrorMessage(error, 'OAuth session not found or expired'),
      );
    }
  }

  /**
   * Link OAuth account to selected user
   */
  async linkOAuthAccount(data: {
    sessionId: string;
    userId: string;
  }): Promise<{ tokens: AuthTokens }> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.authServiceUrl}/internal/auth/oauth/link`,
          data,
        ),
      );
      return response.data as { tokens: AuthTokens };
    } catch (error) {
      throw new BadRequestException(
        this.getErrorMessage(error, 'Failed to link OAuth account'),
      );
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
   * Returns user data + list of other accounts if multiple exist
   */
  async verifyCredentials(credentials: {
    identifier: string;
    password: string;
    selectedUserId?: string; // Optional: select specific account
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

    // 1. Check if multiple users exist with this email (always check first)
    const existingAccounts = await this.prisma.account.findMany({
      where: { email: oauthData.email },
      include: {
        user: {
          include: {
            profile: true,
          },
        },
      },
    });

    // 2. Try to find existing OAuth account by provider + providerId
    const existingOAuthAccount = await this.prisma.account.findFirst({
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

    if (existingAccounts.length > 0) {
      // Get unique user IDs (multiple accounts might belong to same user)
      const uniqueUserIds = Array.from(
        new Set(existingAccounts.map((acc) => acc.userId)),
      );

      // Check if any users are soft-deleted and restore them (if within 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      for (const account of existingAccounts) {
        const user = account.user;
        if (user.disabled || user.profile?.deleted) {
          // Check if deleted within last 30 days
          if (user.profile?.deletedAt && user.profile.deletedAt < thirtyDaysAgo) {
            throw new BadRequestException(
              'This account was deleted more than 30 days ago and cannot be restored. Please contact support or create a new account.',
            );
          }

          // Restore soft-deleted user and profile
          await this.prisma.user.update({
            where: { id: user.id },
            data: { disabled: false },
          });
          if (user.profile) {
            await this.prisma.profile.update({
              where: { userId: user.id },
              data: { deleted: false, deletedAt: null },
            });
          }
        }
      }

      if (uniqueUserIds.length > 1) {
        // Multiple users with this email - need account selection
        // ALWAYS show account selector, even if OAuth account already exists

        // Fetch full user data for each unique user
        const users = await this.prisma.user.findMany({
          where: { id: { in: uniqueUserIds } },
          include: { profile: true },
        });

        const accountOptions = users
          .filter((user) => user.profile !== null)
          .map((user) => ({
            userId: user.id,
            username: user.profile!.username,
            displayName: user.profile!.displayName || user.profile!.username,
            avatarUrl: user.profile!.avatarUrl || null,
          }));

        // If OAuth account already exists, use that user as the default
        // Otherwise use first user
        const firstUser = users.find((u) => u.profile !== null);
        if (!firstUser) {
          throw new BadRequestException('No valid users found with this email');
        }

        const defaultUserId = existingOAuthAccount
          ? existingOAuthAccount.userId
          : firstUser.id;

        const defaultUser = await this.usersService.findOne(defaultUserId);

        return {
          ...defaultUser,
          multipleAccounts: accountOptions,
        };
      }

      // Single user found - check if OAuth already linked
      const existingAccount = existingAccounts[0];
      if (!existingAccount) {
        throw new BadRequestException('No account found');
      }
      const userId = existingAccount.userId;

      // If OAuth account already exists for this user, just update and login
      if (existingOAuthAccount && existingOAuthAccount.userId === userId) {
        await this.prisma.account.update({
          where: { id: existingOAuthAccount.id },
          data: {
            providerId: oauthData.providerId,
            lastLoginAt: new Date(),
          },
        });
        return this.usersService.findOne(userId);
      }

      // If OAuth account exists but linked to DIFFERENT user, don't auto-link
      // This prevents auto-creating duplicate OAuth accounts
      if (existingOAuthAccount && existingOAuthAccount.userId !== userId) {
        throw new BadRequestException(
          'This OAuth account is already linked to another user. Please contact support.',
        );
      }

      // Check if user already has this OAuth provider (prevent duplicates)
      const userOAuthAccount = await this.prisma.account.findFirst({
        where: {
          userId,
          provider: providerEnum,
        },
      });

      if (userOAuthAccount) {
        // User already linked this OAuth provider - just update providerId
        await this.prisma.account.update({
          where: { id: userOAuthAccount.id },
          data: {
            providerId: oauthData.providerId,
            lastLoginAt: new Date(),
          },
        });
      } else {
        // OAuth account doesn't exist anywhere - create new for this user
        await this.prisma.account.create({
          data: {
            userId,
            email: oauthData.email,
            provider: providerEnum,
            providerId: oauthData.providerId,
            passwordHash: null,
            lastLoginAt: new Date(),
            createdBy: userId,
          },
        });
      }

      return this.usersService.findOne(userId);
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
   * Link OAuth account to a specific user
   * Used when user selects which account to link OAuth provider to
   */
  async linkOAuthAccountToUser(linkData: {
    userId: string;
    email: string;
    provider: string;
    providerId: string;
  }) {
    const providerEnum = linkData.provider.toUpperCase() as AccountProvider;

    // Check if this OAuth account is already linked to ANY user
    const existingOAuthAccount = await this.prisma.account.findFirst({
      where: {
        provider: providerEnum,
        providerId: linkData.providerId,
      },
    });

    // Check if target user already has this provider linked to a different OAuth account
    const targetUserExistingProvider = await this.prisma.account.findFirst({
      where: {
        userId: linkData.userId,
        provider: providerEnum,
      },
    });

    // If target user already has this provider, delete it (will be replaced)
    if (targetUserExistingProvider) {
      await this.prisma.account.delete({
        where: { id: targetUserExistingProvider.id },
      });
    }

    if (
      existingOAuthAccount &&
      existingOAuthAccount.userId !== linkData.userId
    ) {
      // OAuth account is linked to a different user - move it to the selected user
      await this.prisma.account.update({
        where: { id: existingOAuthAccount.id },
        data: {
          userId: linkData.userId,
          email: linkData.email,
          lastLoginAt: new Date(),
          updatedBy: linkData.userId,
        },
      });
    } else if (existingOAuthAccount) {
      // Already linked to this user - just update lastLogin
      await this.prisma.account.update({
        where: { id: existingOAuthAccount.id },
        data: {
          lastLoginAt: new Date(),
        },
      });
    } else {
      // OAuth account doesn't exist - create it for this user
      await this.prisma.account.create({
        data: {
          userId: linkData.userId,
          email: linkData.email,
          provider: providerEnum,
          providerId: linkData.providerId,
          passwordHash: null,
          lastLoginAt: new Date(),
          createdBy: linkData.userId,
        },
      });
    }

    return { success: true, message: 'OAuth account linked successfully' };
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

  /**
   * Reset password by identifier (email or username) - internal use for password recovery
   * No old password required
   * Works for both LOCAL accounts (reset) and OAuth accounts (set password)
   */
  async resetPasswordByIdentifier(identifier: string, newPassword: string) {
    console.log('[Password Reset] Looking for identifier:', identifier);

    // Try to find user by email first (any provider)
    let user = await this.prisma.user.findFirst({
      where: {
        accounts: {
          some: {
            email: identifier,
          },
        },
      },
      include: {
        accounts: true,
      },
    });

    console.log('[Password Reset] User found by email:', !!user);

    // If not found by email, try username
    if (!user) {
      user = await this.prisma.user.findFirst({
        where: {
          profile: {
            username: identifier,
          },
        },
        include: {
          accounts: true,
        },
      });

      console.log('[Password Reset] User found by username:', !!user);
      if (user) {
        console.log('[Password Reset] User ID:', user.id);
        console.log(
          '[Password Reset] Accounts count:',
          user.accounts?.length || 0,
        );
        console.log(
          '[Password Reset] Account providers:',
          user.accounts?.map((a) => a.provider).join(', '),
        );
      }
    }

    if (!user) {
      console.log('[Password Reset] No user found for identifier:', identifier);
      throw new NotFoundException(
        `No user found with identifier: ${identifier}`,
      );
    }

    // If user has no accounts at all, we need an email to create one
    if (!user.accounts || user.accounts.length === 0) {
      console.log(
        '[Password Reset] User found but no accounts - need to create account:',
        identifier,
      );

      // Try to get email from identifier if it's an email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const isEmail = emailRegex.test(identifier);

      if (!isEmail) {
        throw new BadRequestException(
          'Cannot reset password for this username. Please use your email address instead to reset your password.',
        );
      }

      // Create a LOCAL account with the provided email
      const passwordHash = await bcrypt.hash(newPassword, 6);
      await this.prisma.account.create({
        data: {
          userId: user.id,
          email: identifier,
          passwordHash,
          provider: AccountProvider.LOCAL,
          createdBy: user.id,
        },
      });

      console.log(
        '[Password Reset] Created new LOCAL account for orphaned user:',
        identifier,
      );
      return { message: 'Password reset successful' };
    }

    // Check if user has a LOCAL account
    const localAccount = user.accounts.find(
      (acc) => acc.provider === AccountProvider.LOCAL,
    );

    const passwordHash = await bcrypt.hash(newPassword, 6);

    if (localAccount) {
      // Update existing LOCAL account password
      console.log('[Password Reset] Updating LOCAL account password');
      await this.prisma.account.update({
        where: { id: localAccount.id },
        data: {
          passwordHash,
        },
      });
    } else {
      // User has OAuth account(s) but no LOCAL account - create one
      console.log('[Password Reset] Creating LOCAL account for OAuth user');
      const primaryAccount = user.accounts[0];

      if (!primaryAccount) {
        throw new NotFoundException('No account found for user');
      }

      await this.prisma.account.create({
        data: {
          userId: user.id,
          email: primaryAccount.email,
          passwordHash,
          provider: AccountProvider.LOCAL,
          createdBy: user.id,
        },
      });
    }

    console.log('[Password Reset] Password set successfully for:', identifier);

    return { message: 'Password reset successful' };
  }

  /**
   * Forward forgot password request to Auth Service
   */
  async handleForgotPassword(identifier: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.post<{
          message: string;
          token?: string;
          resetUrl?: string;
        }>(`${this.authServiceUrl}/internal/auth/forgot-password`, {
          identifier,
        }),
      );
      return response.data;
    } catch (error) {
      throw new BadRequestException(
        this.getErrorMessage(error, 'Failed to process password reset request'),
      );
    }
  }

  /**
   * Forward reset password request to Auth Service
   */
  async handleResetPassword(token: string, newPassword: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.post<{ message: string }>(
          `${this.authServiceUrl}/internal/auth/reset-password`,
          { token, newPassword },
        ),
      );
      return response.data;
    } catch (error) {
      throw new BadRequestException(
        this.getErrorMessage(error, 'Failed to reset password'),
      );
    }
  }

  /**
   * Send password reset email notification
   */
  async sendPasswordResetEmail(identifier: string, resetUrl: string) {
    try {
      // Find user by email or username to get their email
      let user = await this.prisma.user.findFirst({
        where: {
          accounts: {
            some: {
              email: identifier,
            },
          },
        },
        include: {
          accounts: true,
          profile: true,
        },
      });

      if (!user) {
        user = await this.prisma.user.findFirst({
          where: {
            profile: {
              username: identifier,
            },
          },
          include: {
            accounts: true,
            profile: true,
          },
        });
      }

      if (!user || !user.accounts || user.accounts.length === 0) {
        // Silently return (don't reveal if account exists)
        console.log('Password reset email: User not found:', identifier);
        return { message: 'Email sent if account exists' };
      }

      const primaryAccount = user.accounts[0];
      if (!primaryAccount) {
        return { message: 'Email sent if account exists' };
      }

      const email = primaryAccount.email;
      const username = user.profile?.username || 'User';

      // Send notification via RabbitMQ (will be handled by notification consumer)
      await this.notificationProducer.sendPasswordResetEmail(
        email,
        username,
        resetUrl,
      );

      return { message: 'Password reset email sent' };
    } catch (error) {
      console.error('Error sending password reset email:', error);
      // Don't throw error to prevent account enumeration
      return { message: 'Email sent if account exists' };
    }
  }
}
