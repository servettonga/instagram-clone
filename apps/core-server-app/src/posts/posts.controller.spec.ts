import { Test, TestingModule } from '@nestjs/testing';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';
import { AssetManagementService } from '../common/services/asset-management.service';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { AuthService } from '../auth/auth.service';

describe('PostsController', () => {
  let controller: PostsController;

  const mockPostsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    likePost: jest.fn(),
    unlikePost: jest.fn(),
    searchPosts: jest.fn(),
  };

  const mockAssetManagementService = {
    createAsset: jest.fn(),
    getAssetUrl: jest.fn(),
    validateAssets: jest.fn(),
    deleteAsset: jest.fn(),
  };

  const mockAuthService = {
    validateUser: jest.fn(),
    verifyAccessToken: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
    decode: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PostsController],
      providers: [
        {
          provide: PostsService,
          useValue: mockPostsService,
        },
        {
          provide: AssetManagementService,
          useValue: mockAssetManagementService,
        },
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        Reflector,
      ],
    }).compile();

    controller = module.get<PostsController>(PostsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
