import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  NotFoundException,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  Query,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiExcludeEndpoint,
  ApiConsumes,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { SearchUsersDto } from './dto/search-users.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import { SuggestionsQueryDto } from './dto/suggestions-query.dto';
import { FollowResponseDto } from './dto/follow-response.dto';
import { FollowersListDto } from './dto/follower.dto';
import { FollowingListDto } from './dto/following.dto';
import { FollowRequestsListDto } from './dto/follow-requests.dto';
import { UuidValidationPipe } from '../common/pipes/uuid-validation.pipe';
import { ERROR_MESSAGES, HTTP_MESSAGES } from '../common/constants/messages';
import { AccessGuard } from '../auth/guards/access.guard';
import { OwnershipGuard } from '../common/guards/ownership.guard';
import { Public } from '../auth/decorators/public.decorator';
import type { AuthenticatedRequest } from '@repo/shared-types';

@ApiTags('Users')
@Controller('users')
@UseGuards(AccessGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * POST /api/users
   * INTERNAL ONLY - Called by Auth Service
   * NOT exposed in Swagger (hidden from public API)
   */
  @Post()
  @Public() // Skip AccessGuard for this internal endpoint
  @ApiExcludeEndpoint() // Hide from Swagger docs
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get all users',
    description: 'Retrieve all users (requires authentication)',
  })
  @ApiResponse({ status: 200, description: HTTP_MESSAGES.USER_RETRIEVED })
  @ApiResponse({ status: 401, description: ERROR_MESSAGES.UNAUTHORIZED })
  findAll() {
    return this.usersService.findAll();
  }

  @Get('search')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Search users',
    description:
      'Search users by username or display name (requires authentication)',
  })
  @ApiResponse({ status: 200, description: 'Returns search results' })
  @ApiResponse({ status: 401, description: ERROR_MESSAGES.UNAUTHORIZED })
  async searchUsers(@Query() searchDto: SearchUsersDto) {
    return this.usersService.search(searchDto.q, {
      page: searchDto.page,
      limit: searchDto.limit,
    });
  }

  @Get('check-username/:username')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Check username availability',
    description: 'Check if a username is available (requires authentication)',
  })
  @ApiParam({ name: 'username', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Returns availability status',
    schema: {
      type: 'object',
      properties: {
        available: { type: 'boolean' },
        username: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 401, description: ERROR_MESSAGES.UNAUTHORIZED })
  async checkUsernameAvailability(@Param('username') username: string) {
    const user = await this.usersService.findByUsername(username);
    return {
      available: !user,
      username,
    };
  }

  @Get('internal/:id')
  @Public() // Skip AccessGuard for this internal endpoint
  @ApiExcludeEndpoint()
  findOneInternal(@Param('id', UuidValidationPipe) id: string) {
    // Internal endpoint for Auth Service - bypasses authentication
    return this.usersService.findOne(id);
  }

  @Get('by-username/:username')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get user by username',
    description: 'Retrieve user profile by username (requires authentication)',
  })
  @ApiParam({ name: 'username', type: 'string' })
  @ApiResponse({ status: 200, description: HTTP_MESSAGES.USER_RETRIEVED })
  @ApiResponse({
    status: 404,
    description: ERROR_MESSAGES.USER_NOT_FOUND(':username'),
  })
  @ApiResponse({ status: 401, description: ERROR_MESSAGES.UNAUTHORIZED })
  async findByUsername(@Param('username') username: string) {
    const user = await this.usersService.findByUsername(username);
    if (!user) {
      throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND(username));
    }
    return user;
  }

  @Get(':id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get user by ID',
    description: 'Retrieve user profile by ID (requires authentication)',
  })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: 200, description: HTTP_MESSAGES.USER_RETRIEVED })
  @ApiResponse({
    status: 404,
    description: ERROR_MESSAGES.USER_NOT_FOUND(':id'),
  })
  @ApiResponse({ status: 400, description: ERROR_MESSAGES.INVALID_UUID_FORMAT })
  @ApiResponse({ status: 401, description: ERROR_MESSAGES.UNAUTHORIZED })
  findOne(@Param('id', UuidValidationPipe) id: string) {
    return this.usersService.findOne(id);
  }

  @Post(':id/avatar')
  @UseGuards(OwnershipGuard)
  @ApiBearerAuth('JWT-auth')
  @UseInterceptors(FileInterceptor('avatar'))
  @ApiOperation({ summary: 'Upload user avatar' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        avatar: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({
    status: 200,
    description: HTTP_MESSAGES.AVATAR_UPLOADED,
    schema: {
      type: 'object',
      properties: {
        avatarUrl: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: ERROR_MESSAGES.UNAUTHORIZED,
  })
  @ApiResponse({
    status: 403,
    description: ERROR_MESSAGES.NOT_RESOURCE_OWNER,
  })
  @ApiResponse({
    status: 404,
    description: ERROR_MESSAGES.USER_NOT_FOUND(':id'),
  })
  @ApiResponse({ status: 400, description: ERROR_MESSAGES.INVALID_FILE_TYPE })
  async uploadAvatar(
    @Param('id', UuidValidationPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.usersService.uploadAvatar(id, file);
  }

  @Patch(':id')
  @UseGuards(OwnershipGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update user' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: 200, description: HTTP_MESSAGES.USER_UPDATED })
  @ApiResponse({
    status: 401,
    description: ERROR_MESSAGES.UNAUTHORIZED,
  })
  @ApiResponse({
    status: 403,
    description: ERROR_MESSAGES.NOT_RESOURCE_OWNER,
  })
  @ApiResponse({
    status: 404,
    description: ERROR_MESSAGES.USER_NOT_FOUND(':id'),
  })
  @ApiResponse({ status: 400, description: ERROR_MESSAGES.INVALID_UUID_FORMAT })
  update(
    @Param('id', UuidValidationPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @UseGuards(OwnershipGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete user (soft delete)' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: 204, description: HTTP_MESSAGES.USER_DELETED })
  @ApiResponse({
    status: 401,
    description: ERROR_MESSAGES.UNAUTHORIZED,
  })
  @ApiResponse({
    status: 403,
    description: ERROR_MESSAGES.NOT_RESOURCE_OWNER,
  })
  @ApiResponse({
    status: 404,
    description: ERROR_MESSAGES.USER_NOT_FOUND(':id'),
  })
  @ApiResponse({ status: 400, description: ERROR_MESSAGES.INVALID_UUID_FORMAT })
  remove(@Param('id', UuidValidationPipe) id: string) {
    return this.usersService.remove(id);
  }

  // Follow/Unfollow Endpoints

  @Post(':id/follow')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Follow a user',
    description:
      'Follow a user. If the user has a private profile, a follow request will be sent.',
  })
  @ApiParam({ name: 'id', type: 'string', description: 'User ID to follow' })
  @ApiResponse({
    status: 201,
    description: 'Successfully followed user or sent follow request',
    type: FollowResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Cannot follow yourself' })
  @ApiResponse({ status: 401, description: ERROR_MESSAGES.UNAUTHORIZED })
  @ApiResponse({
    status: 404,
    description: ERROR_MESSAGES.USER_NOT_FOUND(':id'),
  })
  @ApiResponse({ status: 409, description: 'Already following this user' })
  async followUser(
    @Param('id', UuidValidationPipe) id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const currentUserId = req.user?.id || '';
    return this.usersService.followUser(currentUserId, id);
  }

  @Delete(':id/follow')
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Unfollow a user',
    description: 'Unfollow a user or cancel a pending follow request.',
  })
  @ApiParam({ name: 'id', type: 'string', description: 'User ID to unfollow' })
  @ApiResponse({ status: 204, description: 'Successfully unfollowed user' })
  @ApiResponse({ status: 401, description: ERROR_MESSAGES.UNAUTHORIZED })
  @ApiResponse({
    status: 404,
    description: 'User or follow relationship not found',
  })
  async unfollowUser(
    @Param('id', UuidValidationPipe) id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const currentUserId = req.user?.id || '';
    await this.usersService.unfollowUser(currentUserId, id);
  }

  @Get(':id/followers')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get user followers',
    description: 'Get a list of users following this user.',
  })
  @ApiParam({ name: 'id', type: 'string', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved followers',
    type: FollowersListDto,
  })
  @ApiResponse({ status: 401, description: ERROR_MESSAGES.UNAUTHORIZED })
  @ApiResponse({
    status: 404,
    description: ERROR_MESSAGES.USER_NOT_FOUND(':id'),
  })
  async getFollowers(
    @Param('id', UuidValidationPipe) id: string,
    @Query() paginationDto: PaginationQueryDto,
  ) {
    return this.usersService.getFollowers(id, {
      page: paginationDto.page,
      limit: paginationDto.limit,
    });
  }

  @Get(':id/following')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get users this user is following',
    description: 'Get a list of users that this user follows.',
  })
  @ApiParam({ name: 'id', type: 'string', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved following list',
    type: FollowingListDto,
  })
  @ApiResponse({ status: 401, description: ERROR_MESSAGES.UNAUTHORIZED })
  @ApiResponse({
    status: 404,
    description: ERROR_MESSAGES.USER_NOT_FOUND(':id'),
  })
  async getFollowing(
    @Param('id', UuidValidationPipe) id: string,
    @Query() paginationDto: PaginationQueryDto,
  ) {
    return this.usersService.getFollowing(id, {
      page: paginationDto.page,
      limit: paginationDto.limit,
    });
  }

  @Get(':id/is-following/:targetId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Check if user is following another user',
    description: 'Check if user A is following user B.',
  })
  @ApiParam({ name: 'id', type: 'string', description: 'Follower user ID' })
  @ApiParam({
    name: 'targetId',
    type: 'string',
    description: 'Followed user ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns follow status',
    schema: {
      type: 'object',
      properties: {
        isFollowing: { type: 'boolean' },
        isPending: { type: 'boolean' },
      },
    },
  })
  @ApiResponse({ status: 401, description: ERROR_MESSAGES.UNAUTHORIZED })
  async isFollowing(
    @Param('id', UuidValidationPipe) id: string,
    @Param('targetId', UuidValidationPipe) targetId: string,
  ) {
    return this.usersService.isFollowing(id, targetId);
  }

  /**
   * GET /api/users/me/suggestions
   * Returns suggested users for the authenticated user.
   * Query params:
   * - type: one of 'popular_followers' | 'friends_of_following' | 'most_followers'
   * - limit: number of suggestions to return (max 100)
   */
  @Get('me/suggestions')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get suggested users',
    description:
      'Get suggested users for the authenticated user based on several strategies',
  })
  @ApiResponse({ status: 200, description: 'Suggested users' })
  @ApiResponse({ status: 401, description: ERROR_MESSAGES.UNAUTHORIZED })
  getSuggestions(
    @Req() req: AuthenticatedRequest,
    @Query() query: SuggestionsQueryDto,
  ) {
    const currentUserId = req.user?.id || '';
    return this.usersService.getSuggestions(currentUserId, {
      type: query.type,
      limit: query.limit,
    });
  }

  // Follow Requests Endpoints

  @Get('me/follow-requests')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get pending follow requests',
    description:
      'Get all pending follow requests for the authenticated user (people who want to follow them).',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved follow requests',
    type: FollowRequestsListDto,
  })
  @ApiResponse({ status: 401, description: ERROR_MESSAGES.UNAUTHORIZED })
  async getFollowRequests(
    @Req() req: AuthenticatedRequest,
    @Query() paginationDto: PaginationQueryDto,
  ) {
    const currentUserId = req.user?.id || '';
    return this.usersService.getFollowRequests(currentUserId, {
      page: paginationDto.page,
      limit: paginationDto.limit,
    });
  }

  @Post('me/follow-requests/:userId/approve')
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Approve a follow request',
    description: 'Approve a pending follow request from another user.',
  })
  @ApiParam({
    name: 'userId',
    type: 'string',
    description: 'User ID of the follower',
  })
  @ApiResponse({
    status: 204,
    description: 'Successfully approved follow request',
  })
  @ApiResponse({ status: 401, description: ERROR_MESSAGES.UNAUTHORIZED })
  @ApiResponse({ status: 404, description: 'Follow request not found' })
  async approveFollowRequest(
    @Param('userId', UuidValidationPipe) userId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const currentUserId = req.user?.id || '';
    await this.usersService.approveFollowRequest(currentUserId, userId);
  }

  @Post('me/follow-requests/:userId/reject')
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Reject a follow request',
    description: 'Reject a pending follow request from another user.',
  })
  @ApiParam({
    name: 'userId',
    type: 'string',
    description: 'User ID of the follower',
  })
  @ApiResponse({
    status: 204,
    description: 'Successfully rejected follow request',
  })
  @ApiResponse({ status: 401, description: ERROR_MESSAGES.UNAUTHORIZED })
  @ApiResponse({ status: 404, description: 'Follow request not found' })
  async rejectFollowRequest(
    @Param('userId', UuidValidationPipe) userId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const currentUserId = req.user?.id || '';
    await this.usersService.rejectFollowRequest(currentUserId, userId);
  }
}
