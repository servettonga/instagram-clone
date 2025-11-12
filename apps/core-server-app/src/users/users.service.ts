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
import { NotificationProducerService } from '../notifications/services/notification-producer.service';
import { NotificationsService } from '../notifications/notifications.service';
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
    private notificationProducer: NotificationProducerService,
    private notificationsService: NotificationsService,
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

  /**
   * Search users by username or display name
   */
  async search(
    query: string,
    options: { page?: number; limit?: number } = {},
  ): Promise<{ data: UserWithProfileAndAccount[]; pagination: any }> {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const where = {
      disabled: false,
      profile: {
        deleted: false,
        OR: [
          { username: { contains: query, mode: Prisma.QueryMode.insensitive } },
          {
            displayName: {
              contains: query,
              mode: Prisma.QueryMode.insensitive,
            },
          },
        ],
      },
    };

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: userWithProfileAndAccountSelect,
        orderBy: {
          profile: {
            username: 'asc',
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users.map(toUserWithProfileAndAccount),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Follow a user
   */
  async followUser(
    followerUserId: string,
    followedUserId: string,
  ): Promise<{
    id: string;
    followerProfileId: string;
    followedProfileId: string;
    accepted: boolean | null;
    createdAt: Date;
    updatedAt: Date;
  }> {
    // Get both profiles
    const [followerProfile, followedProfile] = await Promise.all([
      this.prisma.profile.findFirst({
        where: { userId: followerUserId, deleted: false },
      }),
      this.prisma.profile.findFirst({
        where: { userId: followedUserId, deleted: false },
      }),
    ]);

    if (!followerProfile) {
      throw new NotFoundException(
        ERROR_MESSAGES.USER_NOT_FOUND(followerUserId),
      );
    }

    if (!followedProfile) {
      throw new NotFoundException(
        ERROR_MESSAGES.USER_NOT_FOUND(followedUserId),
      );
    }

    if (followerProfile.id === followedProfile.id) {
      throw new BadRequestException(ERROR_MESSAGES.CANNOT_FOLLOW_YOURSELF);
    }

    // Check if already following
    const existingFollow = await this.prisma.profileFollow.findUnique({
      where: {
        followerProfileId_followedProfileId: {
          followerProfileId: followerProfile.id,
          followedProfileId: followedProfile.id,
        },
      },
    });

    if (existingFollow) {
      throw new ConflictException(ERROR_MESSAGES.ALREADY_FOLLOWING);
    }

    // If profile is public, auto-accept. If private, set accepted to null (pending)
    const accepted = followedProfile.isPublic ? true : null;

    const follow = await this.prisma.profileFollow.create({
      data: {
        followerProfileId: followerProfile.id,
        followedProfileId: followedProfile.id,
        accepted,
        createdBy: followerUserId,
      },
    });

    // Send notification to the followed user - fire and forget
    if (accepted === null) {
      // Private account: send follow request notification
      void this.notificationProducer.notifyFollowRequest(
        followedUserId,
        followerUserId,
        followerProfile.username,
      );
    } else {
      // Public account: notify user they have a new follower
      void this.notificationProducer.notifyNewFollower(
        followedUserId,
        followerUserId,
        followerProfile.username,
      );
    }

    return follow;
  }

  /**
   * Unfollow a user
   */
  async unfollowUser(
    followerUserId: string,
    followedUserId: string,
  ): Promise<void> {
    // Get both profiles
    const [followerProfile, followedProfile] = await Promise.all([
      this.prisma.profile.findFirst({
        where: { userId: followerUserId, deleted: false },
      }),
      this.prisma.profile.findFirst({
        where: { userId: followedUserId, deleted: false },
      }),
    ]);

    if (!followerProfile) {
      throw new NotFoundException(
        ERROR_MESSAGES.USER_NOT_FOUND(followerUserId),
      );
    }

    if (!followedProfile) {
      throw new NotFoundException(
        ERROR_MESSAGES.USER_NOT_FOUND(followedUserId),
      );
    }

    try {
      // First, check if this is a pending request to delete the notification
      const existingFollow = await this.prisma.profileFollow.findUnique({
        where: {
          followerProfileId_followedProfileId: {
            followerProfileId: followerProfile.id,
            followedProfileId: followedProfile.id,
          },
        },
      });

      const wasPending = existingFollow?.accepted === null;

      await this.prisma.profileFollow.delete({
        where: {
          followerProfileId_followedProfileId: {
            followerProfileId: followerProfile.id,
            followedProfileId: followedProfile.id,
          },
        },
      });

      // If it was a pending request, delete the follow request notification
      if (wasPending) {
        void this.notificationsService.deleteFollowRequestNotification(
          followedUserId,
          followerUserId,
        );
      }
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException(
            ERROR_MESSAGES.FOLLOW_RELATIONSHIP_NOT_FOUND,
          );
        }
      }
      throw error;
    }
  }

  /**
   * Approve a follow request
   */
  async approveFollowRequest(
    profileOwnerId: string,
    followerUserId: string,
  ): Promise<void> {
    // Get both profiles
    const [profileOwner, followerProfile] = await Promise.all([
      this.prisma.profile.findFirst({
        where: { userId: profileOwnerId, deleted: false },
      }),
      this.prisma.profile.findFirst({
        where: { userId: followerUserId, deleted: false },
      }),
    ]);

    if (!profileOwner) {
      throw new NotFoundException(
        ERROR_MESSAGES.USER_NOT_FOUND(profileOwnerId),
      );
    }

    if (!followerProfile) {
      throw new NotFoundException(
        ERROR_MESSAGES.USER_NOT_FOUND(followerUserId),
      );
    }

    try {
      await this.prisma.profileFollow.update({
        where: {
          followerProfileId_followedProfileId: {
            followerProfileId: followerProfile.id,
            followedProfileId: profileOwner.id,
          },
          accepted: null, // Only update if it's pending
        },
        data: {
          accepted: true,
          updatedBy: profileOwnerId,
        },
      });

      // Delete the follow request notification from the profile owner's notifications
      void this.notificationsService.deleteFollowRequestNotification(
        profileOwnerId,
        followerUserId,
      );

      // Notify the follower that their request was accepted
      void this.notificationProducer.notifyFollowAccepted(
        followerUserId,
        profileOwnerId,
        profileOwner.username,
      );
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException(ERROR_MESSAGES.FOLLOW_REQUEST_NOT_FOUND);
        }
      }
      throw error;
    }
  }

  /**
   * Reject a follow request
   */
  async rejectFollowRequest(
    profileOwnerId: string,
    followerUserId: string,
  ): Promise<void> {
    // Get both profiles
    const [profileOwner, followerProfile] = await Promise.all([
      this.prisma.profile.findFirst({
        where: { userId: profileOwnerId, deleted: false },
      }),
      this.prisma.profile.findFirst({
        where: { userId: followerUserId, deleted: false },
      }),
    ]);

    if (!profileOwner) {
      throw new NotFoundException(
        ERROR_MESSAGES.USER_NOT_FOUND(profileOwnerId),
      );
    }

    if (!followerProfile) {
      throw new NotFoundException(
        ERROR_MESSAGES.USER_NOT_FOUND(followerUserId),
      );
    }

    try {
      await this.prisma.profileFollow.delete({
        where: {
          followerProfileId_followedProfileId: {
            followerProfileId: followerProfile.id,
            followedProfileId: profileOwner.id,
          },
          accepted: null, // Only delete if it's pending
        },
      });

      // Delete the follow request notification from the profile owner's notifications
      void this.notificationsService.deleteFollowRequestNotification(
        profileOwnerId,
        followerUserId,
      );
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException(ERROR_MESSAGES.FOLLOW_REQUEST_NOT_FOUND);
        }
      }
      throw error;
    }
  }

  /**
   * Get followers of a user
   */
  async getFollowers(
    userId: string,
    currentUserId?: string,
    options: { page?: number; limit?: number } = {},
  ) {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    // Get user's profile
    const profile = await this.prisma.profile.findFirst({
      where: { userId, deleted: false },
    });

    if (!profile) {
      throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND(userId));
    }

    // Privacy check: if profile is private, check access permissions
    if (!profile.isPublic) {
      // If no current user, deny access
      if (!currentUserId) {
        return {
          followers: [],
          total: 0,
          page,
          limit,
          totalPages: 0,
        };
      }

      // Check if current user is viewing their own profile
      const isOwnProfile = userId === currentUserId;
      if (!isOwnProfile) {
        // Check if current user is following this profile
        const currentUserProfile = await this.prisma.profile.findFirst({
          where: { userId: currentUserId, deleted: false },
        });

        if (currentUserProfile) {
          const follow = await this.prisma.profileFollow.findUnique({
            where: {
              followerProfileId_followedProfileId: {
                followerProfileId: currentUserProfile.id,
                followedProfileId: profile.id,
              },
            },
          });

          // If not following or follow not accepted, deny access
          if (!follow || !follow.accepted) {
            return {
              followers: [],
              total: 0,
              page,
              limit,
              totalPages: 0,
            };
          }
        } else {
          return {
            followers: [],
            total: 0,
            page,
            limit,
            totalPages: 0,
          };
        }
      }
    }

    // Get followers where accepted is true
    const [followers, total] = await Promise.all([
      this.prisma.profileFollow.findMany({
        where: {
          followedProfileId: profile.id,
          accepted: true,
        },
        skip,
        take: limit,
        select: {
          id: true,
          followerProfile: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
              bio: true,
              isPublic: true,
            },
          },
          accepted: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.profileFollow.count({
        where: {
          followedProfileId: profile.id,
          accepted: true,
        },
      }),
    ]);

    return {
      followers: followers.map((f) => ({
        id: f.id,
        profile: f.followerProfile,
        accepted: f.accepted,
        createdAt: f.createdAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get users that this user is following
   */
  async getFollowing(
    userId: string,
    currentUserId?: string,
    options: { page?: number; limit?: number } = {},
  ) {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    // Get user's profile
    const profile = await this.prisma.profile.findFirst({
      where: { userId, deleted: false },
    });

    if (!profile) {
      throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND(userId));
    }

    // Privacy check: if profile is private, check access permissions
    if (!profile.isPublic) {
      // If no current user, deny access
      if (!currentUserId) {
        return {
          following: [],
          total: 0,
          page,
          limit,
          totalPages: 0,
        };
      }

      // Check if current user is viewing their own profile
      const isOwnProfile = userId === currentUserId;
      if (!isOwnProfile) {
        // Check if current user is following this profile
        const currentUserProfile = await this.prisma.profile.findFirst({
          where: { userId: currentUserId, deleted: false },
        });

        if (currentUserProfile) {
          const follow = await this.prisma.profileFollow.findUnique({
            where: {
              followerProfileId_followedProfileId: {
                followerProfileId: currentUserProfile.id,
                followedProfileId: profile.id,
              },
            },
          });

          // If not following or follow not accepted, deny access
          if (!follow || !follow.accepted) {
            return {
              following: [],
              total: 0,
              page,
              limit,
              totalPages: 0,
            };
          }
        } else {
          return {
            following: [],
            total: 0,
            page,
            limit,
            totalPages: 0,
          };
        }
      }
    }

    // Get users this profile is following where accepted is true
    const [following, total] = await Promise.all([
      this.prisma.profileFollow.findMany({
        where: {
          followerProfileId: profile.id,
          accepted: true,
        },
        skip,
        take: limit,
        select: {
          id: true,
          followedProfile: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
              bio: true,
              isPublic: true,
            },
          },
          accepted: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.profileFollow.count({
        where: {
          followerProfileId: profile.id,
          accepted: true,
        },
      }),
    ]);

    return {
      following: following.map((f) => ({
        id: f.id,
        profile: f.followedProfile,
        accepted: f.accepted,
        createdAt: f.createdAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get pending follow requests for a user (people who want to follow them)
   */
  async getFollowRequests(
    userId: string,
    options: { page?: number; limit?: number } = {},
  ) {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    // Get user's profile
    const profile = await this.prisma.profile.findFirst({
      where: { userId, deleted: false },
    });

    if (!profile) {
      throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND(userId));
    }

    // Get follow requests where accepted is null
    const [requests, total] = await Promise.all([
      this.prisma.profileFollow.findMany({
        where: {
          followedProfileId: profile.id,
          accepted: null,
        },
        skip,
        take: limit,
        select: {
          id: true,
          followerProfile: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
              bio: true,
              user: {
                select: {
                  id: true,
                },
              },
            },
          },
          createdAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.profileFollow.count({
        where: {
          followedProfileId: profile.id,
          accepted: null,
        },
      }),
    ]);

    return {
      requests: requests.map((r) => ({
        id: r.id,
        followerProfile: {
          id: r.followerProfile.id,
          username: r.followerProfile.username,
          displayName: r.followerProfile.displayName,
          avatarUrl: r.followerProfile.avatarUrl,
          bio: r.followerProfile.bio,
          userId: r.followerProfile.user.id,
        },
        createdAt: r.createdAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Check if user A is following user B
   */
  async isFollowing(
    followerUserId: string,
    followedUserId: string,
  ): Promise<{ isFollowing: boolean; isPending: boolean }> {
    const [followerProfile, followedProfile] = await Promise.all([
      this.prisma.profile.findFirst({
        where: { userId: followerUserId, deleted: false },
      }),
      this.prisma.profile.findFirst({
        where: { userId: followedUserId, deleted: false },
      }),
    ]);

    if (!followerProfile || !followedProfile) {
      return { isFollowing: false, isPending: false };
    }

    const follow = await this.prisma.profileFollow.findUnique({
      where: {
        followerProfileId_followedProfileId: {
          followerProfileId: followerProfile.id,
          followedProfileId: followedProfile.id,
        },
      },
    });

    if (!follow) {
      return { isFollowing: false, isPending: false };
    }

    return {
      isFollowing: follow.accepted === true,
      isPending: follow.accepted === null,
    };
  }

  /**
   * Get suggested users for a user based on different strategies.
   * Strategies:
   * - popular_followers: users who follow you and have the most followers themselves
   * - friends_of_following: users who are followed by people you follow (friends-of-following) and have many followers
   * - most_followers: global users with the most followers
   */
  async getSuggestions(
    currentUserId: string,
    options: {
      type?: 'popular_followers' | 'friends_of_following' | 'most_followers';
      limit?: number;
    } = {},
  ) {
    const type = options.type || 'most_followers';
    const limit = Math.min(options.limit || 5, 100);

    // Resolve current user's profile id
    const currentProfile = await this.prisma.profile.findFirst({
      where: { userId: currentUserId, deleted: false },
    });
    if (!currentProfile) {
      throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND(currentUserId));
    }

    // Get the list of profiles the current user already follows so we can
    // exclude them from suggestions.
    const myFollowingRows = await this.prisma.profileFollow.findMany({
      where: { followerProfileId: currentProfile.id, accepted: true },
      select: { followedProfileId: true },
    });
    const myFollowingIds = new Set(
      myFollowingRows.map((r) => r.followedProfileId),
    );

    // We'll include followers (accepted only) with follower profile info so
    // we can compute `followedBy` (which of your followings follow the
    // candidate). Also include a filtered `following` relation that tells us
    // whether the candidate follows the current user (accepted only). We'll
    // compute counts in-memory, then sort.
    const includeFollowers = {
      followers: {
        where: { accepted: true },
        select: { followerProfile: { select: { id: true, username: true } } },
      },
      following: {
        where: { followedProfileId: currentProfile.id, accepted: true },
        select: { id: true },
      },
      user: { select: { id: true } },
    } as const;

    if (type === 'popular_followers') {
      // Profiles who follow the current user (i.e., their following includes currentProfile.id)
      const candidates = await this.prisma.profile.findMany({
        where: {
          deleted: false,
          id: { notIn: [currentProfile.id, ...Array.from(myFollowingIds)] },
          following: {
            some: {
              followedProfileId: currentProfile.id,
              accepted: true,
            },
          },
        },
        include: includeFollowers,
        take: Math.max(limit * 4, limit), // fetch a few extra to allow good sorting
      });

      const sorted = candidates
        .map((p) => {
          const followerProfiles =
            p.followers?.map((f) => f.followerProfile) ?? [];
          return {
            id: p.id,
            username: p.username,
            userId: p.user?.id,
            displayName: p.displayName,
            avatarUrl: p.avatarUrl,
            followersCount: followerProfiles.length,
            followsYou: (p.following?.length ?? 0) > 0,
            // Which of the profiles you follow also follow this candidate
            followedBy: followerProfiles
              .filter((fp) => myFollowingIds.has(fp.id))
              .map((fp) => fp.username),
          };
        })
        .sort((a, b) => b.followersCount - a.followersCount)
        .slice(0, limit);

      return sorted;
    }

    if (type === 'friends_of_following') {
      // First, get profile ids that current user is following
      const followingRows = await this.prisma.profileFollow.findMany({
        where: { followerProfileId: currentProfile.id, accepted: true },
        select: { followedProfileId: true },
      });
      const followedIds = followingRows.map((r) => r.followedProfileId);

      if (followedIds.length === 0) return [];

      // Find profiles that are followed by any of those followedIds
      const candidates = await this.prisma.profile.findMany({
        where: {
          deleted: false,
          id: { notIn: [currentProfile.id, ...Array.from(myFollowingIds)] },
          followers: {
            some: {
              followerProfileId: { in: followedIds },
              accepted: true,
            },
          },
        },
        include: includeFollowers,
        take: Math.max(limit * 4, limit),
      });

      const sorted = candidates
        .map((p) => {
          const followerProfiles =
            p.followers?.map((f) => f.followerProfile) ?? [];
          return {
            id: p.id,
            username: p.username,
            userId: p.user?.id,
            displayName: p.displayName,
            avatarUrl: p.avatarUrl,
            followersCount: followerProfiles.length,
            followsYou: (p.following?.length ?? 0) > 0,
            followedBy: followerProfiles
              .filter((fp) => myFollowingIds.has(fp.id))
              .map((fp) => fp.username),
          };
        })
        .sort((a, b) => b.followersCount - a.followersCount)
        .slice(0, limit);

      return sorted;
    }

    // most_followers (global)
    const candidates = await this.prisma.profile.findMany({
      where: {
        deleted: false,
        id: { notIn: [currentProfile.id, ...Array.from(myFollowingIds)] },
      },
      include: includeFollowers,
      take: Math.max(limit * 4, limit),
    });

    return candidates
      .map((p) => {
        const followerProfiles =
          p.followers?.map((f) => f.followerProfile) ?? [];
        return {
          id: p.id,
          username: p.username,
          userId: p.user?.id,
          displayName: p.displayName,
          avatarUrl: p.avatarUrl,
          followersCount: followerProfiles.length,
          followsYou: (p.following?.length ?? 0) > 0,
          followedBy: followerProfiles
            .filter((fp) => myFollowingIds.has(fp.id))
            .map((fp) => fp.username),
        };
      })
      .sort((a, b) => b.followersCount - a.followersCount)
      .slice(0, limit);
  }
}
