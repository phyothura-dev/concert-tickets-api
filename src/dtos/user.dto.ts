import type { User } from '../entities/User';

export type UserDto = {
  id: string;
  email: string;
  role: 'USER' | 'ADMIN';
  name: string | null;
  pictureUrl: string | null;
  emailVerified: boolean;
  lastLoginAt: string;
};

export function toUserDto(user: User): UserDto {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
    pictureUrl: user.pictureUrl,
    emailVerified: user.emailVerified,
    lastLoginAt: user.lastLoginAt.toISOString(),
  };
}
