// Post-related types shared across all services

export interface Asset {
  id: string;
  fileName: string;
  filePath: string;
  fileType: string;
  fileSize: number;
  orderIndex: number;
  url: string;
}

export interface PostProfile {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  isPublic: boolean;
}

export interface Post {
  id: string;
  profileId: string;
  content: string | null;
  aspectRatio: string; // e.g., "1:1", "4:5", "16:9"
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  profile: PostProfile;
  assets: Asset[];
  likesCount: number;
  commentsCount: number;
  isLikedByCurrentUser: boolean;
}

export interface CreatePostDto {
  content?: string;
  assetIds: string[];
  aspectRatio?: string; // e.g., "1:1", "4:5", "16:9" (default: "1:1")
}

export interface UpdatePostDto {
  content?: string;
  aspectRatio?: string;
  isArchived?: boolean;
  assetIds?: string[];
}

export interface QueryPostsDto {
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'updatedAt';
  order?: 'asc' | 'desc';
  search?: string;
  profileId?: string;
  includeArchived?: boolean;
}

export interface PostsPaginationResponse {
  data: Post[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface UploadAssetResponseDto {
  id: string;
  fileName: string;
  filePath: string;
  thumbnailPath?: string | null;
  mediumPath?: string | null;
  fileType: string;
  fileSize: number;
  aspectRatio?: string | null;
  url: string;
  thumbnailUrl?: string | null;
  mediumUrl?: string | null;
}
