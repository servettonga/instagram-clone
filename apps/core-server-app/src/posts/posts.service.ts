import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { QueryPostsDto } from './dto/query-posts.dto';
import { ERROR_MESSAGES } from '../common/constants/messages';
import { Prisma } from '@prisma/client';
import { postWithDetailsSelect, toPostResponse } from './payloads/post.payload';
import { AssetManagementService } from '../common/services/asset-management.service';
import { NotificationProducerService } from '../notifications/services/notification-producer.service';

@Injectable()
export class PostsService {
  constructor(
    private prisma: PrismaService,
    private assetManagementService: AssetManagementService,
    private notificationProducer: NotificationProducerService,
  ) {}

  /**
   * Extract @username mentions from post content
   * Returns array of unique usernames (without @ symbol)
   */
  private extractMentions(content: string): string[] {
    // Match @username pattern (alphanumeric, underscore, period)
    // Must be at start, after whitespace, or after punctuation
    const mentionRegex = /(?:^|[\s.,!?])@([a-zA-Z0-9_.]+)/g;
    const mentions = new Set<string>();
    let match: RegExpExecArray | null;

    while ((match = mentionRegex.exec(content)) !== null) {
      if (match[1]) {
        mentions.add(match[1].toLowerCase()); // Store lowercase for case-insensitive comparison
      }
    }

    return Array.from(mentions);
  }

  /**
   * Send mention notifications to users mentioned in post
   * Optimized to fetch profiles + preferences in a single query
   */
  private async notifyMentionedUsers(
    mentionedUsernames: string[],
    postId: string,
    actorId: string,
    actorUsername: string,
  ): Promise<void> {
    if (mentionedUsernames.length === 0) return;

    try {
      // Fetch profiles AND preferences in a single query (optimization for many mentions)
      const mentionedProfiles = await this.prisma.profile.findMany({
        where: {
          username: { in: mentionedUsernames },
          deleted: false,
        },
        select: {
          userId: true,
          username: true,
          user: {
            select: {
              notificationPreferences: {
                select: {
                  mentionWeb: true,
                  mentionEmail: true,
                },
              },
            },
          },
        },
      });

      // Filter users who want mention notifications (check preferences early)
      for (const profile of mentionedProfiles) {
        // Skip self-mentions
        if (profile.userId === actorId) continue;

        // Check if user wants ANY mention notifications (web or email)
        const prefs = profile.user.notificationPreferences;
        const shouldNotify = prefs
          ? prefs.mentionWeb || prefs.mentionEmail
          : true;

        // Only send if user has at least one channel enabled
        if (shouldNotify) {
          void this.notificationProducer.notifyMention(
            profile.userId,
            'post',
            postId,
            actorId,
            actorUsername,
          );
        }
      }
    } catch (error) {
      // Log error but don't fail the post creation
      console.error('Failed to send mention notifications:', error);
    }
  }

  /**
   * Create a new post
   */
  async create(
    createPostDto: CreatePostDto,
    userId: string,
    profileId: string,
  ) {
    // Validate profile exists and belongs to the user
    const profile = await this.prisma.profile.findUnique({
      where: { id: profileId },
      select: { id: true, userId: true, deleted: true, username: true },
    });

    if (!profile || profile.deleted) {
      throw new NotFoundException(ERROR_MESSAGES.PROFILE_NOT_FOUND);
    }

    if (profile.userId !== userId) {
      throw new ForbiddenException(ERROR_MESSAGES.NOT_RESOURCE_OWNER);
    }

    // Validate assets if provided
    if (createPostDto.assetIds && createPostDto.assetIds.length > 0) {
      await this.assetManagementService.validateAssets(
        createPostDto.assetIds,
        userId,
      );
    }

    // Create post with assets
    const post = await this.prisma.post.create({
      data: {
        profileId,
        content: createPostDto.content,
        aspectRatio: createPostDto.aspectRatio || '1:1',
        createdBy: userId,
        assets: createPostDto.assetIds
          ? {
              create: createPostDto.assetIds.map((assetId, index) => ({
                assetId,
                orderIndex: index,
                createdBy: userId,
              })),
            }
          : undefined,
      },
      select: postWithDetailsSelect,
    });

    // Extract and notify mentioned users
    if (createPostDto.content) {
      const mentionedUsernames = this.extractMentions(createPostDto.content);
      if (mentionedUsernames.length > 0) {
        void this.notifyMentionedUsers(
          mentionedUsernames,
          post.id,
          userId,
          profile.username,
        );
      }
    }

    return toPostResponse(post, profileId);
  }

