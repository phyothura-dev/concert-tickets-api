import { OAuth2Client } from 'google-auth-library';
import AppDataSource from '../data-source';
import { User, type UserRole } from '../entities/User';
import { AuthenticationError, InternalError, ValidationError } from '../lib/errors';
import { signJwt } from '../lib/auth-jwt';
import type { GoogleSignInInput } from '../validations/auth.validation';

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

export class AuthService {
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
    let user = await repo.findOne({ where: { googleSub: payload.sub } });

    if (!user) {
      user = repo.create({
        googleSub: payload.sub,
        email: payload.email,
        role: resolveRole(payload.sub),
        name: payload.name ?? null,
        pictureUrl: payload.picture ?? null,
        emailVerified: payload.email_verified === true,
        lastLoginAt: now,
      });
    } else {
      user.email = payload.email;
      user.role = resolveRole(payload.sub, user.role);
      user.name = payload.name ?? null;
      user.pictureUrl = payload.picture ?? null;
      user.emailVerified = payload.email_verified === true;
      user.lastLoginAt = now;
    }

    const savedUser = await repo.save(user);
    return {
      user: savedUser,
      authToken: signJwt(savedUser.id, savedUser.email, savedUser.role),
    };
  }

  async getUserById(userId: string): Promise<User> {
    const user = await AppDataSource.getRepository(User).findOne({ where: { id: userId } });
    if (!user) {
      throw new AuthenticationError('Invalid JWT', null, 'INVALID_JWT');
    }
    return user;
  }
}
