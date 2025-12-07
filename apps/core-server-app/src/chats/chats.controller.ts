import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { ChatsService } from './chats.service';
import { MessagesService } from './services/messages.service';
import { AssetManagementService } from '../common/services/asset-management.service';
import { AccessGuard } from '../auth/guards/access.guard';
import { ChatEventsService } from '../realtime/services/chat-events.service';
import type { AuthenticatedRequest } from '@repo/shared-types';
import { CreatePrivateChatDto } from './dto/create-private-chat.dto';
import { CreateGroupChatDto } from './dto/create-group-chat.dto';
import { AddParticipantDto } from './dto/add-participant.dto';
import { GetMessagesDto as GetMessagesQueryDto } from './dto/get-messages.dto';
import { EditMessageDto, UpdateChatDto } from './dto/edit-message.dto';

@ApiTags('Chats')
@ApiBearerAuth('JWT-auth')
@UseGuards(AccessGuard)
@Controller('chats')
export class ChatsController {
  constructor(
    private readonly chatsService: ChatsService,
    private readonly messagesService: MessagesService,
    private readonly assetManagementService: AssetManagementService,
    private readonly chatEventsService: ChatEventsService,
  ) {}

  /**
   * Create a private (direct message) chat between two users
   */
  @Post('private')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a private chat (DM)' })
  @ApiResponse({ status: 201, description: 'Chat created successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async createPrivateChat(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreatePrivateChatDto,
  ) {
    return this.chatsService.createPrivateChat(req.user!.id, dto.otherUserId);
  }

  /**
   * Create a group chat with multiple participants
   */
  @Post('group')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a group chat' })
  @ApiResponse({ status: 201, description: 'Group chat created successfully' })
  @ApiResponse({ status: 404, description: 'One or more users not found' })
  async createGroupChat(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateGroupChatDto,
  ) {
    return this.chatsService.createGroupChat(
      req.user!.id,
      dto.name,
      dto.participantUserIds,
    );
  }

  /**
   * Get all chats for the current user
   */
  @Get()
  @ApiOperation({ summary: 'Get all chats for current user' })
  @ApiResponse({ status: 200, description: 'Chats retrieved successfully' })
  async getUserChats(@Req() req: AuthenticatedRequest) {
    return this.chatsService.getUserChats(req.user!.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update chat details (group name)' })
  @ApiResponse({ status: 200, description: 'Chat updated successfully' })
  async updateChat(
    @Param('id') chatId: string,
    @Body() updateChatDto: UpdateChatDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.chatsService.updateChat(chatId, req.user!.id, updateChatDto);
  }

  /**
   * Get a specific chat by ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get chat by ID' })
  @ApiResponse({ status: 200, description: 'Chat retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Not a chat participant' })
  @ApiResponse({ status: 404, description: 'Chat not found' })
  async getChat(@Req() req: AuthenticatedRequest, @Param('id') chatId: string) {
    return this.chatsService.getChat(chatId, req.user!.id);
  }

  /**
   * Get messages from a chat with pagination
   */
  @Get(':id/messages')
  @ApiOperation({ summary: 'Get chat messages with pagination' })
  @ApiResponse({ status: 200, description: 'Messages retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Not a chat participant' })
  @ApiResponse({ status: 404, description: 'Chat not found' })
  async getChatMessages(
    @Req() req: AuthenticatedRequest,
    @Param('id') chatId: string,
    @Query() query: GetMessagesQueryDto,
  ) {
    return this.messagesService.getMessages(
      chatId,
      req.user!.id,
      query.limit,
      query.cursor,
    );
  }

  /**
   * Add a participant to a group chat
   */
  @Post(':id/participants')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add participant to group chat' })
  @ApiResponse({ status: 201, description: 'Participant added successfully' })
  @ApiResponse({
    status: 400,
    description: 'Can only add participants to group chats',
  })
  @ApiResponse({ status: 403, description: 'Not a chat participant' })
  @ApiResponse({ status: 404, description: 'Chat or user not found' })
  async addParticipant(
    @Req() req: AuthenticatedRequest,
    @Param('id') chatId: string,
    @Body() dto: AddParticipantDto,
  ) {
    return this.chatsService.addParticipant(chatId, dto.userId, req.user!.id);
  }

  /**
   * Leave a group chat
   */
  @Post(':id/leave')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Leave a group chat' })
  @ApiResponse({ status: 200, description: 'Successfully left the chat' })
  @ApiResponse({ status: 400, description: 'Can only leave group chats' })
  @ApiResponse({ status: 403, description: 'Not a chat participant' })
  @ApiResponse({ status: 404, description: 'Chat not found' })
  async leaveChat(
    @Req() req: AuthenticatedRequest,
    @Param('id') chatId: string,
  ) {
    return this.chatsService.leaveChat(chatId, req.user!.id);
  }

  /**
   * Delete a chat
   */
  @Post(':id/delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a chat' })
  @ApiResponse({ status: 200, description: 'Chat deleted successfully' })
  @ApiResponse({
    status: 400,
    description: 'Only admins can delete group chats',
  })
  @ApiResponse({ status: 403, description: 'Not a chat participant' })
  @ApiResponse({ status: 404, description: 'Chat not found' })
  async deleteChat(
    @Req() req: AuthenticatedRequest,
    @Param('id') chatId: string,
  ) {
    return this.chatsService.deleteChat(chatId, req.user!.id);
  }

  /**
   * Mark chat as read for the current user
   */
  @Post(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark chat as read' })
  @ApiResponse({ status: 200, description: 'Chat marked as read successfully' })
  @ApiResponse({ status: 403, description: 'Not a chat participant' })
  @ApiResponse({ status: 404, description: 'Chat not found' })
  async markChatRead(
    @Req() req: AuthenticatedRequest,
    @Param('id') chatId: string,
  ) {
    return this.chatsService.markChatRead(chatId, req.user!.id);
  }

  /**
   * Edit a message in a chat
   */
  @Put(':chatId/messages/:messageId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Edit a message' })
  @ApiResponse({ status: 200, description: 'Message edited successfully' })
  @ApiResponse({ status: 403, description: 'Can only edit your own messages' })
  @ApiResponse({ status: 404, description: 'Message not found' })
  async editMessage(
    @Req() req: AuthenticatedRequest,
    @Param('messageId') messageId: string,
    @Body() dto: EditMessageDto,
  ) {
    const message = await this.messagesService.editMessage(
      messageId,
      req.user!.id,
      dto.content,
    );

    // Broadcast edit to all participants in the chat room via Socket.IO
    this.chatEventsService.broadcastMessageEdited(message.chatId, {
      messageId: message.id,
      content: message.content,
      editedAt: message.updatedAt.toISOString(),
    });

    return message;
  }

  /**
   * Delete a message in a chat
   */
  @Delete(':chatId/messages/:messageId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a message' })
  @ApiResponse({ status: 200, description: 'Message deleted successfully' })
  @ApiResponse({
    status: 403,
    description: 'Can only delete your own messages',
  })
  @ApiResponse({ status: 404, description: 'Message not found' })
  async deleteMessage(
    @Req() req: AuthenticatedRequest,
    @Param('messageId') messageId: string,
  ) {
    const result = await this.messagesService.deleteMessage(
      messageId,
      req.user!.id,
    );

    // Broadcast deletion to all participants in the chat room via Socket.IO
    this.chatEventsService.broadcastMessageDeleted(result.chatId, {
      messageId: result.id,
    });

    return result;
  }

  /**
   * Upload an image for a chat message
   */
  @Post(':chatId/messages/upload')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Upload an image for a chat message' })
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
      required: ['file'],
    },
  })
  @ApiResponse({ status: 201, description: 'Image uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file or no file uploaded' })
  @ApiResponse({ status: 403, description: 'Not a chat participant' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadMessageImage(
    @Req() req: AuthenticatedRequest,
    @Param('chatId') chatId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Verify user is a participant
    const isParticipant = await this.chatsService.validateParticipant(
      chatId,
      req.user!.id,
    );
    if (!isParticipant) {
      throw new BadRequestException('Not a chat participant');
    }

    const userId = req.user!.id;
    const asset = await this.assetManagementService.createAsset(
      file,
      userId,
      '1:1',
      'messages',
    );

    const url = this.assetManagementService.getAssetUrl(asset.filePath);
    const thumbnailUrl = asset.thumbnailPath
      ? this.assetManagementService.getAssetUrl(asset.thumbnailPath)
      : null;

    return {
      id: asset.id,
      fileName: asset.fileName,
      url,
      thumbnailUrl,
    };
  }
}
