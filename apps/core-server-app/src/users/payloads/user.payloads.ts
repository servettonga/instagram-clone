import { Prisma } from '@prisma/client';
import type {
  UserWithProfileAndAccount,
  Account,
  UserRole,
} from '@repo/shared-types';

/**
 * Select payload for User entity
 * Defines which fields to return from User queries
 */
export const userSelectPayload = {
  id: true,
  createdAt: true,
  updatedAt: true,
  role: true,
  disabled: true,
  createdBy: true,
  updatedBy: true,
} as const;

/**
 * Select payload for Profile entity
 * Defines which fields to return from Profile queries
 */
export const profileSelectPayload = {
  id: true,
  username: true,
  displayName: true,
  birthday: true,
  bio: true,
  avatarUrl: true,
  isPublic: true,
  deleted: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
} as const;

/**
 * Select payload for Account entity
 * Defines which fields to return from Account queries
 * Excludes sensitive fields like password hash
 */
export const accountSelectPayload = {
  id: true,
  email: true,
  provider: true,
  providerId: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

/**
 * Type-safe User entity based on select payload
 */
export type SafeUser = Prisma.UserGetPayload<{
  select: typeof userSelectPayload;
}>;

/**
 * Type-safe Profile entity based on select payload
 */
export type SafeProfile = Prisma.ProfileGetPayload<{
  select: typeof profileSelectPayload;
}>;

/**
 * Type-safe Account entity based on select payload
 */
export type SafeAccount = Prisma.AccountGetPayload<{
  select: typeof accountSelectPayload;
}>;

/**
 * Prisma select payload matching shared types structure
 */
export const userWithProfileAndAccountSelect = {
  id: true,
  role: true,
  disabled: true,
  createdAt: true,
  updatedAt: true,
  profile: {
    select: {
      id: true,
      userId: true,
      username: true,
      displayName: true,
      birthday: true,
      bio: true,
      avatarUrl: true,
      isPublic: true,
      deleted: true,
      createdAt: true,
      updatedAt: true,
    },
  },
  accounts: {
    select: {
      id: true,
      userId: true,
      email: true,
      provider: true,
      providerId: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
    },
  },
} as const satisfies Prisma.UserSelect;

/**
 * Type for what Prisma actually returns
 */
export type PrismaUserWithProfileAndAccount = Prisma.UserGetPayload<{
  select: typeof userWithProfileAndAccountSelect;
}>;

/**
 * Transform Prisma result to API response format
 * Only converts Date objects to ISO strings and casts enums
 */
export function toUserWithProfileAndAccount(
  prismaUser: PrismaUserWithProfileAndAccount,
): UserWithProfileAndAccount {
  if (!prismaUser.profile) {
    throw new Error('User profile is required');
  }

  return {
    id: prismaUser.id,
    role: prismaUser.role as UserRole,
    disabled: prismaUser.disabled,
    createdAt: prismaUser.createdAt.toISOString(),
    updatedAt: prismaUser.updatedAt.toISOString(),
    profile: {
      id: prismaUser.profile.id,
      userId: prismaUser.profile.userId,
      username: prismaUser.profile.username,
      displayName: prismaUser.profile.displayName,
      birthday: prismaUser.profile.birthday.toISOString(),
      bio: prismaUser.profile.bio,
      avatarUrl: prismaUser.profile.avatarUrl,
      isPublic: prismaUser.profile.isPublic,
      deleted: prismaUser.profile.deleted,
      createdAt: prismaUser.profile.createdAt.toISOString(),
      updatedAt: prismaUser.profile.updatedAt.toISOString(),
    },
    accounts: prismaUser.accounts.map((account) => ({
      id: account.id,
      userId: account.userId,
      email: account.email,
      provider: account.provider as Account['provider'],
      providerId: account.providerId,
      lastLoginAt: account.lastLoginAt?.toISOString() ?? null,
      createdAt: account.createdAt.toISOString(),
      updatedAt: account.updatedAt.toISOString(),
    })),
  };
}
