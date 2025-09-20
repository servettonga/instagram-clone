import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { ERROR_MESSAGES } from '../src/common/constants/messages';

describe('Users (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Add the same validation pipe as the main app
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
  });

  beforeEach(async () => {
    // Clean up database before each test
    await prismaService.user.deleteMany({});
  });

  describe('POST /users', () => {
    const createUserDto = {
      email: 'test@example.com',
      username: 'testuser',
      displayName: 'Test User',
      bio: 'Test bio',
    };

    it('should create a user successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/users')
        .send(createUserDto)
        .expect(201);

      expect(response.body).toMatchObject({
        id: expect.any(Number),
        email: createUserDto.email,
        username: createUserDto.username,
        displayName: createUserDto.displayName,
        bio: createUserDto.bio,
        avatarUrl: null,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });

      // Verify user was created in database
      const userInDb = await prismaService.user.findUnique({
        where: { email: createUserDto.email },
      });
      expect(userInDb).toBeTruthy();
      expect(userInDb?.email).toBe(createUserDto.email);
    });

    it('should return 409 when email already exists', async () => {
      // Create user first
      await prismaService.user.create({
        data: createUserDto,
      });

      // Try to create user with same email
      const response = await request(app.getHttpServer())
        .post('/users')
        .send({
          ...createUserDto,
          username: 'differentusername',
        })
        .expect(409);

      expect(response.body.message).toBe(
        ERROR_MESSAGES.EMAIL_OR_USERNAME_EXISTS,
      );
    });

    it('should return 409 when username already exists', async () => {
      // Create user first
      await prismaService.user.create({
        data: createUserDto,
      });

      // Try to create user with same username
      const response = await request(app.getHttpServer())
        .post('/users')
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
        .post('/users')
        .send({
          ...createUserDto,
          email: 'invalid-email',
        })
        .expect(400);

      expect(response.body.message).toContain('email must be an email');
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/users')
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
        .post('/users')
        .send({
          ...createUserDto,
          username: 'a'.repeat(21), // Max length is 20
        })
        .expect(400);

      expect(response.body.message).toContain(ERROR_MESSAGES.USERNAME_TOO_LONG);
    });

    it('should create user with only required fields', async () => {
      const minimalUser = {
        email: 'minimal@example.com',
        username: 'minimal',
      };

      const response = await request(app.getHttpServer())
        .post('/users')
        .send(minimalUser)
        .expect(201);

      expect(response.body).toMatchObject({
        email: minimalUser.email,
        username: minimalUser.username,
        displayName: null,
        bio: null,
        avatarUrl: null,
      });
    });
  });

  describe('GET /users/:id', () => {
    let userId: number;

    beforeEach(async () => {
      const user = await prismaService.user.create({
        data: {
          email: 'getuser@example.com',
          username: 'getuser',
          displayName: 'Get User',
          bio: 'User for get tests',
        },
      });
      userId = user.id;
    });

    it('should return user by id', async () => {
      const response = await request(app.getHttpServer())
        .get(`/users/${userId}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: userId,
        email: 'getuser@example.com',
        username: 'getuser',
        displayName: 'Get User',
        bio: 'User for get tests',
      });
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app.getHttpServer())
        .get('/users/999999')
        .expect(404);

      expect(response.body.message).toBe(ERROR_MESSAGES.USER_NOT_FOUND(999999));
    });

    it('should return 400 for invalid id format', async () => {
      await request(app.getHttpServer()).get('/users/invalid-id').expect(400);
    });
  });

  describe('PATCH /users/:id', () => {
    let userId: number;

    beforeEach(async () => {
      const user = await prismaService.user.create({
        data: {
          email: 'updateuser@example.com',
          username: 'updateuser',
          displayName: 'Update User',
          bio: 'User for update tests',
        },
      });
      userId = user.id;
    });

    it('should update user successfully', async () => {
      const updateData = {
        displayName: 'Updated Name',
        bio: 'Updated bio',
      };

      const response = await request(app.getHttpServer())
        .patch(`/users/${userId}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toMatchObject({
        id: userId,
        displayName: updateData.displayName,
        bio: updateData.bio,
        email: 'updateuser@example.com', // Unchanged
        username: 'updateuser', // Unchanged
      });

      // Verify update in database
      const userInDb = await prismaService.user.findUnique({
        where: { id: userId },
      });
      expect(userInDb?.displayName).toBe(updateData.displayName);
      expect(userInDb?.bio).toBe(updateData.bio);
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app.getHttpServer())
        .patch('/users/999999')
        .send({ displayName: 'New Name' })
        .expect(404);

      expect(response.body.message).toBe(ERROR_MESSAGES.USER_NOT_FOUND(999999));
    });

    it('should return 409 when updating to existing email', async () => {
      // Create another user
      await prismaService.user.create({
        data: {
          email: 'existing@example.com',
          username: 'existing',
        },
      });

      const response = await request(app.getHttpServer())
        .patch(`/users/${userId}`)
        .send({ email: 'existing@example.com' })
        .expect(409);

      expect(response.body.message).toBe(
        ERROR_MESSAGES.EMAIL_OR_USERNAME_EXISTS,
      );
    });

    it('should allow partial updates', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/users/${userId}`)
        .send({ bio: 'Only bio updated' })
        .expect(200);

      expect(response.body.bio).toBe('Only bio updated');
      expect(response.body.displayName).toBe('Update User'); // Unchanged
    });
  });

  describe('DELETE /users/:id', () => {
    let userId: number;

    beforeEach(async () => {
      const user = await prismaService.user.create({
        data: {
          email: 'deleteuser@example.com',
          username: 'deleteuser',
          displayName: 'Delete User',
        },
      });
      userId = user.id;
    });

    it('should soft delete user successfully', async () => {
      await request(app.getHttpServer()).delete(`/users/${userId}`).expect(204);

      // Verify user is soft deleted (isBlocked = true)
      const userInDb = await prismaService.user.findUnique({
        where: { id: userId },
      });
      expect(userInDb?.isBlocked).toBe(true);

      // Verify user doesn't appear in findAll
      const response = await request(app.getHttpServer())
        .get('/users')
        .expect(200);

      const userIds = response.body.map((user: any) => user.id);
      expect(userIds).not.toContain(userId);
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app.getHttpServer())
        .delete('/users/999999')
        .expect(404);

      expect(response.body.message).toBe(ERROR_MESSAGES.USER_NOT_FOUND(999999));
    });
  });

  describe('PATCH /users/:id', () => {
    let userId: number;

    beforeEach(async () => {
      const user = await prismaService.user.create({
        data: {
          email: 'updateuser@example.com',
          username: 'updateuser',
          displayName: 'Update User',
          bio: 'User for update tests',
        },
      });
      userId = user.id;
    });

    it('should update user successfully', async () => {
      const updateData = {
        displayName: 'Updated Name',
        bio: 'Updated bio',
      };

      const response = await request(app.getHttpServer())
        .patch(`/users/${userId}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toMatchObject({
        id: userId,
        displayName: updateData.displayName,
        bio: updateData.bio,
        email: 'updateuser@example.com', // Unchanged
        username: 'updateuser', // Unchanged
      });

      // Verify update in database
      const userInDb = await prismaService.user.findUnique({
        where: { id: userId },
      });
      expect(userInDb?.displayName).toBe(updateData.displayName);
      expect(userInDb?.bio).toBe(updateData.bio);
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app.getHttpServer())
        .patch('/users/999999')
        .send({ displayName: 'New Name' })
        .expect(404);

      expect(response.body.message).toContain('User with ID 999999 not found');
    });

    it('should return 409 when updating to existing email', async () => {
      // Create another user
      await prismaService.user.create({
        data: {
          email: 'existing@example.com',
          username: 'existing',
        },
      });

      const response = await request(app.getHttpServer())
        .patch(`/users/${userId}`)
        .send({ email: 'existing@example.com' })
        .expect(409);

      expect(response.body.message).toContain(
        'Email or username already exists',
      );
    });

    it('should allow partial updates', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/users/${userId}`)
        .send({ bio: 'Only bio updated' })
        .expect(200);

      expect(response.body.bio).toBe('Only bio updated');
      expect(response.body.displayName).toBe('Update User'); // Unchanged
    });
  });

  describe('DELETE /users/:id', () => {
    let userId: number;

    beforeEach(async () => {
      const user = await prismaService.user.create({
        data: {
          email: 'deleteuser@example.com',
          username: 'deleteuser',
          displayName: 'Delete User',
        },
      });
      userId = user.id;
    });

    it('should soft delete user successfully', async () => {
      await request(app.getHttpServer()).delete(`/users/${userId}`).expect(204);

      // Verify user is soft deleted (isBlocked = true)
      const userInDb = await prismaService.user.findUnique({
        where: { id: userId },
      });
      expect(userInDb?.isBlocked).toBe(true);

      // Verify user doesn't appear in findAll
      const response = await request(app.getHttpServer())
        .get('/users')
        .expect(200);

      const userIds = response.body.map((user: any) => user.id);
      expect(userIds).not.toContain(userId);
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app.getHttpServer())
        .delete('/users/999999')
        .expect(404);

      expect(response.body.message).toContain('User with ID 999999 not found');
    });
  });
});
