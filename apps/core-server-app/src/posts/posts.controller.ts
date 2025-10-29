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
      'Upload an image file and receive an asset ID to attach to a post. Maximum file size: 10MB.',
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
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Image uploaded successfully',
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
    @Req() req: AuthenticatedRequest,
  ): Promise<UploadAssetResponseDto> {
    if (!file) {
      throw new BadRequestException(ERROR_MESSAGES.NO_FILE_UPLOADED);
    }

    const userId = req.user?.id;

    const asset = await this.assetManagementService.createAsset(file, userId);
    const url = this.assetManagementService.getAssetUrl(asset.filePath);

    return {
      ...asset,
      fileName: file.filename,
      url,
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
}
