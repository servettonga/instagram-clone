import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { NotificationConsumer } from './notification.consumer';
import { RabbitMQService } from '../services/rabbitmq.service';
import { NotificationService } from '../services/notification.service';
import { EmailService } from '../services/email.service';
import { EmailTemplateService } from '../templates/email-template.service';
import { NotificationType, NotificationPayload } from '@repo/shared-types';

describe('NotificationConsumer', () => {
  let consumer: NotificationConsumer;
  let rabbitMQService: jest.Mocked<RabbitMQService>;
  let notificationService: jest.Mocked<NotificationService>;
  let emailService: jest.Mocked<EmailService>;
  let mockLogger: jest.Mocked<Logger>;

  const mockRabbitMQService = {
    consume: jest.fn(),
    onModuleDestroy: jest.fn(),
  };

  const mockNotificationService = {
    createNotification: jest.fn(),
    getUserWithProfile: jest.fn(),
    markEmailSent: jest.fn(),
    enrichNotificationData: jest.fn(),
  };

  const mockEmailService = {
    sendEmail: jest.fn(),
  };

  const mockTemplateService = {
    generateEmail: jest.fn().mockReturnValue({
      subject: 'Test Subject',
      html: '<html>Test</html>',
    }),
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
        NotificationConsumer,
        {
          provide: RabbitMQService,
          useValue: mockRabbitMQService,
        },
        {
          provide: NotificationService,
          useValue: mockNotificationService,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
        {
          provide: EmailTemplateService,
          useValue: mockTemplateService,
        },
        {
          provide: Logger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    consumer = module.get<NotificationConsumer>(NotificationConsumer);
    rabbitMQService = module.get(RabbitMQService);
    notificationService = module.get(NotificationService);
    emailService = module.get(EmailService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('onModuleInit', () => {
    it('should start consuming messages', async () => {
      await consumer.onModuleInit();

      expect(rabbitMQService.consume).toHaveBeenCalledWith(
        'notifications',
        expect.any(Function),
      );
    });
  });

  describe('notification processing', () => {
    let handleNotification: (payload: NotificationPayload) => Promise<void>;

    beforeEach(async () => {
      // Capture the handler function passed to consume
      mockRabbitMQService.consume.mockImplementation((queue, handler) => {
        handleNotification = handler;
        return Promise.resolve();
      });

      await consumer.onModuleInit();
    });

    it('should create web notification', async () => {
      const payload: NotificationPayload = {
        userId: '1',
        type: NotificationType.POST_LIKE,
        title: 'New Like',
        message: 'Someone liked your post',
        entityType: 'post',
        entityId: '123',
        actorId: '2',
        sendWeb: true,
        sendEmail: false,
      };

      const mockNotification = {
        id: '1',
        ...payload,
        isRead: false,
        emailSent: false,
        createdAt: new Date(),
      };

      mockNotificationService.createNotification.mockResolvedValue(mockNotification as any);

      await handleNotification(payload);

      expect(mockNotificationService.createNotification).toHaveBeenCalledWith(payload);
    });

    it('should send email when requested', async () => {
      const payload: NotificationPayload = {
        userId: '1',
        type: NotificationType.POST_LIKE,
        title: 'New Like',
        message: 'Someone liked your post',
        sendWeb: true,
        sendEmail: true,
      };

      const mockNotification = {
        id: '1',
        ...payload,
        isRead: false,
        emailSent: false,
        createdAt: new Date(),
      };

      const mockUser = {
        id: '1',
        email: 'user@example.com',
        username: 'testuser',
        profile: { displayName: 'Test User' },
      };

      mockNotificationService.createNotification.mockResolvedValue(mockNotification as any);
      mockNotificationService.getUserWithProfile.mockResolvedValue(mockUser as any);
      mockNotificationService.enrichNotificationData.mockResolvedValue({
        notificationData: {
          type: payload.type,
          title: payload.title,
          message: payload.message,
        },
        updatedBy: '1',
      });

      await handleNotification(payload);

      expect(mockNotificationService.getUserWithProfile).toHaveBeenCalledWith('1');
      expect(emailService.sendEmail).toHaveBeenCalledWith({
        to: mockUser.email,
        subject: 'Test Subject',
        html: '<html>Test</html>',
      });
      expect(mockNotificationService.markEmailSent).toHaveBeenCalledWith('1');
    });

      it('should handle missing user gracefully', async () => {
        const payload: NotificationPayload = {
          userId: '999',
          type: NotificationType.POST_LIKE,
          title: 'New Like',
          message: 'Someone liked your post',
          sendWeb: true,
          sendEmail: true,
        };

        const mockNotification = {
          id: '1',
          ...payload,
          isRead: false,
          emailSent: false,
          createdAt: new Date(),
        };

        mockNotificationService.createNotification.mockResolvedValue(mockNotification as any);
        mockNotificationService.getUserWithProfile.mockResolvedValue(null);

        await expect(handleNotification(payload)).resolves.not.toThrow();

        expect(emailService.sendEmail).not.toHaveBeenCalled();
      });

      it('should handle email sending errors gracefully', async () => {
        const payload: NotificationPayload = {
          userId: '1',
          type: NotificationType.POST_LIKE,
          title: 'New Like',
          message: 'Someone liked your post',
          sendWeb: true,
          sendEmail: true,
        };

        const mockNotification = {
          id: '1',
          ...payload,
          isRead: false,
          emailSent: false,
          createdAt: new Date(),
        };

        const mockUser = {
          id: '1',
          email: 'user@example.com',
          username: 'testuser',
          profile: { displayName: 'Test User' },
        };

        mockNotificationService.createNotification.mockResolvedValue(mockNotification as any);
        mockNotificationService.getUserWithProfile.mockResolvedValue(mockUser as any);
        emailService.sendEmail.mockRejectedValue(new Error('SMTP error'));

        // Should not throw - email errors should be logged but not fail the notification
        await expect(handleNotification(payload)).resolves.not.toThrow();

        expect(mockNotificationService.createNotification).toHaveBeenCalled();
      });
    });
  });
