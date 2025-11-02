import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  ExecutionContext,
} from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { ERROR_MESSAGES } from '../src/common/constants/messages';
import { TestDatabase } from './helpers/test-database.helper';
import { AccessGuard } from '../src/auth/guards';
import { OwnershipGuard } from '../src/common/guards';

// Store current user for guard mock
let currentUserId: string | null = null;

describe('Users (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let testDb: TestDatabase;

  beforeAll(async () => {
    // Create isolated test database
    testDb = new TestDatabase('users');
    await testDb.setup();

    // IMPORTANT: Set DATABASE_URL BEFORE creating the module
    process.env.DATABASE_URL = testDb.databaseUrl;

    // Create test module with isolated database and override guards
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(AccessGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          if (currentUserId) {
            const request = context.switchToHttp().getRequest();
            request.user = { id: currentUserId };
          }
          return true;
        },
      })
      .overrideGuard(OwnershipGuard)
      .useValue({
        canActivate: () => true, // Allow all ownership checks in tests
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        disableErrorMessages: false,
      }),
    );

    prismaService = moduleFixture.get<PrismaService>(PrismaService);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await testDb.teardown();
  });

  beforeEach(async () => {
    // Fast cleanup using truncate instead of deleteMany
    await testDb.truncateAll();
  });

  describe('POST /api/users', () => {
    const createUserDto = {
      email: 'test@example.com',
      username: 'testuser',
      displayName: 'Test User',
      bio: 'Test bio',
      password: 'Test123!',
    };

    it('should create a user successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/users')
        .send(createUserDto)
        .expect(201);

      // Response now has nested profile and accounts structure
      expect(response.body).toMatchObject({
        id: expect.any(String),
        role: 'USER',
        disabled: false,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
        profile: {
          id: expect.any(String),
          username: createUserDto.username,
          displayName: createUserDto.displayName,
          bio: createUserDto.bio,
          avatarUrl: null,
          isPublic: true,
          deleted: false,
        },
        accounts: expect.arrayContaining([
          expect.objectContaining({
            email: createUserDto.email,
            provider: 'LOCAL',
          }),
        ]),
      });

      const userInDb = await prismaService.user.findUnique({
        where: { id: response.body.id },
        include: { profile: true, accounts: true },
      });
      expect(userInDb).toBeTruthy();
      expect(userInDb?.profile?.username).toBe(createUserDto.username);
      expect(userInDb?.accounts[0]?.email).toBe(createUserDto.email);
    });

    it('should allow same email with different username (different users)', async () => {
      // First user
      await request(app.getHttpServer())
        .post('/api/users')
        .send(createUserDto)
        .expect(201);

      // Second user with same email but different username should succeed
      const response = await request(app.getHttpServer())
        .post('/api/users')
        .send({
          ...createUserDto,
          username: 'differentusername',
        })
        .expect(201);

      expect(response.body.profile.username).toBe('differentusername');
      expect(response.body.accounts[0].email).toBe(createUserDto.email);
    });

    it('should return 409 when username already exists', async () => {
      await request(app.getHttpServer())
        .post('/api/users')
        .send(createUserDto)
        .expect(201);

      const response = await request(app.getHttpServer())
        .post('/api/users')
        .send({
          ...createUserDto,
          email: 'different@example.com',
        })
        .expect(409);

      expect(response.body.message).toBe(
        ERROR_MESSAGES.EMAIL_OR_USERNAME_EXISTS,
      );
    });

    it('should return 400 for invalid email', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/users')
        .send({
          ...createUserDto,
          email: 'invalid-email',
        })
        .expect(400);

      expect(response.body.message).toContain('email must be an email');
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/users')
        .send({
          displayName: 'Test User',
        })
        .expect(400);

      expect(response.body.message).toEqual(
        expect.arrayContaining([
          'email should not be empty',
          'email must be an email',
          'username should not be empty',
          'username must be a string',
        ]),
      );
    });

    it('should return 400 for username too long', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/users')
        .send({
          ...createUserDto,
          username: 'a'.repeat(51),
        })
        .expect(400);

      expect(response.body.message).toContain(
        'username must be shorter than or equal to 50 characters',
      );
    });

    it('should create user with only required fields and default displayName', async () => {
      const minimalUser = {
        email: 'minimal@example.com',
        username: 'minimal',
      };

      const response = await request(app.getHttpServer())
        .post('/api/users')
        .send(minimalUser)
        .expect(201);

      expect(response.body.profile).toMatchObject({
        username: minimalUser.username,
        displayName: minimalUser.username,
        bio: null,
        avatarUrl: null,
      });
    });
  });

  describe('GET /api/users/:id', () => {
    let userId: string;

    beforeEach(async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/api/users')
        .send({
          email: 'getuser@example.com',
          username: 'getuser',
          displayName: 'Get User',
          bio: 'User for get tests',
        });
      userId = createResponse.body.id;
    });

    it('should return user by id', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/users/${userId}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: userId,
        role: 'USER',
        disabled: false,
        profile: {
          username: 'getuser',
          displayName: 'Get User',
          bio: 'User for get tests',
        },
        accounts: expect.arrayContaining([
          expect.objectContaining({
            email: 'getuser@example.com',
          }),
        ]),
      });
    });

    it('should return 404 for non-existent user', async () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440000';
      const response = await request(app.getHttpServer())
        .get(`/api/users/${fakeId}`)
        .expect(404);

      expect(response.body.message).toBe(ERROR_MESSAGES.USER_NOT_FOUND(fakeId));
    });

    it('should return 400 for invalid id format', async () => {
      await request(app.getHttpServer())
        .get('/api/users/invalid-id')
        .expect(400);
    });
  });

  describe('PATCH /api/users/:id', () => {
    let userId: string;

    beforeEach(async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/api/users')
        .send({
          email: 'updateuser@example.com',
          username: 'updateuser',
          displayName: 'Update User',
          bio: 'User for update tests',
        });
      userId = createResponse.body.id;
      currentUserId = userId; // Set for guard mock
    });

    it('should update user successfully', async () => {
      const updateData = {
        displayName: 'Updated Name',
        bio: 'Updated bio',
      };

      const response = await request(app.getHttpServer())
        .patch(`/api/users/${userId}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toMatchObject({
        id: userId,
        profile: {
          displayName: updateData.displayName,
          bio: updateData.bio,
          username: 'updateuser',
        },
      });

      const userInDb = await prismaService.user.findUnique({
        where: { id: userId },
        include: { profile: true },
      });
      expect(userInDb?.profile?.displayName).toBe(updateData.displayName);
      expect(userInDb?.profile?.bio).toBe(updateData.bio);
    });

    it('should return 404 for non-existent user', async () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440000';
      const response = await request(app.getHttpServer())
        .patch(`/api/users/${fakeId}`)
        .send({ displayName: 'New Name' })
        .expect(404);

      expect(response.body.message).toBe(ERROR_MESSAGES.USER_NOT_FOUND(fakeId));
    });

    it('should return 409 when updating to existing username', async () => {
      await request(app.getHttpServer()).post('/api/users').send({
        email: 'existing@example.com',
        username: 'existing',
      });

      const response = await request(app.getHttpServer())
        .patch(`/api/users/${userId}`)
        .send({ username: 'existing' })
        .expect(409);

      expect(response.body.message).toContain('already exists');
    });

    it('should allow partial updates', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/users/${userId}`)
        .send({ bio: 'Only bio updated' })
        .expect(200);

      expect(response.body.profile.bio).toBe('Only bio updated');
      expect(response.body.profile.displayName).toBe('Update User');
    });
  });

  describe('DELETE /api/users/:id', () => {
    let userId: string;

    beforeEach(async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/api/users')
        .send({
          email: 'deleteuser@example.com',
          username: 'deleteuser',
          displayName: 'Delete User',
        });
      userId = createResponse.body.id;
      currentUserId = userId; // Set for guard mock
    });

    it('should soft delete user successfully', async () => {
      await request(app.getHttpServer())
        .delete(`/api/users/${userId}`)
        .expect(204);

      const userInDb = await prismaService.user.findUnique({
        where: { id: userId },
        include: { profile: true },
      });
      expect(userInDb?.disabled).toBe(true);
      expect(userInDb?.profile?.deleted).toBe(true);

      const response = await request(app.getHttpServer())
        .get('/api/users')
        .expect(200);

      const userIds = response.body.map((user: any) => user.id);
      expect(userIds).not.toContain(userId);
    });

    it('should return 404 for non-existent user', async () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440000';
      const response = await request(app.getHttpServer())
        .delete(`/api/users/${fakeId}`)
        .expect(404);

      expect(response.body.message).toBe(ERROR_MESSAGES.USER_NOT_FOUND(fakeId));
    });
  });

  describe('GET /api/users', () => {
    it('should return array of users', async () => {
      await request(app.getHttpServer()).post('/api/users').send({
        email: 'user1@example.com',
        username: 'user1',
      });

      await request(app.getHttpServer()).post('/api/users').send({
        email: 'user2@example.com',
        username: 'user2',
      });

      const response = await request(app.getHttpServer())
        .get('/api/users')
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body[0]).toMatchObject({
        id: expect.any(String),
        role: 'USER',
        disabled: false,
        profile: {
          username: expect.any(String),
        },
        accounts: expect.arrayContaining([
          expect.objectContaining({
            email: expect.any(String),
          }),
        ]),
      });
    });

    it('should return empty array when no users exist', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users')
        .expect(200);

      expect(response.body).toEqual([]);
    });
  });
});
