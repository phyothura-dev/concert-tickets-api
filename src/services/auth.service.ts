import { OAuth2Client } from 'google-auth-library';
import AppDataSource from '../data-source';
import { User, type UserRole } from '../entities/User';
import { AuthenticationError, ConflictError, InternalError, ValidationError } from '../lib/errors';
import { signJwt } from '../lib/auth-jwt';
import { hashPassword, verifyPassword } from '../lib/password';
import type { GoogleSignInInput, LoginInput, RegisterInput } from '../validations/auth.validation';

export type AuthResult = {
  user: User;
  authToken: string;
};

const googleClient = new OAuth2Client();

function getGoogleClientId(): string {
  const clientId = process.env['GOOGLE_CLIENT_ID'];
  if (!clientId) {
    throw new InternalError('Google Sign-In is not configured', null, 'GOOGLE_AUTH_MISCONFIGURED');
  }
  return clientId;
}

function getAdminGoogleSubs(): Set<string> {
  const raw = process.env['ADMIN_GOOGLE_SUBS'] ?? '';
  return new Set(
    raw
      .split(',')
      .map((value) => value.trim())
      .filter((value) => value.length > 0),
  );
}

function resolveRole(googleSub: string, currentRole?: UserRole): UserRole {
  const adminSubs = getAdminGoogleSubs();
  if (adminSubs.has(googleSub)) {
    return 'ADMIN';
  }

  return currentRole ?? 'USER';
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export class AuthService {
  private toAuthResult(user: User): AuthResult {
    return {
      user,
      authToken: signJwt(user.id, user.email, user.role),
    };
  }

  private ensureActiveUser(user: User): void {
    if (user.status === 'DISABLED') {
      throw new AuthenticationError('Account is disabled', null, 'ACCOUNT_DISABLED');
    }
  }

  async register(input: RegisterInput): Promise<AuthResult> {
    const repo = AppDataSource.getRepository(User);
    const email = normalizeEmail(input.email);
    const existing = await repo.findOne({ where: { email } });
    if (existing) {
      throw new ConflictError('EMAIL_ALREADY_EXISTS', 'An account with this email already exists');
    }

    const now = new Date();
    const user = repo.create({
      googleSub: null,
      email,
      passwordHash: await hashPassword(input.password),
      role: 'USER',
      status: 'ACTIVE',
      name: input.name?.trim() ?? null,
      pictureUrl: null,
      emailVerified: false,
      lastLoginAt: now,
    });

    const savedUser = await repo.save(user);
    return this.toAuthResult(savedUser);
  }

  async login(input: LoginInput): Promise<AuthResult> {
    const repo = AppDataSource.getRepository(User);
    const user = await repo
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email: normalizeEmail(input.email) })
      .getOne();

    if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
      throw new AuthenticationError('Invalid email or password', null, 'INVALID_CREDENTIALS');
    }

    this.ensureActiveUser(user);
    user.lastLoginAt = new Date();
    const savedUser = await repo.save(user);
    return this.toAuthResult(savedUser);
  }

  async signInWithGoogle(input: GoogleSignInInput): Promise<AuthResult> {
    const clientId = getGoogleClientId();
    const ticket = await googleClient.verifyIdToken({
      idToken: input.idToken,
      audience: clientId,
    }).catch(() => {
      throw new AuthenticationError('Invalid Google identity token', null, 'INVALID_GOOGLE_TOKEN');
    });

    const payload = ticket.getPayload();
    if (!payload?.sub) {
      throw new AuthenticationError('Invalid Google identity token', null, 'INVALID_GOOGLE_TOKEN');
    }
    if (payload.aud !== clientId) {
      throw new AuthenticationError('Google token audience mismatch', null, 'GOOGLE_AUDIENCE_MISMATCH');
    }
    if (!payload.email) {
      throw new ValidationError('Google account email is required', null, 'GOOGLE_EMAIL_REQUIRED');
    }

    const repo = AppDataSource.getRepository(User);
    const now = new Date();
    const email = normalizeEmail(payload.email);
    let user = await repo.findOne({ where: { googleSub: payload.sub } });

    if (!user) {
      user = await repo.findOne({ where: { email } });
      if (!user) {
        user = repo.create({
          googleSub: payload.sub,
          email,
          role: resolveRole(payload.sub),
          status: 'ACTIVE',
          name: payload.name ?? null,
          pictureUrl: payload.picture ?? null,
          emailVerified: payload.email_verified === true,
          lastLoginAt: now,
        });
      } else {
        this.ensureActiveUser(user);
        user.googleSub = payload.sub;
        user.role = resolveRole(payload.sub, user.role);
        user.name = payload.name ?? user.name;
        user.pictureUrl = payload.picture ?? user.pictureUrl;
        user.emailVerified = payload.email_verified === true || user.emailVerified;
        user.lastLoginAt = now;
      }
    } else {
      this.ensureActiveUser(user);
      const emailOwner = await repo.findOne({ where: { email } });
      if (emailOwner && emailOwner.id !== user.id) {
        throw new ConflictError('EMAIL_ALREADY_EXISTS', 'An account with this email already exists');
      }
      user.email = email;
      user.role = resolveRole(payload.sub, user.role);
      user.name = payload.name ?? null;
      user.pictureUrl = payload.picture ?? null;
      user.emailVerified = payload.email_verified === true;
      user.lastLoginAt = now;
    }

    const savedUser = await repo.save(user);
    return this.toAuthResult(savedUser);
  }

  async getUserById(userId: string): Promise<User> {
    const user = await AppDataSource.getRepository(User).findOne({ where: { id: userId } });
    if (!user) {
      throw new AuthenticationError('Invalid JWT', null, 'INVALID_JWT');
    }
    this.ensureActiveUser(user);
    return user;
  }
}
