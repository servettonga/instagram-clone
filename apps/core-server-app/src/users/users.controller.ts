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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UuidValidationPipe } from '../common/pipes/uuid-validation.pipe';
import { ERROR_MESSAGES, HTTP_MESSAGES } from '../common/constants/messages';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, description: HTTP_MESSAGES.USER_CREATED })
  @ApiResponse({
    status: 409,
    description: ERROR_MESSAGES.EMAIL_OR_USERNAME_EXISTS,
  })
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({ status: 200, description: HTTP_MESSAGES.USER_RETRIEVED })
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: 200, description: HTTP_MESSAGES.USER_RETRIEVED })
  @ApiResponse({
    status: 404,
    description: ERROR_MESSAGES.USER_NOT_FOUND(':id'),
  })
  @ApiResponse({ status: 400, description: ERROR_MESSAGES.INVALID_UUID_FORMAT })
  findOne(@Param('id', UuidValidationPipe) id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: 200, description: HTTP_MESSAGES.USER_UPDATED })
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
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete user (soft delete)' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: 204, description: HTTP_MESSAGES.USER_DELETED })
  @ApiResponse({
    status: 404,
    description: ERROR_MESSAGES.USER_NOT_FOUND(':id'),
  })
  @ApiResponse({ status: 400, description: ERROR_MESSAGES.INVALID_UUID_FORMAT })
  remove(@Param('id', UuidValidationPipe) id: string) {
    return this.usersService.remove(id);
  }
}
