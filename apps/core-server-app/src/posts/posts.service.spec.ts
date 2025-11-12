import { Test, TestingModule } from '@nestjs/testing';
import { PostsService } from './posts.service';
import { PrismaService } from '../prisma/prisma.service';
import { AssetManagementService } from '../common/services/asset-management.service';
import { ImageProcessingService } from '../common/services/image-processing.service';
import { NotificationProducerService } from '../notifications/services/notification-producer.service';

describe('PostsService', () => {
  let service: PostsService;

  const mockPrismaService = {
    post: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    postLike: {
      create: jest.fn(),
      delete: jest.fn(),
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockAssetManagementService = {
    validateAssets: jest.fn(),
    deleteAsset: jest.fn(),
    createAsset: jest.fn(),
    getAssetUrl: jest.fn(),
  };

  const mockImageProcessingService = {
    processPostImage: jest.fn(),
    processAvatar: jest.fn(),
    deleteImages: jest.fn(),
    getImageUrl: jest.fn(),
  };

  const mockNotificationProducerService = {
    sendNotification: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: AssetManagementService,
          useValue: mockAssetManagementService,
        },
        {
          provide: ImageProcessingService,
          useValue: mockImageProcessingService,
        },
        {
          provide: NotificationProducerService,
          useValue: mockNotificationProducerService,
        },
      ],
    }).compile();

    service = module.get<PostsService>(PostsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
