import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseInterceptors,
  UseGuards,
  UploadedFile,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiConsumes,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { QueryPostsDto } from './dto/query-posts.dto';
import { SearchPostsDto } from './dto/search-posts.dto';
import { UploadAssetResponseDto } from './dto/upload-asset.dto';
import { UuidValidationPipe } from '../common/pipes/uuid-validation.pipe';
import { AssetManagementService } from '../common/services/asset-management.service';
import { ERROR_MESSAGES } from '../common/constants/messages';
import { AccessGuard } from '../auth/guards/access.guard';
import type { AuthenticatedRequest } from '@repo/shared-types';

@ApiTags('Posts')
@Controller('posts')
@ApiBearerAuth('JWT-auth')
@UseGuards(AccessGuard)
export class PostsController {
  constructor(
    private readonly postsService: PostsService,
    private readonly assetManagementService: AssetManagementService,
  ) {}

  /**
   * Upload an image asset for a post
   * POST /api/posts/upload
   */
  @Post('upload')
  @ApiOperation({
    summary: 'Upload an image for a post',
    description:
      'Upload an image file with aspect ratio and receive processed image variants (thumbnail, medium, full). Maximum file size: 10MB.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Image file (jpg, jpeg, png, gif, webp)',
        },
        aspectRatio: {
          type: 'string',
          enum: ['1:1', '4:5', '16:9'],
          default: '1:1',
          description: 'Desired aspect ratio for the image',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Image uploaded and processed successfully',
    type: UploadAssetResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid file or file too large' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseInterceptors(
    FileInterceptor('file', {
      // Use asset management service options
    }),
  )
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { aspectRatio?: string },
    @Req() req: AuthenticatedRequest,
  ): Promise<UploadAssetResponseDto> {
    if (!file) {
      throw new BadRequestException(ERROR_MESSAGES.NO_FILE_UPLOADED);
    }

    const userId = req.user?.id;
    const aspectRatio = body.aspectRatio || '1:1';

    // Validate aspect ratio
    if (!['1:1', '4:5', '16:9'].includes(aspectRatio)) {
      throw new BadRequestException(
        'Invalid aspect ratio. Must be 1:1, 4:5, or 16:9',
      );
    }

    const asset = await this.assetManagementService.createAsset(
      file,
      userId,
      aspectRatio,
    );

    // Generate URLs for all image variants
    const url = this.assetManagementService.getAssetUrl(asset.filePath);
    const thumbnailUrl = asset.thumbnailPath
      ? this.assetManagementService.getAssetUrl(asset.thumbnailPath)
      : null;
    const mediumUrl = asset.mediumPath
      ? this.assetManagementService.getAssetUrl(asset.mediumPath)
      : null;

    return {
      ...asset,
      fileName: file.filename || file.originalname,
      url,
      thumbnailUrl,
      mediumUrl,
    };
  }

