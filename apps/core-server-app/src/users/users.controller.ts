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
import { UuidValidationPipe } from '../common/pipes/uuid-validation.pipe';
import { ERROR_MESSAGES, HTTP_MESSAGES } from '../common/constants/messages';
import { AccessGuard } from '../auth/guards/access.guard';
import { OwnershipGuard } from '../common/guards/ownership.guard';
import { Public } from '../auth/decorators/public.decorator';

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
}
