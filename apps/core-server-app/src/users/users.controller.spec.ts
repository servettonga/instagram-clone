import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UserWithProfileAndAccount, UserRole } from '@repo/shared-types';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AccessGuard } from '../auth/guards';
import { OwnershipGuard } from '../common/guards';

describe('UsersController', () => {
  let controller: UsersController;
  let service: UsersService;

  const mockUserWithProfileAndAccount: UserWithProfileAndAccount = {
    id: 'test-user-id',
    role: UserRole.USER,
    disabled: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    profile: {
      id: 'test-profile-id',
      userId: 'test-user-id',
      username: 'testuser',
      displayName: 'Test User',
      birthday: new Date('2000-01-01').toISOString(),
      bio: 'Test bio',
      avatarUrl: 'https://example.com/avatar.jpg',
      isPublic: true,
      deleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    accounts: [
      {
        id: 'test-account-id',
        userId: 'test-user-id',
        provider: 'LOCAL',
        providerId: null,
        email: 'test@example.com',
        lastLoginAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
  };

  const mockUsersService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    uploadAvatar: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    })
      .overrideGuard(AccessGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(OwnershipGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createUserDto: CreateUserDto = {
      email: 'test@example.com',
      username: 'testuser',
      displayName: 'Test User',
    };

    it('should create a user', async () => {
      mockUsersService.create.mockResolvedValue(mockUserWithProfileAndAccount);

      const result = await controller.create(createUserDto);

      expect(service.create).toHaveBeenCalledWith(createUserDto);
      expect(result).toEqual(mockUserWithProfileAndAccount);
    });

    it('should handle service errors', async () => {
      mockUsersService.create.mockRejectedValue(new ConflictException());

      await expect(controller.create(createUserDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('findAll', () => {
    it('should return an array of users', async () => {
      const mockUsers = [mockUserWithProfileAndAccount];
      mockUsersService.findAll.mockResolvedValue(mockUsers);

      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalled();
      expect(result).toEqual(mockUsers);
    });
  });

  describe('findOne', () => {
    it('should return a user', async () => {
      mockUsersService.findOne.mockResolvedValue(mockUserWithProfileAndAccount);

      const result = await controller.findOne('test-user-id');

      expect(service.findOne).toHaveBeenCalledWith('test-user-id');
      expect(result).toEqual(mockUserWithProfileAndAccount);
    });

    it('should handle not found errors', async () => {
      mockUsersService.findOne.mockRejectedValue(new NotFoundException());

      await expect(controller.findOne('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    const updateUserDto: UpdateUserDto = {
      displayName: 'Updated Name',
    };

    it('should update a user', async () => {
      const updatedUser = {
        ...mockUserWithProfileAndAccount,
        ...updateUserDto,
      };
      mockUsersService.update.mockResolvedValue(updatedUser);

      const result = await controller.update('test-user-id', updateUserDto);

      expect(service.update).toHaveBeenCalledWith(
        'test-user-id',
        updateUserDto,
      );
      expect(result).toEqual(updatedUser);
    });
  });

  describe('remove', () => {
    it('should remove a user', async () => {
      mockUsersService.remove.mockResolvedValue(undefined);

      const result = await controller.remove('test-user-id');

      expect(service.remove).toHaveBeenCalledWith('test-user-id');
      expect(result).toBeUndefined();
    });
  });
});
