import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { RabbitMQService } from './rabbitmq.service';
import * as amqp from 'amqp-connection-manager';

// Mock the config module
jest.mock('../config/app.config', () => ({
  getConfig: jest.fn(() => ({
    rabbitmqUrl: 'amqp://localhost:5672',
  })),
}));

// Mock amqp-connection-manager
jest.mock('amqp-connection-manager');

describe('RabbitMQService', () => {
  let service: RabbitMQService;
  let mockConnection: any;
  let mockChannelWrapper: any;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(async () => {
    // Setup mocks
    mockChannelWrapper = {
      addSetup: jest.fn().mockImplementation(() => Promise.resolve()),
      waitForConnect: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined),
      publish: jest.fn().mockResolvedValue(undefined),
    };

    mockConnection = {
      createChannel: jest.fn().mockReturnValue(mockChannelWrapper),
      close: jest.fn().mockResolvedValue(undefined),
      on: jest.fn(),
    };

    (amqp.connect as jest.Mock).mockReturnValue(mockConnection);

    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RabbitMQService,
        {
          provide: Logger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<RabbitMQService>(RabbitMQService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should connect on module init', async () => {
      await service.onModuleInit();

      expect(amqp.connect).toHaveBeenCalled();
      expect(mockConnection.createChannel).toHaveBeenCalled();
    });

    it('should setup connection event handlers', async () => {
      await service.onModuleInit();

      expect(mockConnection.on).toHaveBeenCalledWith(
        'connect',
        expect.any(Function),
      );
      expect(mockConnection.on).toHaveBeenCalledWith(
        'disconnect',
        expect.any(Function),
      );
    });
  });

  describe('publish', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should publish message to exchange', async () => {
      const exchange = 'test-exchange';
      const routingKey = 'test.route';
      const message = { type: 'POST_LIKE', userId: '1' };

      await service.publish(exchange, routingKey, message);

      expect(mockChannelWrapper.publish).toHaveBeenCalledWith(
        exchange,
        routingKey,
        message,
        { persistent: true },
      );
    });

    it('should handle publish errors', async () => {
      mockChannelWrapper.publish.mockRejectedValue(new Error('Publish failed'));

      const exchange = 'test-exchange';
      const routingKey = 'test.route';
      const message = { type: 'POST_LIKE', userId: '1' };

      await expect(
        service.publish(exchange, routingKey, message),
      ).rejects.toThrow('Publish failed');
    });
  });

  describe('consume', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should setup consumer for queue', async () => {
      const onMessage = jest.fn().mockResolvedValue(undefined);

      await service.consume('test-queue', onMessage);

      expect(mockChannelWrapper.waitForConnect).toHaveBeenCalled();
      expect(mockChannelWrapper.addSetup).toHaveBeenCalled();
    });
  });

  describe('onModuleDestroy', () => {
    it('should close connections on module destroy', async () => {
      await service.onModuleInit();
      await service.onModuleDestroy();

      expect(mockChannelWrapper.close).toHaveBeenCalled();
      expect(mockConnection.close).toHaveBeenCalled();
    });
  });
});
