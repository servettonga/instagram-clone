import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { FileUploadService } from '../common/services/file-upload.service';
import { ImageProcessingService } from '../common/services/image-processing.service';
import { NotificationProducerService } from '../notifications/services/notification-producer.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ERROR_MESSAGES } from '../common/constants/messages';
import { AccountProvider } from '@prisma/client';
import { UserWithProfileAndAccount } from '@repo/shared-types';

describe('UsersService', () => {
  let service: UsersService;
  let prismaService: PrismaService;

  const mockUser = {
    id: 'test-user-id',
    role: 'USER' as const,
    disabled: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: null,
    updatedBy: null,
  };

  const mockProfile = {
    id: 'test-profile-id',
    userId: 'test-user-id',
    username: 'testuser',
    displayName: 'Test User',
    birthday: new Date('2000-01-01'),
    bio: 'Test bio',
    avatarUrl: 'https://example.com/avatar.jpg',
    isPublic: true,
    deleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAccount = {
    id: 'test-account-id',
    email: 'test@example.com',
    provider: AccountProvider.LOCAL,
    passwordHash: '$2b$06$hashedpassword', // ← Add password hash
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUserWithProfileAndAccount = {
    ...mockUser,
    username: mockProfile.username,
    displayName: mockProfile.displayName,
    birthday: mockProfile.birthday,
    bio: mockProfile.bio,
    avatarUrl: mockProfile.avatarUrl,
    isPublic: mockProfile.isPublic,
    deleted: mockProfile.deleted,
    email: mockAccount.email,
    primaryAccountId: mockAccount.id,
    profileId: mockProfile.id,
  } as any;

  const mockPrismaService = {
    user: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    account: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      updateMany: jest.fn(),
      findMany: jest.fn(),
    },
    profile: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockFileUploadService = {
    saveFile: jest.fn(),
    deleteFile: jest.fn(),
    getFilePath: jest.fn(),
    getFileUrl: jest.fn(),
  };

  const mockImageProcessingService = {
    processAvatar: jest.fn(),
    processPostImage: jest.fn(),
    deleteImages: jest.fn(),
    getImageUrl: jest.fn(),
  };

  const mockNotificationProducerService = {
    sendNotification: jest.fn(),
  };

  const mockNotificationsService = {
    createDefaultPreferences: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: FileUploadService,
          useValue: mockFileUploadService,
        },
        {
          provide: ImageProcessingService,
          useValue: mockImageProcessingService,
        },
        {
          provide: NotificationProducerService,
          useValue: mockNotificationProducerService,
        },
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createUserDto: CreateUserDto = {
      email: 'test@example.com',
      username: 'testuser',
      displayName: 'Test User',
      bio: 'Test bio',
      password: 'SecurePass123!', // ← Add password
    };

    it('should create a user successfully', async () => {
      // Mock the transaction to return user, account, and profile
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          user: { create: jest.fn().mockResolvedValue(mockUser) },
          account: {
            create: jest.fn().mockResolvedValue(mockAccount),
            findFirst: jest.fn().mockResolvedValue(null), // No existing account
          },
          profile: { create: jest.fn().mockResolvedValue(mockProfile) },
        };
        const txResult = await callback(tx);
        return txResult;
      });

      const result = await service.create(createUserDto);

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
      expect(result).toMatchObject({
        id: mockUser.id,
      });
      expect(result.profile).toMatchObject({
        username: createUserDto.username,
        displayName: createUserDto.displayName,
        bio: createUserDto.bio,
      });
      expect(result.accounts?.[0]).toMatchObject({
        email: createUserDto.email,
      });
    });

    it('should throw ConflictException when email or username already exists', async () => {
      const prismaError = new PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          clientVersion: '4.0.0',
        },
      );
      mockPrismaService.$transaction.mockRejectedValue(prismaError);

      await expect(service.create(createUserDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.create(createUserDto)).rejects.toThrow(
        ERROR_MESSAGES.EMAIL_OR_USERNAME_EXISTS,
      );
    });
  });

  describe('findAll', () => {
    it('should return an array of users', async () => {
      const mockUsersWithRelations = [
        {
          ...mockUser,
          profile: mockProfile,
          accounts: [mockAccount],
        },
      ];
      mockPrismaService.user.findMany.mockResolvedValue(mockUsersWithRelations);

      const result = await service.findAll();

      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith({
        where: { disabled: false },
        select: expect.objectContaining({
          profile: expect.any(Object),
          accounts: expect.any(Object),
        }),
      });
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: mockUser.id,
      });
      expect(result[0]!.profile).toMatchObject({
        username: mockProfile.username,
      });
      expect(result[0]!.accounts?.[0]).toMatchObject({
        email: mockAccount.email,
      });
    });

    it('should return empty array when no users found', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a user when found', async () => {
      const mockUserWithRelations = {
        ...mockUser,
        profile: mockProfile,
        accounts: [mockAccount],
      };
      mockPrismaService.user.findUnique.mockResolvedValue(
        mockUserWithRelations,
      );

      const result = await service.findOne('test-user-id');

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'test-user-id' },
        select: expect.objectContaining({
          profile: expect.any(Object),
          accounts: expect.any(Object),
        }),
      });
      expect(result).toMatchObject({
        id: mockUser.id,
      });
      expect(result.profile).toMatchObject({
        username: mockProfile.username,
      });
      expect(result.accounts?.[0]).toMatchObject({
        email: mockAccount.email,
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        ERROR_MESSAGES.USER_NOT_FOUND('non-existent-id'),
      );
    });
  });

  describe('findByEmail', () => {
    it('should return a user when found', async () => {
      const mockAccountWithRelations = {
        ...mockAccount,
        user: {
          ...mockUser,
          profile: mockProfile,
          accounts: [mockAccount],
        },
      };
      mockPrismaService.account.findFirst.mockResolvedValue(
        mockAccountWithRelations,
      );

      const result = await service.findByEmail('test@example.com');

      expect(mockPrismaService.account.findFirst).toHaveBeenCalledWith({
        where: {
          email: 'test@example.com',
          provider: AccountProvider.LOCAL,
        },
        select: expect.objectContaining({
          user: expect.any(Object),
        }),
      });
      expect(result).toMatchObject({
        id: mockUser.id,
      });
      expect(result!.profile).toMatchObject({
        username: mockProfile.username,
      });
      expect(result!.accounts?.[0]).toMatchObject({
        email: mockAccount.email,
      });
    });

    it('should return null when user not found', async () => {
      mockPrismaService.account.findFirst.mockResolvedValue(null);

      const result = await service.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    const updateUserDto: UpdateUserDto = {
      displayName: 'Updated Name',
      bio: 'Updated bio',
    };

    it('should update a user successfully', async () => {
      mockPrismaService.profile.findFirst.mockResolvedValue(mockProfile);
      mockPrismaService.profile.update.mockResolvedValue({
        ...mockProfile,
        ...updateUserDto,
      });

      // Mock the findOne call at the end
      const mockUserWithRelations = {
        ...mockUser,
        profile: { ...mockProfile, ...updateUserDto },
        accounts: [mockAccount],
      };
      mockPrismaService.user.findUnique.mockResolvedValue(
        mockUserWithRelations,
      );

      const result = await service.update('test-user-id', updateUserDto);

      expect(mockPrismaService.profile.update).toHaveBeenCalledWith({
        where: { id: mockProfile.id },
        data: expect.objectContaining({
          displayName: updateUserDto.displayName,
          bio: updateUserDto.bio,
          updatedBy: 'test-user-id',
        }),
      });
      expect(result).toMatchObject({
        id: mockUser.id,
      });
      expect(result.profile).toMatchObject({
        displayName: updateUserDto.displayName,
        bio: updateUserDto.bio,
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrismaService.profile.findFirst.mockResolvedValue(null);

      await expect(
        service.update('non-existent-id', updateUserDto),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.update('non-existent-id', updateUserDto),
      ).rejects.toThrow(ERROR_MESSAGES.USER_NOT_FOUND('non-existent-id'));
    });
  });

  describe('remove', () => {
    it('should soft delete a user successfully', async () => {
      // Mock the update operations to return objects
      mockPrismaService.user.update.mockReturnValue({
        id: 'test-user-id',
        disabled: true,
      });
      mockPrismaService.profile.updateMany.mockReturnValue({ count: 1 });

      // Mock the transaction to just return the operations array
      mockPrismaService.$transaction.mockImplementation((ops) =>
        Promise.resolve(ops),
      );

      await service.remove('test-user-id');

      expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);
      expect(mockPrismaService.$transaction).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.any(Object), // User update operation
          expect.any(Object), // Profile update operation
        ]),
      );
    });

    it('should throw NotFoundException when user not found', async () => {
      const prismaError = new PrismaClientKnownRequestError(
        'Record not found',
        {
          code: 'P2025',
          clientVersion: '4.0.0',
        },
      );
      mockPrismaService.$transaction.mockRejectedValue(prismaError);

      await expect(service.remove('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.remove('non-existent-id')).rejects.toThrow(
        ERROR_MESSAGES.USER_NOT_FOUND('non-existent-id'),
      );
    });
  });
});
