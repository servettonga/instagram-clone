import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { User, Prisma } from '@prisma/client';
import { ERROR_MESSAGES } from '../common/constants/messages';

const userSelectPayload = {
  id: true,
  email: true,
  username: true,
  displayName: true,
  bio: true,
  avatarUrl: true,
  createdAt: true,
  updatedAt: true,
} as const;

export type SafeUser = Prisma.UserGetPayload<{
  select: typeof userSelectPayload;
}>;

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto): Promise<SafeUser> {
    try {
      const user = (await this.prisma.user.create({
        data: createUserDto,
        select: userSelectPayload,
      })) as SafeUser;

      return user;
    } catch (error: unknown) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(ERROR_MESSAGES.EMAIL_OR_USERNAME_EXISTS);
      }
      throw error;
    }
  }

  async findAll(): Promise<SafeUser[]> {
    const users = await this.prisma.user.findMany({
      where: { isBlocked: false },
      select: userSelectPayload,
    });
    return users;
  }

  async findOne(id: number): Promise<SafeUser> {
    const user = (await this.prisma.user.findUnique({
      where: { id },
      select: userSelectPayload,
    })) as SafeUser | null;

    if (!user) {
      throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND(id));
    }

    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { username },
    });
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<SafeUser> {
    try {
      const user = (await this.prisma.user.update({
        where: { id },
        data: updateUserDto,
        select: userSelectPayload,
      })) as SafeUser;

      return user;
    } catch (error: unknown) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND(id));
        }
        if (error.code === 'P2002') {
          throw new ConflictException(ERROR_MESSAGES.EMAIL_OR_USERNAME_EXISTS);
        }
      }
      throw error;
    }
  }

  async remove(id: number): Promise<void> {
    try {
      await this.prisma.user.update({
        where: { id },
        data: { isBlocked: true },
      });
    } catch (error: unknown) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND(id));
      }
      throw error;
    }
  }
}
