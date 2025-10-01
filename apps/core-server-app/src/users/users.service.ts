import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { Prisma, AccountProvider } from '@prisma/client';
import { ERROR_MESSAGES } from '../common/constants/messages';
import {
  userSelectPayload,
  profileSelectPayload,
  accountSelectPayload,
  SafeUser,
  SafeProfile,
  SafeAccount,
  UserWithProfileAndAccount,
} from './payloads';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  /**
   * Helper method to transform raw user data into clean response format
   */
  private transformUserData(
    userData: SafeUser,
    profileData: SafeProfile,
    accountData: SafeAccount,
  ): UserWithProfileAndAccount {
    // Explicitly destructure to remove any nested objects
    const { ...userFields } = userData;

    return {
      // User fields (with User ID as primary)
      ...userFields,

      // Profile fields (flattened, excluding id conflicts)
      username: profileData.username,
      displayName: profileData.displayName,
      birthday: profileData.birthday,
      bio: profileData.bio,
      avatarUrl: profileData.avatarUrl,
      isPublic: profileData.isPublic,
      deleted: profileData.deleted,
      createdAt: profileData.createdAt,
      updatedAt: profileData.updatedAt,

      // Account fields
      email: accountData.email,
      primaryAccountId: accountData.id,

      // Reference IDs
      profileId: profileData.id,
    };
  }

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
      // Create user first
      const user = await this.prisma.user.create({
        data: {
          role: 'USER',
          disabled: false,
        },
        select: userSelectPayload,
      });

      // Create primary account
      const account = await this.prisma.account.create({
        data: {
          userId: user.id,
          email: createUserDto.email,
          provider: AccountProvider.LOCAL,
          createdBy: user.id,
          updatedBy: null,
        },
        select: accountSelectPayload,
      });

      // Create profile
      const profile = await this.prisma.profile.create({
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
          updatedBy: null,
        },
        select: profileSelectPayload,
      });

      return this.transformUserData(user, profile, account);
    } catch (error: unknown) {
      this.handlePrismaError(error);
    }
  }

  async findAll(): Promise<UserWithProfileAndAccount[]> {
    const usersWithRelations = await this.prisma.user.findMany({
      where: { disabled: false },
      select: {
        ...userSelectPayload,
        profile: {
          select: profileSelectPayload,
          where: { deleted: false },
        },
        accounts: {
          select: accountSelectPayload,
          where: { provider: AccountProvider.LOCAL },
          take: 1,
        },
      },
    });

    // Filter and transform, ensuring to return clean data
    return usersWithRelations
      .filter((user) => user.profile && user.accounts.length > 0)
      .map((user) => {
        // Extract the nested data
        const { profile, accounts, ...userData } = user;
        // Transform using only the extracted data
        return this.transformUserData(userData, profile!, accounts[0]!);
      });
  }

  async findOne(id: string): Promise<UserWithProfileAndAccount> {
    const userWithRelations = await this.prisma.user.findUnique({
      where: { id },
      select: {
        ...userSelectPayload,
        profile: {
          select: profileSelectPayload,
        },
        accounts: {
          select: accountSelectPayload,
          where: { provider: AccountProvider.LOCAL },
          take: 1,
        },
      },
    });

    this.validateUserData(
      userWithRelations,
      userWithRelations?.profile,
      userWithRelations?.accounts || [],
      id,
    );

    // Extract the nested data
    const { profile, accounts, ...userData } = userWithRelations!;
    // Transform using only the extracted data
    return this.transformUserData(userData, profile!, accounts[0]!);
  }

  async findByEmail(email: string): Promise<UserWithProfileAndAccount | null> {
    const accountWithRelations = await this.prisma.account.findUnique({
      where: { email },
      select: {
        ...accountSelectPayload,
        user: {
          select: {
            ...userSelectPayload,
            profile: {
              select: profileSelectPayload,
            },
          },
        },
      },
    });

    if (
      !accountWithRelations ||
      !accountWithRelations.user.profile ||
      accountWithRelations.user.profile.deleted ||
      accountWithRelations.user.disabled
    ) {
      return null;
    }

    // Extract the nested data
    const { user, ...accountData } = accountWithRelations;
    const { profile, ...userData } = user;
    // Transform using only the extracted data
    return this.transformUserData(userData, profile!, accountData);
  }

  async findByUsername(
    username: string,
  ): Promise<UserWithProfileAndAccount | null> {
    const profileWithRelations = await this.prisma.profile.findUnique({
      where: { username },
      select: {
        ...profileSelectPayload,
        user: {
          select: {
            ...userSelectPayload,
            accounts: {
              select: accountSelectPayload,
              where: { provider: AccountProvider.LOCAL },
              take: 1,
            },
          },
        },
      },
    });

    if (
      !profileWithRelations ||
      profileWithRelations.deleted ||
      profileWithRelations.user.disabled ||
      profileWithRelations.user.accounts.length === 0
    ) {
      return null;
    }

    // Extract the nested data
    const { user, ...profileData } = profileWithRelations;
    const { accounts, ...userData } = user;
    // Transform using only the extracted data
    return this.transformUserData(userData, profileData, accounts[0]!);
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

  async getUserAccounts(userId: string): Promise<SafeAccount[]> {
    return this.prisma.account.findMany({
      where: { userId },
      select: accountSelectPayload,
    });
  }

  async addAccount(
    userId: string,
    accountData: {
      email?: string;
      provider: AccountProvider;
      providerId?: string;
    },
  ): Promise<SafeAccount> {
    return this.prisma.account.create({
      data: {
        userId,
        email: accountData.email || '',
        provider: accountData.provider,
        providerId: accountData.providerId,
        createdBy: userId,
      },
      select: accountSelectPayload,
    });
  }
}