  /**
   * Create a new post
   * POST /api/posts
   */
  @Post()
  @ApiOperation({
    summary: 'Create a new post',
    description: 'Create a new post with optional image attachments.',
  })
  @ApiBody({
    type: CreatePostDto,
    description: 'Post creation payload with content and optional asset IDs',
    examples: {
      basic: {
        summary: 'Simple post',
        value: {
          content: 'What a beautiful day!',
        },
      },
      withAssets: {
        summary: 'Post with images',
        value: {
          content: 'Check out these photos!',
          assetIds: ['asset-id-1', 'asset-id-2'],
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Post created successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Profile not found' })
  async create(
    @Body() createPostDto: CreatePostDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user?.id || '';
    const profileId = req.user?.profile?.id || '';

    return this.postsService.create(createPostDto, userId, profileId);
  }

  /**
   * Get all posts with pagination and filters
   * GET /api/posts
   */
  @Get()
  @ApiOperation({
    summary: 'Get all posts',
    description:
      'Retrieve all posts with pagination, sorting, and optional filtering.',
  })
  @ApiResponse({
    status: 200,
    description: 'Posts retrieved successfully',
  })
  async findAll(
    @Query() queryDto: QueryPostsDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const currentUserId = req.user?.profile?.id;

    return this.postsService.findAll(queryDto, currentUserId);
  }

  /**
   * Get personalized feed
   * GET /api/posts/feed
   */
  @Get('feed')
  @ApiOperation({
    summary: 'Get personalized feed',
    description:
      'Retrieve posts from followed users (and own posts) in chronological order.',
  })
  @ApiResponse({
    status: 200,
    description: 'Feed retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getFeed(
    @Query() queryDto: QueryPostsDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const profileId = req.user?.profile?.id || '';

    return this.postsService.getFeed(profileId, queryDto);
  }

  /**
   * Get archived posts for current user
   * GET /api/posts/archived
   */
  @Get('archived')
  @ApiOperation({
    summary: 'Get archived posts',
    description:
      'Retrieve all archived posts for the current authenticated user.',
  })
  @ApiResponse({
    status: 200,
    description: 'Archived posts retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getArchivedPosts(
    @Query() queryDto: QueryPostsDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const profileId = req.user?.profile?.id || '';

    return this.postsService.getArchivedPosts(profileId, queryDto);
  }

  /**
   * Get saved posts for current user
   * GET /api/posts/saved
   */
  @Get('saved')
  @ApiOperation({
    summary: 'Get saved posts',
    description: 'Retrieve all saved posts for the current authenticated user.',
  })
  @ApiResponse({
    status: 200,
    description: 'Saved posts retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getSavedPosts(
    @Query() queryDto: QueryPostsDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const profileId = req.user?.profile?.id || '';

    return this.postsService.getSavedPosts(profileId, queryDto);
  }

  /**
   * Search posts
   * GET /api/posts/search
   */
  @Get('search')
  @ApiOperation({
    summary: 'Search posts',
    description: 'Search posts by content with pagination.',
  })
  @ApiResponse({
    status: 200,
    description: 'Search results retrieved successfully',
  })
  async search(
    @Query() searchDto: SearchPostsDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const currentUserId = req.user?.profile?.id;

    return this.postsService.search(searchDto.q, currentUserId, {
      page: searchDto.page,
      limit: searchDto.limit,
      sortBy: searchDto.sortBy,
      order: searchDto.order,
    });
  }

  /**
   * Get posts by username
   * GET /api/posts/user/:username
   */
  @Get('user/:username')
  @ApiOperation({
    summary: 'Get posts by username',
    description: 'Retrieve all posts from a specific user by their username.',
  })
  @ApiParam({
    name: 'username',
    description: 'Username of the profile',
    example: 'john.doe',
  })
  @ApiResponse({
    status: 200,
    description: 'Posts retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Profile not found' })
  async findByUsername(
    @Param('username') username: string,
    @Query() queryDto: QueryPostsDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const currentUserId = req.user?.profile?.id;

    return this.postsService.findByUsername(username, currentUserId, queryDto);
  }

  /**
   * Get a single post by ID
   * GET /api/posts/:id
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get a post by ID',
    description: 'Retrieve a single post by its ID.',
  })
  @ApiParam({
    name: 'id',
    description: 'Post ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Post retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Post not found' })
  async findOne(
    @Param('id', UuidValidationPipe) id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const currentUserId = req.user?.profile?.id;

    return this.postsService.findOne(id, currentUserId);
  }

  /**
   * Update a post
   * PATCH /api/posts/:id
   */
  @Patch(':id')
  @ApiOperation({
    summary: 'Update a post',
    description: 'Update an existing post. Only the post owner can update it.',
  })
  @ApiParam({
    name: 'id',
    description: 'Post ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({
    type: UpdatePostDto,
    description: 'Post update payload (all fields are optional)',
  })
  @ApiResponse({
    status: 200,
    description: 'Post updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not post owner' })
  @ApiResponse({ status: 404, description: 'Post not found' })
  async update(
    @Param('id', UuidValidationPipe) id: string,
    @Body() updatePostDto: UpdatePostDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user?.id || '';
    const profileId = req.user?.profile?.id || '';

    return this.postsService.update(id, updatePostDto, userId, profileId);
  }

  /**
   * Archive a post
   * PATCH /api/posts/:id/archive
   */
  @Patch(':id/archive')
  @ApiOperation({
    summary: 'Archive a post',
    description:
      'Archive a post. Archived posts are hidden from feeds but not deleted.',
  })
  @ApiParam({
    name: 'id',
    description: 'Post ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Post archived successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not post owner' })
  @ApiResponse({ status: 404, description: 'Post not found' })
  async archive(
    @Param('id', UuidValidationPipe) id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user?.id || '';
    const profileId = req.user?.profile?.id || '';

    return this.postsService.archive(id, userId, profileId, true);
  }

  /**
   * Unarchive a post
   * PATCH /api/posts/:id/unarchive
   */
  @Patch(':id/unarchive')
  @ApiOperation({
    summary: 'Unarchive a post',
    description: 'Restore an archived post.',
  })
  @ApiParam({
    name: 'id',
    description: 'Post ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Post unarchived successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not post owner' })
  @ApiResponse({ status: 404, description: 'Post not found' })
  async unarchive(
    @Param('id', UuidValidationPipe) id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user?.id || '';
    const profileId = req.user?.profile?.id || '';

    return this.postsService.archive(id, userId, profileId, false);
  }

  /**
   * Delete a post
   * DELETE /api/posts/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a post',
    description:
      'Permanently delete a post. Only the post owner can delete it.',
  })
  @ApiParam({
    name: 'id',
    description: 'Post ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 204,
    description: 'Post deleted successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not post owner' })
  @ApiResponse({ status: 404, description: 'Post not found' })
  async remove(
    @Param('id', UuidValidationPipe) id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user?.id || '';
    const profileId = req.user?.profile?.id || '';

    return this.postsService.remove(id, userId, profileId);
  }

  /**
   * Toggle like on a post
   * POST /api/posts/:id/like
   */
  @Post(':id/like')
  @ApiOperation({
    summary: 'Toggle like on a post',
    description:
      'Like a post if not already liked, or unlike if already liked. Returns the new like state and count.',
  })
  @ApiParam({
    name: 'id',
    description: 'Post ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Like toggled successfully',
    schema: {
      type: 'object',
      properties: {
        liked: {
          type: 'boolean',
          description: 'Whether the post is now liked',
        },
        likesCount: {
          type: 'number',
          description: 'Total number of likes',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Post not found' })
  async toggleLike(
    @Param('id', UuidValidationPipe) id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user?.id || '';
    const profileId = req.user?.profile?.id || '';

    return this.postsService.toggleLike(id, userId, profileId);
  }

  /**
   * Get post likes
   * GET /api/posts/:id/likes
   */
  @Get(':id/likes')
  @ApiOperation({
    summary: 'Get users who liked a post',
    description: 'Get a paginated list of users who liked a post.',
  })
  @ApiParam({
    name: 'id',
    description: 'Post ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Post likes retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Post not found' })
  async getPostLikes(
    @Param('id', UuidValidationPipe) id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.postsService.getPostLikes(id, { page, limit });
  }

  /**
   * Toggle save on a post
   * POST /api/posts/:id/save
   */
  @Post(':id/save')
  @ApiOperation({
    summary: 'Toggle save on a post',
    description:
      'Save a post if not already saved, or unsave if already saved. Returns the new save state.',
  })
  @ApiParam({
    name: 'id',
    description: 'Post ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Save toggled successfully',
    schema: {
      type: 'object',
      properties: {
        saved: {
          type: 'boolean',
          description: 'Whether the post is now saved',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Post not found' })
  async toggleSave(
    @Param('id', UuidValidationPipe) id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user?.id || '';
    const profileId = req.user?.profile?.id || '';

    return this.postsService.toggleSave(id, userId, profileId);
  }
}