  /**
   * Get paginated posts with optional filters
   */
  async findAll(queryDto: QueryPostsDto, currentUserId?: string) {
    const page = queryDto.page ?? 1;
    const limit = queryDto.limit ?? 10;
    const sortBy: 'createdAt' | 'updatedAt' = queryDto.sortBy ?? 'createdAt';
    const order: 'asc' | 'desc' = queryDto.order ?? 'desc';
    const { search, profileId, includeArchived } = queryDto;

    const skip = (page - 1) * limit;
    const take = limit;

    // If filtering by profileId, enforce privacy check
    if (profileId) {
      const profile = await this.prisma.profile.findUnique({
        where: { id: profileId },
        select: { id: true, deleted: true, isPublic: true, userId: true },
      });

      if (!profile || profile.deleted) {
        // Profile not found or deleted, return empty result
        return {
          data: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false,
          },
        };
      }

      // If profile is private, check access
      if (!profile.isPublic) {
        // If no current user, deny access
        if (!currentUserId) {
          return {
            data: [],
            pagination: {
              page,
              limit,
              total: 0,
              totalPages: 0,
              hasNext: false,
              hasPrev: false,
            },
          };
        }

        // Check if viewing own profile
        const currentUserProfile = await this.prisma.profile.findFirst({
          where: { id: currentUserId, deleted: false },
          select: { userId: true },
        });

        const isOwnProfile = currentUserProfile?.userId === profile.userId;

        if (!isOwnProfile) {
          // Check if current user is following this profile
          const follow = await this.prisma.profileFollow.findUnique({
            where: {
              followerProfileId_followedProfileId: {
                followerProfileId: currentUserId,
                followedProfileId: profileId,
              },
            },
            select: { accepted: true },
          });

          // If not following or follow not accepted, deny access
          if (!follow || !follow.accepted) {
            return {
              data: [],
              pagination: {
                page,
                limit,
                total: 0,
                totalPages: 0,
                hasNext: false,
                hasPrev: false,
              },
            };
          }
        }
      }
    }

    // For "For You" feed (when no profileId is specified), we need to filter out
    // posts from private accounts that the current user is not following
    let allowedPrivateProfileIds: string[] = [];
    if (!profileId && currentUserId) {
      // Get profiles the current user is following (accepted follows only)
      const following = await this.prisma.profileFollow.findMany({
        where: {
          followerProfileId: currentUserId,
          accepted: true,
        },
        select: {
          followedProfileId: true,
        },
      });
      allowedPrivateProfileIds = following.map((f) => f.followedProfileId);
    }

    // Build where clause
    const where: Prisma.PostWhereInput = {
      AND: [
        // Exclude archived posts unless explicitly requested
        includeArchived ? {} : { isArchived: false },
        // Filter by profile if provided
        profileId ? { profileId } : {},
        // Search in content if provided
        search
          ? {
              content: {
                contains: search,
                mode: 'insensitive' as Prisma.QueryMode,
              },
            }
          : {},
        // Only show posts from non-deleted profiles
        {
          profile: {
            deleted: false,
          },
        },
        // Filter out private profiles that user is not following (for "For You" feed)
        !profileId && currentUserId
          ? {
              OR: [
                // Include posts from public profiles
                { profile: { isPublic: true } },
                // Include posts from private profiles the user is following
                { profileId: { in: allowedPrivateProfileIds } },
                // Include user's own posts (if they have a profile)
                {
                  profile: {
                    userId: currentUserId,
                  },
                },
              ],
            }
          : {},
      ],
    };

