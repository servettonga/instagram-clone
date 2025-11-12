import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { EmailService } from './email.service';
import * as nodemailer from 'nodemailer';

// Mock the config module
jest.mock('../config/app.config', () => ({
  getConfig: jest.fn(() => ({
    mailConfig: {
      host: 'smtp.test.com',
      port: 587,
      secure: false,
      user: 'test@test.com',
      password: 'password',
      from: 'noreply@test.com',
    },
    frontendUrl: 'http://localhost:3000',
  })),
}));

// Mock nodemailer
jest.mock('nodemailer');

describe('EmailService', () => {
  let service: EmailService;
  let mockTransporter: any;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(async () => {
    mockTransporter = {
      sendMail: jest.fn().mockResolvedValue({ messageId: 'test-id' }),
    };

    (nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransporter);

    // Create mock Logger
    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: Logger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);

    // Initialize the service
    await service.onModuleInit();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should create transporter with correct config', () => {
      expect(nodemailer.createTransport).toHaveBeenCalledWith({
        host: 'smtp.test.com',
        port: 587,
        secure: false,
        auth: {
          user: 'test@test.com',
          pass: 'password',
        },
      });
    });
  });

  describe('sendNotificationEmail', () => {
    it('should send notification email successfully', async () => {
      const user = {
        id: '1',
        email: 'user@example.com',
        username: 'testuser',
        profile: {
          displayName: 'Test User',
        },
      };

      const notification = {
        id: '1',
        userId: '1',
        type: 'POST_LIKE',
        title: 'New Like',
        message: 'Someone liked your post',
        isRead: false,
        emailSent: false,
        createdAt: new Date(),
      } as any;

      await service.sendNotificationEmail(user as any, notification);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: expect.stringContaining('noreply@test.com'),
        to: user.email,
        subject: notification.title,
        html: expect.stringContaining(notification.message),
      });
    });

    it('should handle email sending errors', async () => {
      const user = {
        id: '1',
        email: 'user@example.com',
        username: 'testuser',
        profile: { displayName: 'Test User' },
      };

      const notification = {
        id: '1',
        userId: '1',
        type: 'POST_LIKE',
        title: 'New Like',
        message: 'Someone liked your post',
        isRead: false,
        emailSent: false,
        createdAt: new Date(),
      } as any;

      mockTransporter.sendMail.mockRejectedValue(new Error('SMTP error'));

      await expect(
        service.sendNotificationEmail(user as any, notification),
      ).rejects.toThrow('SMTP error');
    });
  });

  describe('email content generation', () => {
    it('should include user display name in email', async () => {
      const user = {
        id: '1',
        email: 'user@example.com',
        username: 'testuser',
        profile: {
          displayName: 'Test User',
        },
      };

      const notification = {
        id: '1',
        userId: '1',
        type: 'POST_LIKE',
        title: 'New Like',
        message: 'Someone liked your post',
        isRead: false,
        emailSent: false,
        createdAt: new Date(),
      } as any;

      await service.sendNotificationEmail(user as any, notification);

      const sentHtml = mockTransporter.sendMail.mock.calls[0][0].html;
      expect(sentHtml).toContain('Test User');
      expect(sentHtml).toContain(notification.message);
    });

    it('should fallback to username when displayName is not set', async () => {
      const user = {
        id: '1',
        email: 'user@example.com',
        username: 'testuser',
        profile: null,
      };

      const notification = {
        id: '1',
        userId: '1',
        type: 'POST_LIKE',
        title: 'New Like',
        message: 'Someone liked your post',
        isRead: false,
        emailSent: false,
        createdAt: new Date(),
      } as any;

      await service.sendNotificationEmail(user as any, notification);

      const sentHtml = mockTransporter.sendMail.mock.calls[0][0].html;
      expect(sentHtml).toContain('testuser');
    });
  });

  describe('HTML template generation', () => {
    it('should generate HTML with proper structure', async () => {
      const user = {
        id: '1',
        email: 'test@test.com',
        username: 'testuser',
        profile: { displayName: 'Test User' },
      };

      const notification = {
        id: '1',
        userId: '1',
        type: 'POST_LIKE',
        title: 'Test Title',
        message: 'Test Content',
        isRead: false,
        emailSent: false,
        createdAt: new Date(),
      } as any;

      await service.sendNotificationEmail(user as any, notification);

      const sentHtml = mockTransporter.sendMail.mock.calls[0][0].html;

      // Check for essential HTML structure
      expect(sentHtml).toContain('<!DOCTYPE html>');
      expect(sentHtml).toContain('<html');
      expect(sentHtml).toContain('</html>');
      expect(sentHtml).toContain(notification.title);
      expect(sentHtml).toContain(notification.message);
      expect(sentHtml).toContain('Innogram');
    });

    it('should include notification link', async () => {
      const user = {
        id: '1',
        email: 'test@test.com',
        username: 'testuser',
        profile: { displayName: 'Test User' },
      };

      const notification = {
        id: '1',
        userId: '1',
        type: 'POST_LIKE',
        title: 'Test',
        message: 'Test message',
        isRead: false,
        emailSent: false,
        createdAt: new Date(),
      } as any;

      await service.sendNotificationEmail(user as any, notification);

      const sentHtml = mockTransporter.sendMail.mock.calls[0][0].html;

      // Should contain link to notifications page
      expect(sentHtml).toContain('/notifications');
      expect(sentHtml).toContain('View Notification');
    });
  });
});
