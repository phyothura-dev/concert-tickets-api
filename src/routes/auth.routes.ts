import { Router, type Request, type Response } from 'express';
import { asyncHandler } from '../middleware/async-handler';
import { requireAuthMiddleware } from '../middleware/auth.middleware';
import { authLimiter } from '../middleware/rate-limit.middleware';
import { validateBody } from '../middleware/validate.middleware';
import { toUserDto } from '../dtos/user.dto';
import { getAuthTokenCookieName, getAuthTokenCookieOptions, getClearAuthTokenCookieOptions } from '../lib/auth-jwt';
import { AuthService } from '../services/auth.service';
import {
  googleSignInSchema,
  loginSchema,
  registerSchema,
  type GoogleSignInInput,
  type LoginInput,
  type RegisterInput,
} from '../validations/auth.validation';

export const authRouter = Router();

const authService = new AuthService();

authRouter.post(
  '/register',
  authLimiter,
  validateBody(registerSchema),
  asyncHandler(async (req: Request<unknown, unknown, RegisterInput>, res: Response) => {
    const result = await authService.register(req.body);
    res.cookie(getAuthTokenCookieName(), result.authToken, getAuthTokenCookieOptions());
    res.status(201).json({ message: 'Registered successfully', data: { user: toUserDto(result.user) } });
  }),
);

authRouter.post(
  '/login',
  authLimiter,
  validateBody(loginSchema),
  asyncHandler(async (req: Request<unknown, unknown, LoginInput>, res: Response) => {
    const result = await authService.login(req.body);
    res.cookie(getAuthTokenCookieName(), result.authToken, getAuthTokenCookieOptions());
    res.status(200).json({ message: 'Signed in successfully', data: { user: toUserDto(result.user) } });
  }),
);

authRouter.post(
  '/google',
  authLimiter,
  validateBody(googleSignInSchema),
  asyncHandler(async (req: Request<unknown, unknown, GoogleSignInInput>, res: Response) => {
    const result = await authService.signInWithGoogle(req.body);
    res.cookie(getAuthTokenCookieName(), result.authToken, getAuthTokenCookieOptions());
    res.status(200).json({ message: 'Signed in successfully', data: { user: toUserDto(result.user) } });
  }),
);

authRouter.get(
  '/me',
  authLimiter,
  requireAuthMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const user = await authService.getUserById(req.user!.userId);
    res.status(200).json({ message: 'Current user loaded successfully', data: { user: toUserDto(user) } });
  }),
);

authRouter.post(
  '/logout',
  authLimiter,
  asyncHandler(async (_req: Request, res: Response) => {
    res.clearCookie(getAuthTokenCookieName(), getClearAuthTokenCookieOptions());
    res.status(200).json({ message: 'Signed out successfully', data: { signedOut: true } });
  }),
);
