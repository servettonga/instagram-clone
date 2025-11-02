import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { QueryCommentsDto } from './dto/query-comments.dto';
import { UuidValidationPipe } from '../common/pipes/uuid-validation.pipe';
import { AccessGuard } from '../auth/guards/access.guard';
import type { AuthenticatedRequest } from '@repo/shared-types';

@ApiTags('Comments')
@Controller('posts/:postId/comments')
@ApiBearerAuth('JWT-auth')
@UseGuards(AccessGuard)
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  /**
   * Create a comment on a post
   * POST /api/posts/:postId/comments
   */
  @Post()
  @ApiOperation({
    summary: 'Create a comment',
    description:
      'Create a new comment on a post or reply to an existing comment.',
  })
  @ApiParam({ name: 'postId', type: 'string', description: 'Post ID' })
  @ApiResponse({ status: 201, description: 'Comment created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Post or parent comment not found' })
  async create(
    @Param('postId', UuidValidationPipe) postId: string,
    @Body() createCommentDto: CreateCommentDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user?.id || '';
    const profileId = req.user?.profile?.id || '';

    return this.commentsService.create(
      postId,
      createCommentDto,
      userId,
      profileId,
    );
  }

  /**
   * Get comments for a post
   * GET /api/posts/:postId/comments
   */
  @Get()
  @ApiOperation({
    summary: 'Get post comments',
    description: 'Get all top-level comments for a post (paginated).',
  })
  @ApiParam({ name: 'postId', type: 'string', description: 'Post ID' })
  @ApiResponse({ status: 200, description: 'Comments retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Post not found' })
  async findByPost(
    @Param('postId', UuidValidationPipe) postId: string,
    @Query() queryDto: QueryCommentsDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const profileId = req.user?.profile?.id;

    return this.commentsService.findByPost(postId, {
      page: queryDto.page,
      limit: queryDto.limit,
      profileId,
    });
  }
}

@ApiTags('Comments')
@Controller('comments')
@ApiBearerAuth('JWT-auth')
@UseGuards(AccessGuard)
export class CommentsManagementController {
  constructor(private readonly commentsService: CommentsService) {}

  /**
   * Get a single comment
   * GET /api/comments/:id
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get a comment',
    description: 'Get a single comment by ID.',
  })
  @ApiParam({ name: 'id', type: 'string', description: 'Comment ID' })
  @ApiResponse({ status: 200, description: 'Comment retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  async findOne(
    @Param('id', UuidValidationPipe) id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const profileId = req.user?.profile?.id;
    return this.commentsService.findOne(id, profileId);
  }

  /**
   * Get replies to a comment
   * GET /api/comments/:id/replies
   */
  @Get(':id/replies')
  @ApiOperation({
    summary: 'Get comment replies',
    description: 'Get all replies to a specific comment (paginated).',
  })
  @ApiParam({ name: 'id', type: 'string', description: 'Comment ID' })
  @ApiResponse({ status: 200, description: 'Replies retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  async getReplies(
    @Param('id', UuidValidationPipe) id: string,
    @Query() queryDto: QueryCommentsDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const profileId = req.user?.profile?.id;

    return this.commentsService.getReplies(id, {
      page: queryDto.page,
      limit: queryDto.limit,
      profileId,
    });
  }

  /**
   * Update a comment
   * PATCH /api/comments/:id
   */
  @Patch(':id')
  @ApiOperation({
    summary: 'Update a comment',
    description: 'Update a comment. Only the comment author can update it.',
  })
  @ApiParam({ name: 'id', type: 'string', description: 'Comment ID' })
  @ApiResponse({ status: 200, description: 'Comment updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not comment owner' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  async update(
    @Param('id', UuidValidationPipe) id: string,
    @Body() updateCommentDto: UpdateCommentDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user?.id || '';
    const profileId = req.user?.profile?.id || '';

    return this.commentsService.update(id, updateCommentDto, userId, profileId);
  }

  /**
   * Delete a comment
   * DELETE /api/comments/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a comment',
    description:
      'Delete a comment. Only the comment author can delete it. This will also delete all replies.',
  })
  @ApiParam({ name: 'id', type: 'string', description: 'Comment ID' })
  @ApiResponse({ status: 204, description: 'Comment deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not comment owner' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  async remove(
    @Param('id', UuidValidationPipe) id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user?.id || '';
    const profileId = req.user?.profile?.id || '';

    await this.commentsService.remove(id, userId, profileId);
  }

  /**
   * Toggle like on a comment
   * POST /api/comments/:id/like
   */
  @Post(':id/like')
  @ApiOperation({
    summary: 'Toggle like on a comment',
    description:
      'Like a comment if not already liked, or unlike if already liked. Returns the new like state and count.',
  })
  @ApiParam({ name: 'id', type: 'string', description: 'Comment ID' })
  @ApiResponse({
    status: 200,
    description: 'Like toggled successfully',
    schema: {
      type: 'object',
      properties: {
        liked: {
          type: 'boolean',
          description: 'Whether the comment is now liked',
        },
        likesCount: {
          type: 'number',
          description: 'Total number of likes',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  async toggleLike(
    @Param('id', UuidValidationPipe) id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user?.id || '';
    const profileId = req.user?.profile?.id || '';

    return this.commentsService.toggleLike(id, userId, profileId);
  }

  /**
   * Get comment likes
   * GET /api/comments/:id/likes
   */
  @Get(':id/likes')
  @ApiOperation({
    summary: 'Get users who liked a comment',
    description: 'Get a paginated list of users who liked a comment.',
  })
  @ApiParam({ name: 'id', type: 'string', description: 'Comment ID' })
  @ApiResponse({
    status: 200,
    description: 'Comment likes retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  async getCommentLikes(
    @Param('id', UuidValidationPipe) id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.commentsService.getCommentLikes(id, { page, limit });
  }
}
