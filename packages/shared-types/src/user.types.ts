// User-related types shared across all services

export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

// Base User from users table
export interface User {
  id: string;
  role: UserRole;
  disabled: boolean;
  createdAt: string;
  updatedAt: string;
}

// Profile from profiles table
export interface Profile {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  birthday: string;
  bio: string | null;
  avatarUrl: string | null;
  isPublic: boolean;
  deleted: boolean;
  createdAt: string;
  updatedAt: string;
}

// Combined type - what API returns
export interface UserWithProfile extends User {
  profile: Profile;
}

// Account from accounts table
export interface Account {
  id: string;
  userId: string;
  email: string;
  provider: 'LOCAL' | 'GOOGLE' | 'GITHUB';
  providerId: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// What auth endpoints actually return
export interface UserWithProfileAndAccount extends UserWithProfile {
  accounts?: Account[];
}
