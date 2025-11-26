import { Test, TestingModule } from '@nestjs/testing';
import { ChatsController } from './chats.controller';
import { ChatsService } from './chats.service';
import { MessagesService } from './services/messages.service';
import { AssetManagementService } from '../common/services/asset-management.service';
import { ChatEventsService } from '../realtime/services/chat-events.service';
import { AccessGuard } from '../auth/guards/access.guard';
import type { AuthenticatedRequest } from '@repo/shared-types';

describe('ChatsController', () => {
  let controller: ChatsController;
  type ChatsServiceMock = jest.Mocked<
    Pick<
      ChatsService,
      | 'createPrivateChat'
      | 'createGroupChat'
      | 'getUserChats'
      | 'getChat'
      | 'addParticipant'
      | 'leaveChat'
      | 'deleteChat'
      | 'markChatRead'
    >
  >;

  type MessagesServiceMock = jest.Mocked<Pick<MessagesService, 'getMessages'>>;

  let chatsService: ChatsServiceMock;
  let messagesService: MessagesServiceMock;

  const createReq = (userId = 'user-1'): AuthenticatedRequest =>
    ({ user: { id: userId } } as AuthenticatedRequest);

  beforeEach(async () => {
    chatsService = {
      createPrivateChat: jest.fn(),
      createGroupChat: jest.fn(),
      getUserChats: jest.fn(),
      getChat: jest.fn(),
      addParticipant: jest.fn(),
      leaveChat: jest.fn(),
      deleteChat: jest.fn(),
      markChatRead: jest.fn(),
    } as ChatsServiceMock;

    messagesService = {
      getMessages: jest.fn(),
    } as MessagesServiceMock;

    const mockAssetManagementService = {
      createAsset: jest.fn(),
      getAsset: jest.fn(),
    };

    const mockChatEventsService = {
      broadcastMessageEdited: jest.fn(),
      broadcastMessageDeleted: jest.fn(),
      broadcastUserJoined: jest.fn(),
      broadcastUserLeft: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatsController],
      providers: [
        { provide: ChatsService, useValue: chatsService },
        { provide: MessagesService, useValue: messagesService },
        { provide: AssetManagementService, useValue: mockAssetManagementService },
        { provide: ChatEventsService, useValue: mockChatEventsService },
      ],
    })
      .overrideGuard(AccessGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ChatsController>(ChatsController);
    jest.clearAllMocks();
  });

  it('creates a private chat', async () => {
    chatsService.createPrivateChat.mockResolvedValueOnce({ id: 'chat-1' } as any);
    const dto = { otherUserId: 'user-2' };

    const result = await controller.createPrivateChat(createReq(), dto);

    expect(result).toEqual({ id: 'chat-1' });
    expect(chatsService.createPrivateChat).toHaveBeenCalledWith(
      'user-1',
      'user-2',
    );
  });

  it('creates a group chat', async () => {
    chatsService.createGroupChat.mockResolvedValueOnce({ id: 'chat-2' } as any);
    const dto = { name: 'Team', participantUserIds: ['user-2', 'user-3'] };

    const result = await controller.createGroupChat(createReq(), dto);

    expect(result).toEqual({ id: 'chat-2' });
    expect(chatsService.createGroupChat).toHaveBeenCalledWith(
      'user-1',
      'Team',
      ['user-2', 'user-3'],
    );
  });

  it('retrieves all chats for a user', async () => {
    chatsService.getUserChats.mockResolvedValueOnce([{ id: 'chat-1' }] as any);

    const result = await controller.getUserChats(createReq());

    expect(result).toEqual([{ id: 'chat-1' }]);
    expect(chatsService.getUserChats).toHaveBeenCalledWith('user-1');
  });

  it('gets a single chat by id', async () => {
    chatsService.getChat.mockResolvedValueOnce({ id: 'chat-1' } as any);

    const result = await controller.getChat(createReq(), 'chat-1');

    expect(result).toEqual({ id: 'chat-1' });
    expect(chatsService.getChat).toHaveBeenCalledWith('chat-1', 'user-1');
  });

  it('gets chat messages with pagination', async () => {
    messagesService.getMessages.mockResolvedValueOnce({
      messages: [],
      hasMore: false,
      nextCursor: null,
    } as any);
    const query = { limit: 20, cursor: 'msg-1' };

    const result = await controller.getChatMessages(
      createReq(),
      'chat-1',
      query,
    );

    expect(result).toEqual({ messages: [], hasMore: false, nextCursor: null });
    expect(messagesService.getMessages).toHaveBeenCalledWith(
      'chat-1',
      'user-1',
      20,
      'msg-1',
    );
  });

  it('adds a participant to a chat', async () => {
    chatsService.addParticipant.mockResolvedValueOnce({ success: true } as any);
    const dto = { userId: 'user-3' };

    const result = await controller.addParticipant(createReq(), 'chat-1', dto);

    expect(result).toEqual({ success: true });
    expect(chatsService.addParticipant).toHaveBeenCalledWith(
      'chat-1',
      'user-3',
      'user-1',
    );
  });

  it('leaves a group chat', async () => {
    chatsService.leaveChat.mockResolvedValueOnce({ success: true } as any);

    const result = await controller.leaveChat(createReq(), 'chat-1');

    expect(result).toEqual({ success: true });
    expect(chatsService.leaveChat).toHaveBeenCalledWith('chat-1', 'user-1');
  });

  it('deletes a chat', async () => {
    chatsService.deleteChat.mockResolvedValueOnce({ success: true } as any);

    const result = await controller.deleteChat(createReq(), 'chat-1');

    expect(result).toEqual({ success: true });
    expect(chatsService.deleteChat).toHaveBeenCalledWith('chat-1', 'user-1');
  });

  it('marks a chat as read', async () => {
    chatsService.markChatRead.mockResolvedValueOnce({ success: true } as any);

    const result = await controller.markChatRead(createReq(), 'chat-1');

    expect(result).toEqual({ success: true });
    expect(chatsService.markChatRead).toHaveBeenCalledWith('chat-1', 'user-1');
  });
});