    // Execute query with pagination
    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        where,
        select: postWithDetailsSelect,
        orderBy: { [sortBy]: order },
        skip,
        take,
      }),
      this.prisma.post.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: posts.map((post) => toPostResponse(post, currentUserId)),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Get feed posts from followed users
   */
  async getFeed(profileId: string, queryDto: QueryPostsDto) {
    const page = queryDto.page ?? 1;
    const limit = queryDto.limit ?? 20;
    const sortBy: 'createdAt' | 'updatedAt' = queryDto.sortBy ?? 'createdAt';
    const order: 'asc' | 'desc' = queryDto.order ?? 'desc';

    const skip = (page - 1) * limit;
    const take = limit;

    // Get list of profiles the user follows (accepted follows only)
    const following = await this.prisma.profileFollow.findMany({
      where: {
        followerProfileId: profileId,
        accepted: true,
      },
      select: {
        followedProfileId: true,
      },
    });

    const followedProfileIds = following.map((f) => f.followedProfileId);

    // Include user's own posts in feed
    followedProfileIds.push(profileId);

    const where: Prisma.PostWhereInput = {
      AND: [
        { isArchived: false },
        { profileId: { in: followedProfileIds } },
        {
          profile: {
            deleted: false,
          },
        },
      ],
    };

    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        where,
        select: postWithDetailsSelect,
        orderBy: { [sortBy]: order },
        skip,
        take,
      }),
      this.prisma.post.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: posts.map((post) => toPostResponse(post, profileId)),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Get a single post by ID
   */
  async findOne(id: string, currentUserId?: string) {
    const post = await this.prisma.post.findUnique({
      where: { id },
      select: postWithDetailsSelect,
    });

    if (!post) {
      throw new NotFoundException(ERROR_MESSAGES.POST_NOT_FOUND(id));
    }

    return toPostResponse(post, currentUserId);
  }

  /**
   * Update a post
   */
  async update(
    id: string,
    updatePostDto: UpdatePostDto,
    userId: string,
    profileId: string,
  ) {
    // Check if post exists and user owns it
    const existingPost = await this.prisma.post.findUnique({
      where: { id },
      select: {
        id: true,
        profileId: true,
        profile: {
          select: {
            userId: true,
            deleted: true,
          },
        },
      },
    });

    if (!existingPost || existingPost.profile.deleted) {
      throw new NotFoundException(ERROR_MESSAGES.POST_NOT_FOUND(id));
    }

    if (existingPost.profileId !== profileId) {
      throw new ForbiddenException(ERROR_MESSAGES.NOT_RESOURCE_OWNER);
    }

    // Validate new assets if provided
    if (updatePostDto.assetIds && updatePostDto.assetIds.length > 0) {
      await this.assetManagementService.validateAssets(
        updatePostDto.assetIds,
        userId,
      );
    }

    // Update post
    const updateData: Prisma.PostUpdateInput = {
      ...(updatePostDto.content !== undefined && {
        content: updatePostDto.content,
      }),
      ...(updatePostDto.aspectRatio !== undefined && {
        aspectRatio: updatePostDto.aspectRatio,
      }),
      ...(updatePostDto.isArchived !== undefined && {
        isArchived: updatePostDto.isArchived,
      }),
      updatedByUser: {
        connect: { id: userId },
      },
    };

    // Handle asset updates if provided
    if (updatePostDto.assetIds !== undefined) {
      // Remove old assets
      await this.prisma.postAsset.deleteMany({
        where: { postId: id },
      });

      // Add new assets
      if (updatePostDto.assetIds.length > 0) {
        updateData.assets = {
          create: updatePostDto.assetIds.map((assetId, index) => ({
            assetId,
            orderIndex: index,
            createdBy: userId,
          })),
        };
      }
    }

    const updatedPost = await this.prisma.post.update({
      where: { id },
      data: updateData,
      select: postWithDetailsSelect,
    });

    return toPostResponse(updatedPost, profileId);
  }

  /**
   * Archive/unarchive a post
   */
  async archive(
    id: string,
    userId: string,
    profileId: string,
    isArchived: boolean,
  ) {
    return this.update(id, { isArchived }, userId, profileId);
  }

  /**
   * Delete a post (hard delete)
   */
  async remove(id: string, userId: string, profileId: string) {
    // Check if post exists and user owns it
    const post = await this.prisma.post.findUnique({
      where: { id },
      select: {
        id: true,
        profileId: true,
        profile: {
          select: {
            userId: true,
            deleted: true,
          },
        },
      },
    });

    if (!post || post.profile.deleted) {
      throw new NotFoundException(`Post with ID ${id} not found`);
    }

    if (post.profileId !== profileId) {
      throw new ForbiddenException(ERROR_MESSAGES.NOT_RESOURCE_OWNER);
    }

    // Delete post (cascade will handle assets, comments, likes)
    await this.prisma.post.delete({
      where: { id },
    });

    return { message: 'Post deleted successfully' };
  }

  /**
   * Search posts by content
   */
  async search(
    query: string,
    currentUserId?: string,
    queryDto?: QueryPostsDto,
  ) {
    const {
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      order = 'desc',
    } = queryDto || {};

    const skip = (page - 1) * limit;
    const take = limit;

    const where: Prisma.PostWhereInput = {
      AND: [
        {
          content: {
            contains: query,
            mode: 'insensitive' as Prisma.QueryMode,
          },
        },
        { isArchived: false },
        {
          profile: {
            deleted: false,
          },
        },
      ],
    };

    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        where,
        select: postWithDetailsSelect,
        orderBy: { [sortBy]: order },
        skip,
        take,
      }),
      this.prisma.post.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: posts.map((post) => toPostResponse(post, currentUserId)),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Get posts by profile username
   */
  async findByUsername(
    username: string,
    currentUserId?: string,
    queryDto?: QueryPostsDto,
  ) {
    // Find profile by username
    const profile = await this.prisma.profile.findUnique({
      where: { username },
      select: { id: true, deleted: true, isPublic: true, userId: true },
    });

    if (!profile || profile.deleted) {
      throw new NotFoundException(
        ERROR_MESSAGES.PROFILE_USERNAME_NOT_FOUND(username),
      );
    }

    // If profile is private, check if current user is following
    if (!profile.isPublic) {
      // If no current user, return empty list for private profiles
      if (!currentUserId) {
        return {
          posts: [],
          total: 0,
          page: queryDto?.page || 1,
          limit: queryDto?.limit || 10,
          totalPages: 0,
        };
      }

      // If viewing own profile, allow access
      const isOwnProfile = profile.userId === currentUserId;

      if (!isOwnProfile) {
        // Get current user's profile ID
        const currentUserProfile = await this.prisma.profile.findFirst({
          where: { userId: currentUserId, deleted: false },
          select: { id: true },
        });

        if (!currentUserProfile) {
          return {
            posts: [],
            total: 0,
            page: queryDto?.page || 1,
            limit: queryDto?.limit || 10,
            totalPages: 0,
          };
        }

        // Check if current user is following this profile
        const follow = await this.prisma.profileFollow.findUnique({
          where: {
            followerProfileId_followedProfileId: {
              followerProfileId: currentUserProfile.id,
              followedProfileId: profile.id,
            },
          },
          select: { accepted: true },
        });

        // If not following or follow not accepted, return empty list
        if (!follow || !follow.accepted) {
          return {
            posts: [],
            total: 0,
            page: queryDto?.page || 1,
            limit: queryDto?.limit || 10,
            totalPages: 0,
          };
        }
      }
    }

    // Use findAll with profileId filter
    return this.findAll(
      {
        ...queryDto,
        profileId: profile.id,
      },
      currentUserId,
    );
  }

  /**
   * Toggle like on a post (like if not liked, unlike if already liked)
   */
  async toggleLike(postId: string, userId: string, profileId: string) {
    // Verify post exists and get owner info
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: {
        id: true,
        isArchived: true,
        assets: {
          select: {
            asset: {
              select: {
                thumbnailPath: true,
              },
            },
          },
          take: 1,
          orderBy: {
            orderIndex: 'asc',
          },
        },
        profile: {
          select: {
            id: true,
            userId: true,
            username: true,
          },
        },
      },
    });

    if (!post || post.isArchived) {
      throw new NotFoundException(ERROR_MESSAGES.POST_NOT_FOUND);
    }

    // Verify profile exists and belongs to user
    const profile = await this.prisma.profile.findUnique({
      where: { id: profileId },
      select: { id: true, userId: true, deleted: true, username: true },
    });

    if (!profile || profile.deleted || profile.userId !== userId) {
      throw new ForbiddenException(ERROR_MESSAGES.NOT_RESOURCE_OWNER);
    }

    // Check if already liked
    const existingLike = await this.prisma.postLike.findUnique({
      where: {
        postId_profileId: {
          postId,
          profileId,
        },
      },
    });

    if (existingLike) {
      // Unlike: delete the like
      await this.prisma.postLike.delete({
        where: {
          postId_profileId: {
            postId,
            profileId,
          },
        },
      });

      // Get updated count
      const likesCount = await this.prisma.postLike.count({
        where: { postId },
      });

      return {
        liked: false,
        likesCount,
      };
    } else {
      // Like: create new like
      await this.prisma.postLike.create({
        data: {
          postId,
          profileId,
          createdBy: userId,
        },
      });

      // Get updated count
      const likesCount = await this.prisma.postLike.count({
        where: { postId },
      });

      // Notify post owner (if not liking own post)
      if (post.profile.userId !== userId) {
        void this.notificationProducer.notifyPostLike(
          post.profile.userId,
          postId,
          userId,
          profile.username,
        );
      }

      return {
        liked: true,
        likesCount,
      };
    }
  }

  /**
   * Get users who liked a post
   */
  async getPostLikes(
    postId: string,
    options: { page?: number; limit?: number } = {},
  ) {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    // Verify post exists
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { id: true },
    });

    if (!post) {
      throw new NotFoundException(ERROR_MESSAGES.POST_NOT_FOUND);
    }

    const [likes, total] = await Promise.all([
      this.prisma.postLike.findMany({
        where: { postId },
        skip,
        take: limit,
        select: {
          id: true,
          profile: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
              bio: true,
            },
          },
          createdAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.postLike.count({ where: { postId } }),
    ]);

    return {
      likes: likes.map((like) => ({
        id: like.id,
        profile: like.profile,
        createdAt: like.createdAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
