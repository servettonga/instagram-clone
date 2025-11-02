import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';
import { of, throwError } from 'rxjs';
import { AxiosError, AxiosResponse } from 'axios';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { LoginCredentials } from '@repo/shared-types';

describe('AuthService', () => {
  let service: AuthService;
  let httpService: HttpService;
  let usersService: UsersService;
  let prismaService: PrismaService;

  const mockHttpService = {
    post: jest.fn(),
    get: jest.fn(),
  };

  const mockUsersService = {
    create: jest.fn(),
    findOne: jest.fn(),
    findByEmail: jest.fn(),
    findByUsername: jest.fn(),
  };

  const mockPrismaService = {
    account: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    httpService = module.get<HttpService>(HttpService);
    usersService = module.get<UsersService>(UsersService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handleSignUp', () => {
    it('should forward signup request to Auth Service', async () => {
      const signUpDto = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'password123',
      };

      const mockResponse: AxiosResponse = {
        data: {
          user: { id: 'user-id', email: 'test@example.com' },
          tokens: { accessToken: 'token', refreshToken: 'refreshToken' },
        },
        status: 201,
        statusText: 'Created',
        headers: {},
        config: {} as any,
      };

      mockHttpService.post.mockReturnValue(of(mockResponse));

      const result = await service.handleSignUp(signUpDto);

      expect(httpService.post).toHaveBeenCalledWith(
        expect.stringContaining('/internal/auth/register'),
        signUpDto,
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should throw BadRequestException on error', async () => {
      const signUpDto = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'password123',
      };

      const mockError: Partial<AxiosError> = {
        response: {
          data: { error: 'Registration failed' },
          status: 400,
          statusText: 'Bad Request',
          headers: {},
          config: {} as any,
        },
        isAxiosError: true,
      };

      mockHttpService.post.mockReturnValue(
        throwError(() => mockError as AxiosError),
      );

      await expect(service.handleSignUp(signUpDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('handleLogin', () => {
    it('should forward login request to Auth Service', async () => {
      const credentials: LoginCredentials = {
        identifier: 'test@example.com',
        password: 'password123',
      };

      const mockResponse: AxiosResponse = {
        data: {
          user: { id: 'user-id', email: 'test@example.com' },
          tokens: { accessToken: 'token', refreshToken: 'refreshToken' },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockHttpService.post.mockReturnValue(of(mockResponse));

      const result = await service.handleLogin(credentials);

      expect(httpService.post).toHaveBeenCalledWith(
        expect.stringContaining('/internal/auth/login'),
        credentials,
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should throw UnauthorizedException on invalid credentials', async () => {
      const credentials = { identifier: 'test@example.com', password: 'wrong' };

      const mockError: Partial<AxiosError> = {
        response: {
          data: { error: 'Invalid credentials' },
          status: 401,
          statusText: 'Unauthorized',
          headers: {},
          config: {} as any,
        },
        isAxiosError: true,
      };

      mockHttpService.post.mockReturnValue(
        throwError(() => mockError as AxiosError),
      );

      await expect(service.handleLogin(credentials)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('validateToken', () => {
    it('should validate token via Auth Service', async () => {
      const accessToken = 'valid-token';

      const mockResponse: AxiosResponse = {
        data: {
          valid: true,
          user: { id: 'user-id', email: 'test@example.com' },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockHttpService.post.mockReturnValue(of(mockResponse));

      const result = await service.validateToken(accessToken);

      expect(httpService.post).toHaveBeenCalledWith(
        expect.stringContaining('/internal/auth/validate'),
        { accessToken },
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should throw UnauthorizedException on invalid token', async () => {
      const accessToken = 'invalid-token';

      mockHttpService.post.mockReturnValue(
        throwError(() => new Error('Invalid token')),
      );

      await expect(service.validateToken(accessToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
