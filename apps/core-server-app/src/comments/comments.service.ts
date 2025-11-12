import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { ERROR_MESSAGES } from '../common/constants/messages';
import { NotificationProducerService } from '../notifications/services/notification-producer.service';

@Injectable()
export class CommentsService {
  constructor(
    private prisma: PrismaService,
    private notificationProducer: NotificationProducerService,
  ) {}

  /**
   * Extract @username mentions from comment content
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
   * Send mention notifications to users mentioned in comment
   * Optimized to fetch profiles + preferences in a single query
   */
  private async notifyMentionedUsers(
    mentionedUsernames: string[],
    commentId: string,
    actorId: string,
    actorUsername: string,
    postId: string,
  ): Promise<void> {
    if (mentionedUsernames.length === 0) return;

    try {
      // Fetch profiles AND preferences in a single query (optimization for 10+ mentions)
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
            'comment',
            commentId,
            actorId,
            actorUsername,
            postId,
          );
        }
      }
    } catch (error) {
      // Log error but don't fail the comment creation
      console.error('Failed to send mention notifications:', error);
    }
  }

  /**
   * Create a new comment on a post
   */
  async create(
    postId: string,
    createCommentDto: CreateCommentDto,
    userId: string,
    profileId: string,
  ) {
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

    // If parentCommentId provided, verify it exists and belongs to the same post
    let parentCommentOwner: { userId: string; username: string } | null = null;
    if (createCommentDto.parentCommentId) {
      const parentComment = await this.prisma.comment.findUnique({
        where: { id: createCommentDto.parentCommentId },
        select: {
          id: true,
          postId: true,
          profile: {
            select: {
              userId: true,
              username: true,
            },
          },
        },
      });

      if (!parentComment) {
        throw new NotFoundException('Parent comment not found');
      }

      if (parentComment.postId !== postId) {
        throw new ForbiddenException(
          'Parent comment does not belong to this post',
        );
      }

      parentCommentOwner = parentComment.profile;
    }

    const comment = await this.prisma.comment.create({
      data: {
        postId,
        profileId,
        parentCommentId: createCommentDto.parentCommentId,
        content: createCommentDto.content,
        createdBy: userId,
      },
      include: {
        profile: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        _count: {
          select: {
            replies: true,
            likes: true,
          },
        },
      },
    });

    // Send notifications
    if (createCommentDto.parentCommentId && parentCommentOwner) {
      // This is a reply - notify parent comment owner if different user
      if (parentCommentOwner.userId !== userId) {
        void this.notificationProducer.notifyCommentReply(
          parentCommentOwner.userId,
          createCommentDto.parentCommentId,
          comment.id,
          userId,
          profile.username,
          postId,
        );
      }
    } else {
      // This is a top-level comment - notify post owner if different user
      if (post.profile.userId !== userId) {
        void this.notificationProducer.notifyPostComment(
          post.profile.userId,
          postId,
          comment.id,
          userId,
          profile.username,
        );
      }
    }

    // Extract and notify mentioned users
    const mentionedUsernames = this.extractMentions(createCommentDto.content);
    if (mentionedUsernames.length > 0) {
      void this.notifyMentionedUsers(
        mentionedUsernames,
        comment.id,
        userId,
        profile.username,
        postId,
      );
    }

    return {
      id: comment.id,
      postId: comment.postId,
      parentCommentId: comment.parentCommentId,
      content: comment.content,
      profile: comment.profile,
      _count: {
        replies: comment._count.replies,
        likes: comment._count.likes,
      },
      isLikedByUser: false,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
    };
  }

  /**
   * Get comments for a post
   */
  async findByPost(
    postId: string,
    options: { page?: number; limit?: number; profileId?: string } = {},
  ) {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;
    const profileId = options.profileId;

    // Verify post exists
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { id: true },
    });

    if (!post) {
      throw new NotFoundException(ERROR_MESSAGES.POST_NOT_FOUND);
    }

    // Get top-level comments (no parent)
    const [comments, total] = await Promise.all([
      this.prisma.comment.findMany({
        where: {
          postId,
          parentCommentId: null,
        },
        skip,
        take: limit,
        include: {
          profile: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
          _count: {
            select: {
              replies: true,
              likes: true,
            },
          },
          likes: profileId
            ? {
                where: { profileId },
                select: { id: true },
              }
            : false,
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.comment.count({
        where: {
          postId,
          parentCommentId: null,
        },
      }),
    ]);

    return {
      comments: comments.map((comment) => ({
        id: comment.id,
        postId: comment.postId,
        parentCommentId: comment.parentCommentId,
        content: comment.content,
        profile: comment.profile,
        _count: {
          replies: comment._count.replies,
          likes: comment._count.likes,
        },
        isLikedByUser: profileId ? comment.likes.length > 0 : false,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get replies for a comment
   */
  async getReplies(
    commentId: string,
    options: { page?: number; limit?: number; profileId?: string } = {},
  ) {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;
    const profileId = options.profileId;

    // Verify parent comment exists
    const parentComment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      select: { id: true },
    });

    if (!parentComment) {
      throw new NotFoundException('Comment not found');
    }

    const [replies, total] = await Promise.all([
      this.prisma.comment.findMany({
        where: {
          parentCommentId: commentId,
        },
        skip,
        take: limit,
        include: {
          profile: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
          _count: {
            select: {
              replies: true,
              likes: true,
            },
          },
          likes: profileId
            ? {
                where: { profileId },
                select: { id: true },
              }
            : false,
        },
        orderBy: {
          createdAt: 'asc',
        },
      }),
      this.prisma.comment.count({
        where: {
          parentCommentId: commentId,
        },
      }),
    ]);

    return {
      replies: replies.map((reply) => ({
        id: reply.id,
        postId: reply.postId,
        parentCommentId: reply.parentCommentId,
        content: reply.content,
        profile: reply.profile,
        _count: {
          replies: reply._count.replies,
          likes: reply._count.likes,
        },
        isLikedByUser: profileId ? reply.likes.length > 0 : false,
        createdAt: reply.createdAt,
        updatedAt: reply.updatedAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get a single comment
   */
  async findOne(commentId: string, profileId?: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        profile: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        _count: {
          select: {
            replies: true,
            likes: true,
          },
        },
        likes: profileId
          ? {
              where: { profileId },
              select: { id: true },
            }
          : false,
      },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    return {
      id: comment.id,
      postId: comment.postId,
      parentCommentId: comment.parentCommentId,
      content: comment.content,
      profile: comment.profile,
      _count: {
        replies: comment._count.replies,
        likes: comment._count.likes,
      },
      isLikedByUser: profileId ? comment.likes.length > 0 : false,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
    };
  }

  /**
   * Update a comment
   */
  async update(
    commentId: string,
    updateCommentDto: UpdateCommentDto,
    userId: string,
    profileId: string,
  ) {
    // Verify comment exists and user owns it
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      select: { id: true, profileId: true },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.profileId !== profileId) {
      throw new ForbiddenException(ERROR_MESSAGES.NOT_RESOURCE_OWNER);
    }

    const updatedComment = await this.prisma.comment.update({
      where: { id: commentId },
      data: {
        content: updateCommentDto.content,
        updatedBy: userId,
      },
      include: {
        profile: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        _count: {
          select: {
            replies: true,
            likes: true,
          },
        },
      },
    });

    return {
      id: updatedComment.id,
      postId: updatedComment.postId,
      parentCommentId: updatedComment.parentCommentId,
      content: updatedComment.content,
      profile: updatedComment.profile,
      _count: {
        replies: updatedComment._count.replies,
        likes: updatedComment._count.likes,
      },
      isLikedByUser: false,
      createdAt: updatedComment.createdAt,
      updatedAt: updatedComment.updatedAt,
    };
  }

  /**
   * Delete a comment
   */
  async remove(commentId: string, userId: string, profileId: string) {
    // Verify comment exists and user owns it
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      select: { id: true, profileId: true },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.profileId !== profileId) {
      throw new ForbiddenException(ERROR_MESSAGES.NOT_RESOURCE_OWNER);
    }

    await this.prisma.comment.delete({
      where: { id: commentId },
    });
  }

  /**
   * Toggle like on a comment (like if not liked, unlike if already liked)
   */
  async toggleLike(commentId: string, userId: string, profileId: string) {
    // Verify comment exists and get owner info
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      select: {
        id: true,
        postId: true,
        post: {
          select: {
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
          },
        },
        profile: {
          select: {
            userId: true,
            username: true,
          },
        },
      },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
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
    const existingLike = await this.prisma.commentLike.findUnique({
      where: {
        commentId_profileId: {
          commentId,
          profileId,
        },
      },
    });

    if (existingLike) {
      // Unlike: delete the like
      await this.prisma.commentLike.delete({
        where: {
          commentId_profileId: {
            commentId,
            profileId,
          },
        },
      });

      // Get updated count
      const likesCount = await this.prisma.commentLike.count({
        where: { commentId },
      });

      return {
        liked: false,
        likesCount,
      };
    } else {
      // Like: create new like
      await this.prisma.commentLike.create({
        data: {
          commentId,
          profileId,
          createdBy: userId,
        },
      });

      // Get updated count
      const likesCount = await this.prisma.commentLike.count({
        where: { commentId },
      });

      // Notify comment owner (if not liking own comment)
      if (comment.profile.userId !== userId) {
        void this.notificationProducer.notifyCommentLike(
          comment.profile.userId,
          commentId,
          userId,
          profile.username,
          comment.postId,
        );
      }

      return {
        liked: true,
        likesCount,
      };
    }
  }

  /**
   * Get users who liked a comment
   */
  async getCommentLikes(
    commentId: string,
    options: { page?: number; limit?: number } = {},
  ) {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    // Verify comment exists
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      select: { id: true },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    const [likes, total] = await Promise.all([
      this.prisma.commentLike.findMany({
        where: { commentId },
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
      this.prisma.commentLike.count({ where: { commentId } }),
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
