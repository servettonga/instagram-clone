import { Prisma } from '@prisma/client';

/**
 * Select for safe post data with related entities
 */
export const postWithDetailsSelect = {
  id: true,
  profileId: true,
  content: true,
  aspectRatio: true,
  isArchived: true,
  createdAt: true,
  updatedAt: true,
  profile: {
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      isPublic: true,
    },
  },
  assets: {
    select: {
      id: true,
      orderIndex: true,
      asset: {
        select: {
          id: true,
          fileName: true,
          filePath: true,
          fileType: true,
          fileSize: true,
          orderIndex: true,
        },
      },
    },
    orderBy: {
      orderIndex: 'asc' as const,
    },
  },
  likes: {
    select: {
      id: true,
      profileId: true,
      createdAt: true,
    },
  },
  comments: {
    select: {
      id: true,
    },
  },
  _count: {
    select: {
      likes: true,
      comments: true,
    },
  },
} satisfies Prisma.PostSelect;

export type PostWithDetails = Prisma.PostGetPayload<{
  select: typeof postWithDetailsSelect;
}>;

/**
 * Transform post to safe response format with computed fields
 */
export function toPostResponse(
  post: PostWithDetails,
  currentUserId?: string,
  coreServiceUrl?: string,
) {
  const baseurl =
    coreServiceUrl || process.env.CORE_SERVICE_URL || 'http://localhost:8000';

  return {
    id: post.id,
    profileId: post.profileId,
    content: post.content,
    aspectRatio: post.aspectRatio,
    isArchived: post.isArchived,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    profile: post.profile,
    assets: post.assets.map((pa) => ({
      id: pa.asset.id,
      fileName: pa.asset.fileName,
      filePath: pa.asset.filePath,
      fileType: pa.asset.fileType,
      fileSize: pa.asset.fileSize,
      orderIndex: pa.orderIndex,
      url: `${baseurl}${pa.asset.filePath}`,
    })),
    likesCount: post._count.likes,
    commentsCount: post._count.comments,
    isLikedByCurrentUser: currentUserId
      ? post.likes.some((like) => like.profileId === currentUserId)
      : false,
  };
}
