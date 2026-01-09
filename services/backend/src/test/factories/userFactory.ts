import { faker } from '@faker-js/faker';
import jwt from 'jsonwebtoken';

export interface UserData {
  userId?: string;
  email?: string;
  role?: 'admin' | 'user' | 'operator';
  name?: string;
}

export const userDefaults = {
  userId: () => faker.string.uuid(),
  email: () => faker.internet.email(),
  role: () => faker.helpers.arrayElement(['admin', 'user', 'operator'] as const),
  name: () => faker.person.fullName(),
};

export function buildUser(overrides: UserData = {}): UserData {
  return {
    userId: overrides.userId || userDefaults.userId(),
    email: overrides.email || userDefaults.email(),
    role: overrides.role || userDefaults.role(),
    name: overrides.name || userDefaults.name(),
  };
}

export function generateToken(user?: UserData): string {
  const userData = user || buildUser();
  return jwt.sign(
    { 
      userId: userData.userId, 
      email: userData.email,
      role: userData.role 
    },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1h' }
  );
}

export function generateAdminToken(): string {
  return generateToken(buildUser({ role: 'admin' }));
}

export function generateUserToken(): string {
  return generateToken(buildUser({ role: 'user' }));
}

export function generateOperatorToken(): string {
  return generateToken(buildUser({ role: 'operator' }));
}
