import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { PrismaService } from './prisma.service';
import { NotificationType } from '@repo/shared-types';

describe('NotificationService', () => {
  let service: NotificationService;
  let prismaService: jest.Mocked<PrismaService>;
  let mockLogger: jest.Mocked<Logger>;

  const mockPrismaService = {
    notification: {
      create: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: Logger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createNotification', () => {
    it('should create a notification successfully', async () => {
      const notificationData = {
        userId: '1',
        type: NotificationType.POST_LIKE,
        title: 'New Like',
        message: 'Someone liked your post',
        entityType: 'post',
        entityId: '123',
        actorId: '2',
        metadata: { postId: 123 },
      };

      const expectedResult = {
        id: '1',
        type: notificationData.type,
        title: notificationData.title,
        message: notificationData.message,
        data: {
          entityType: notificationData.entityType,
          entityId: notificationData.entityId,
          actorId: notificationData.actorId,
          postId: 123,
        },
        isRead: false,
        createdBy: notificationData.userId,
        createdAt: new Date(),
      };

      // Mock user.findUnique to return actor exists
      mockPrismaService.user = {
        findUnique: jest.fn().mockResolvedValue({ id: '2' }),
      } as any;

      mockPrismaService.notification.create.mockResolvedValue(expectedResult as any);

      const result = await service.createNotification(notificationData);

      expect(result).toEqual(expectedResult);
      expect(mockPrismaService.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: notificationData.type,
          title: notificationData.title,
          message: notificationData.message,
          isRead: false,
          createdBy: notificationData.userId,
        }),
      });
    });

    it('should handle errors when creating notification', async () => {
      const notificationData = {
        userId: '1',
        type: NotificationType.POST_LIKE,
        title: 'New Like',
        message: 'Someone liked your post',
      };

      mockPrismaService.notification.create.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(
        service.createNotification(notificationData),
      ).rejects.toThrow('Database error');
    });
  });

  describe('markEmailSent', () => {
    it('should mark notification email as sent', async () => {
      const notificationId = '1';

      mockPrismaService.notification.update.mockResolvedValue({
        id: notificationId,
        readAt: new Date(),
      } as any);

      await service.markEmailSent(notificationId);

      expect(mockPrismaService.notification.update).toHaveBeenCalledWith({
        where: { id: notificationId },
        data: { readAt: expect.any(Date) },
      });
    });

    it('should handle errors when marking email sent', async () => {
      const notificationId = '1';

      mockPrismaService.notification.update.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.markEmailSent(notificationId)).rejects.toThrow(
        'Database error',
      );
    });
  });

  describe('getUserWithProfile', () => {
    it('should fetch user with profile', async () => {
      const userId = '1';
      const mockDbUser = {
        id: userId,
        accounts: [
          {
            email: 'user@example.com',
          },
        ],
        profile: {
          username: 'testuser',
          displayName: 'Test User',
        },
      };

      const expectedResult = {
        id: userId,
        email: 'user@example.com',
        username: 'testuser',
        profile: {
          displayName: 'Test User',
        },
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockDbUser as any);

      const result = await service.getUserWithProfile(userId);

      expect(result).toEqual(expectedResult);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        include: {
          accounts: true,
          profile: true,
        },
      });
    });

    it('should return null when user not found', async () => {
      const userId = '999';

      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.getUserWithProfile(userId);

      expect(result).toBeNull();
    });
  });
});
