import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { UsersService, SafeUser } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ERROR_MESSAGES } from '../common/constants/messages';

describe('UserService', () => {
  let service: UsersService;
  let prismaService: PrismaService;

  const mockUser: SafeUser = {
    id: 1,
    email: 'test@example.com',
    username: 'test_user',
    displayName: 'Test User',
    bio: 'Test bio',
    avatarUrl: 'https://example.com/avatar.jpg',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrismaService = {
    user: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
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
    };

    it('should create a user successfully', async () => {
      mockPrismaService.user.create.mockResolvedValue(mockUser);

      const result = await service.create(createUserDto);

      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: createUserDto,
        select: expect.any(Object),
      });
      expect(result).toEqual(mockUser);
    });

    it('should throw ConflictException when email or username already exists', async () => {
      const prismaError = new PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          clientVersion: '4.0.0',
        },
      );
      mockPrismaService.user.create.mockRejectedValue(prismaError);

      await expect(service.create(createUserDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.create(createUserDto)).rejects.toThrow(
        ERROR_MESSAGES.EMAIL_OR_USERNAME_EXISTS,
      );
    });

    it('should throw original error for other Prisma errors', async () => {
      const prismaError = new Error('Some other error');
      mockPrismaService.user.create.mockRejectedValue(prismaError);

      await expect(service.create(createUserDto)).rejects.toThrow(prismaError);
    });
  });

  describe('findAll', () => {
    it('should return an array of users', async () => {
      const mockUsers = [mockUser];
      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);

      const result = await service.findAll();

      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith({
        where: { isBlocked: false },
        select: expect.any(Object),
      });
      expect(result).toEqual(mockUsers);
    });

    it('should return empty array when no users found', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a user when found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findOne(1);

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        select: expect.any(Object),
      });
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(999)).rejects.toThrow(
        ERROR_MESSAGES.USER_NOT_FOUND(999),
      );
    });
  });

  describe('findByEmail', () => {
    it('should return a user when found', async () => {
      const fullUser = {
        ...mockUser,
        passwordHash: 'hashedpassword',
        isBlocked: false,
        role: 'USER',
      };
      mockPrismaService.user.findUnique.mockResolvedValue(fullUser);

      const result = await service.findByEmail('test@example.com');

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(result).toEqual(fullUser);
    });

    it('should return null when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('findByUsername', () => {
    it('should return a user when found', async () => {
      const fullUser = {
        ...mockUser,
        passwordHash: 'hashedpassword',
        isBlocked: false,
        role: 'USER',
      };
      mockPrismaService.user.findUnique.mockResolvedValue(fullUser);

      const result = await service.findByUsername('testuser');

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { username: 'testuser' },
      });
      expect(result).toEqual(fullUser);
    });

    it('should return null when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.findByUsername('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    const updateUserDto: UpdateUserDto = {
      displayName: 'Updated Name',
      bio: 'Updated bio',
    };

    it('should update a user successfully', async () => {
      const updatedUser = { ...mockUser, ...updateUserDto };
      mockPrismaService.user.update.mockResolvedValue(updatedUser);

      const result = await service.update(1, updateUserDto);

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: updateUserDto,
        select: expect.any(Object),
      });
      expect(result).toEqual(updatedUser);
    });

    it('should throw NotFoundException when user not found', async () => {
      const prismaError = new PrismaClientKnownRequestError(
        'Record not found',
        {
          code: 'P2025',
          clientVersion: '4.0.0',
        },
      );
      mockPrismaService.user.update.mockRejectedValue(prismaError);

      await expect(service.update(999, updateUserDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.update(999, updateUserDto)).rejects.toThrow(
        'User with ID 999 not found',
      );
    });

    it('should throw ConflictException when unique constraint fails', async () => {
      const prismaError = new PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          clientVersion: '4.0.0',
        },
      );
      mockPrismaService.user.update.mockRejectedValue(prismaError);

      await expect(
        service.update(1, { email: 'existing@example.com' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('should soft delete a user successfully', async () => {
      mockPrismaService.user.update.mockResolvedValue(mockUser);

      await service.remove(1);

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { isBlocked: true },
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      const prismaError = new PrismaClientKnownRequestError(
        'Record not found',
        {
          code: 'P2025',
          clientVersion: '4.0.0',
        },
      );
      mockPrismaService.user.update.mockRejectedValue(prismaError);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
      await expect(service.remove(999)).rejects.toThrow(
        ERROR_MESSAGES.USER_NOT_FOUND(999),
      );
    });
  });
});
