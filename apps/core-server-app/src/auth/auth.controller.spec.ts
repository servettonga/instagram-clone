import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { BadRequestException } from '@nestjs/common';
import { Response } from 'express';

describe('AuthController', () => {
  let controller: AuthController;
  let service: AuthService;

  const mockAuthService = {
    handleSignUp: jest.fn(),
    handleLogin: jest.fn(),
    handleRefresh: jest.fn(),
    handleLogout: jest.fn(),
    handleOAuthInit: jest.fn(),
    handleOAuthCallback: jest.fn(),
    verifyCredentials: jest.fn(),
    findOrCreateOAuthUser: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('signup', () => {
    it('should call handleSignUp', async () => {
      const signUpDto = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'password123',
      };

      const mockResponse = {
        user: { id: 'user-id', email: 'test@example.com' },
        tokens: { accessToken: 'token', refreshToken: 'refreshToken' },
      };

      mockAuthService.handleSignUp.mockResolvedValue(mockResponse);

      const result = await controller.signup(signUpDto);

      expect(service.handleSignUp).toHaveBeenCalledWith(signUpDto);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('login', () => {
    it('should call handleLogin', async () => {
      const credentials = { email: 'test@example.com', password: 'password123' };

      const mockResponse = {
        user: { id: 'user-id', email: 'test@example.com' },
        tokens: { accessToken: 'token', refreshToken: 'refreshToken' },
      };

      mockAuthService.handleLogin.mockResolvedValue(mockResponse);

      const result = await controller.login(credentials);

      expect(service.handleLogin).toHaveBeenCalledWith(credentials);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('refresh', () => {
    it('should call handleRefresh', async () => {
      const body = { refreshToken: 'refresh-token' };

      const mockResponse = {
        tokens: { accessToken: 'new-token', refreshToken: 'new-refresh-token' },
      };

      mockAuthService.handleRefresh.mockResolvedValue(mockResponse);

      const result = await controller.refresh(body);

      expect(service.handleRefresh).toHaveBeenCalledWith(body.refreshToken);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('oauthLogin', () => {
    it('should redirect to OAuth provider', async () => {
      const provider = 'google';
      const authUrl = 'https://accounts.google.com/oauth/authorize';

      mockAuthService.handleOAuthInit.mockResolvedValue(authUrl);

      const mockResponse = {
        redirect: jest.fn(),
      } as unknown as Response;

      await controller.oauthLogin(provider, mockResponse);

      expect(service.handleOAuthInit).toHaveBeenCalledWith(provider, undefined);
      expect(mockResponse.redirect).toHaveBeenCalledWith(authUrl);
    });

    it('should throw BadRequestException if provider is missing', async () => {
      const mockResponse = {
        redirect: jest.fn(),
      } as unknown as Response;

      await expect(
        controller.oauthLogin('', mockResponse),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
