import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { Prisma, AccountProvider } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { ERROR_MESSAGES } from '../common/constants/messages';
import { FileUploadService } from '../common/services/file-upload.service';
import {
  SafeUser,
  SafeProfile,
  SafeAccount,
  userWithProfileAndAccountSelect,
  toUserWithProfileAndAccount,
} from './payloads';

import type { UserWithProfileAndAccount } from '@repo/shared-types';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private fileUploadService: FileUploadService,
  ) {}

  /**
   * Helper method to validate user existence and active status
   */
  private validateUserData(
    user: SafeUser | null | undefined,
    profile: SafeProfile | null | undefined,
    accounts: SafeAccount[],
    identifier: string,
  ): void {
    if (
      !user ||
      !profile ||
      profile.deleted ||
      user.disabled ||
      accounts.length === 0
    ) {
      throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND(identifier));
    }
  }

  /**
   * Helper method to handle Prisma errors
   */
  private handlePrismaError(error: unknown, identifier?: string): never {
    if (error instanceof PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        // Record not found
        if (identifier) {
          throw new NotFoundException(
            ERROR_MESSAGES.USER_NOT_FOUND(identifier),
          );
        }
        throw new NotFoundException('Resource not found');
      }
      if (error.code === 'P2002') {
        throw new ConflictException(ERROR_MESSAGES.EMAIL_OR_USERNAME_EXISTS);
      }
    }
    throw error;
  }

  async create(
    createUserDto: CreateUserDto,
  ): Promise<UserWithProfileAndAccount> {
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        // Only hash password if provided (for LOCAL accounts)
        let passwordHash: string | null = null;
        if (createUserDto.password) {
          passwordHash = await bcrypt.hash(createUserDto.password, 6);
        }

        // Create user first
        const user = await tx.user.create({
          data: {
            role: 'USER',
            disabled: false,
          },
        });

        // Create primary account with hashed password (or null for OAuth)
        const account = await tx.account.create({
          data: {
            userId: user.id,
            email: createUserDto.email,
            passwordHash,
            provider: AccountProvider.LOCAL,
            createdBy: user.id,
          },
        });

        const profile = await tx.profile.create({
          data: {
            userId: user.id,
            username: createUserDto.username,
            displayName: createUserDto.displayName || createUserDto.username,
            birthday: new Date('2000-01-01'),
            bio: createUserDto.bio || null,
            avatarUrl: createUserDto.avatarUrl || null,
            isPublic: true,
            deleted: false,
            createdBy: user.id,
          },
        });

        return { user, account, profile };
      });

      // Transform to API format
      return toUserWithProfileAndAccount({
        ...result.user,
        profile: result.profile,
        accounts: [result.account],
      });
    } catch (error: unknown) {
      this.handlePrismaError(error);
    }
  }

  async findAll(): Promise<UserWithProfileAndAccount[]> {
    const users = await this.prisma.user.findMany({
      where: { disabled: false },
      select: userWithProfileAndAccountSelect,
    });

    return users
      .filter((user) => user.profile && !user.profile.deleted)
      .map(toUserWithProfileAndAccount);
  }

  async findOne(id: string): Promise<UserWithProfileAndAccount> {
    const prismaUser = await this.prisma.user.findUnique({
      where: { id },
      select: userWithProfileAndAccountSelect,
    });

    if (
      !prismaUser ||
      !prismaUser.profile ||
      prismaUser.profile.deleted ||
      prismaUser.disabled
    ) {
      throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND(id));
    }

    // Transform with type safety
    return toUserWithProfileAndAccount(prismaUser);
  }

  async findByEmail(email: string): Promise<UserWithProfileAndAccount | null> {
    const account = await this.prisma.account.findFirst({
      where: {
        email,
        provider: AccountProvider.LOCAL,
      },
      select: {
        user: {
          select: userWithProfileAndAccountSelect,
        },
      },
    });

    if (
      !account ||
      !account.user.profile ||
      account.user.profile.deleted ||
      account.user.disabled
    ) {
      return null;
    }

    return toUserWithProfileAndAccount(account.user);
  }

  async findByUsername(
    username: string,
  ): Promise<UserWithProfileAndAccount | null> {
    const profile = await this.prisma.profile.findUnique({
      where: { username },
      select: {
        user: {
          select: userWithProfileAndAccountSelect,
        },
      },
    });

    if (!profile || profile.user.profile?.deleted || profile.user.disabled) {
      return null;
    }

    return toUserWithProfileAndAccount(profile.user);
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<UserWithProfileAndAccount> {
    try {
      // Find user's profile
      const profile = await this.prisma.profile.findFirst({
        where: { userId: id, deleted: false },
      });

      if (!profile) {
        throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND(id));
      }

      // Update account email if provided
      if (updateUserDto.email) {
        await this.prisma.account.updateMany({
          where: { userId: id, provider: AccountProvider.LOCAL },
          data: { email: updateUserDto.email, updatedBy: id },
        });
      }

      // Update profile if any profile fields are provided
      const profileUpdateData: Prisma.ProfileUncheckedUpdateInput = {};
      const profileFields = [
        'username',
        'displayName',
        'bio',
        'avatarUrl',
      ] as const;

      profileFields.forEach((field) => {
        if (updateUserDto[field] !== undefined) {
          profileUpdateData[field] = updateUserDto[field];
        }
      });

      // Handle birthday separately (needs date conversion)
      if (updateUserDto.birthday !== undefined) {
        profileUpdateData.birthday = updateUserDto.birthday
          ? new Date(updateUserDto.birthday)
          : undefined;
      }

      // Handle isPublic separately (boolean field)
      if (updateUserDto.isPublic !== undefined) {
        profileUpdateData.isPublic = updateUserDto.isPublic;
      }

      if (Object.keys(profileUpdateData).length > 0) {
        profileUpdateData.updatedBy = id;
        await this.prisma.profile.update({
          where: { id: profile.id },
          data: profileUpdateData,
        });
      }

      return this.findOne(id);
    } catch (error: unknown) {
      this.handlePrismaError(error);
    }
  }

  async remove(id: string): Promise<void> {
    try {
      await this.prisma.$transaction([
        this.prisma.user.update({
          where: { id },
          data: { disabled: true, updatedBy: id },
        }),
        this.prisma.profile.updateMany({
          where: { userId: id },
          data: { deleted: true, updatedBy: id },
        }),
      ]);
    } catch (error: unknown) {
      this.handlePrismaError(error, id);
    }
  }

  async getUserAccounts(userId: string) {
    const accounts = await this.prisma.account.findMany({
      where: { userId },
      select: {
        id: true,
        email: true,
        provider: true,
        providerId: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return accounts.map((account) => ({
      id: account.id,
      userId,
      email: account.email,
      provider: account.provider as 'LOCAL' | 'GOOGLE' | 'FACEBOOK',
      providerId: account.providerId,
      lastLoginAt: account.lastLoginAt?.toISOString() ?? null,
      createdAt: account.createdAt.toISOString(),
      updatedAt: account.updatedAt.toISOString(),
    }));
  }

  async addAccount(
    userId: string,
    accountData: {
      email?: string;
      provider: AccountProvider;
      providerId?: string;
    },
  ) {
    const account = await this.prisma.account.create({
      data: {
        userId,
        email: accountData.email || '',
        provider: accountData.provider,
        providerId: accountData.providerId,
        createdBy: userId,
      },
    });

    return {
      id: account.id,
      userId,
      email: account.email,
      provider: account.provider as 'LOCAL' | 'GOOGLE' | 'FACEBOOK',
      providerId: account.providerId,
      lastLoginAt: account.lastLoginAt?.toISOString() ?? null,
      createdAt: account.createdAt.toISOString(),
      updatedAt: account.updatedAt.toISOString(),
    };
  }

  /**
   * Upload and update user avatar
   */
  async uploadAvatar(
    userId: string,
    file: Express.Multer.File,
  ): Promise<{ avatarUrl: string }> {
    if (!file) {
      throw new BadRequestException(ERROR_MESSAGES.NO_FILE_UPLOADED);
    }

    // Get the file URL
    const avatarUrl = this.fileUploadService.getFileUrl(file.filename);

    // Update user's avatar URL in database
    await this.update(userId, { avatarUrl });

    return { avatarUrl };
  }
}
