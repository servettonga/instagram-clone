import { Prisma } from '@prisma/client';

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
 * Combined user type that includes flattened profile and account data
 * This is the main type returned by the users service
 */
export type UserWithProfileAndAccount = SafeUser &
  Omit<SafeProfile, 'id' | 'userId'> & {
    email: string;
    primaryAccountId: string;
    profileId: string;
  };
