import { Router, type Request, type Response } from 'express';
import { toUserDto, toUserDtoList } from '../dtos/user.dto';
import { requireAdminMiddleware } from '../middleware/authorization.middleware';
import { requireAuthMiddleware } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/async-handler';
import { validateBody, validateParams } from '../middleware/validate.middleware';
import { userService } from '../services/user.service';
import {
  createUserSchema,
  updateUserSchema,
  userParamsSchema,
  type CreateUserInput,
  type UpdateUserInput,
  type UserParams,
} from '../validations/user.validation';

export const userRouter = Router();


userRouter.get('/', requireAuthMiddleware, requireAdminMiddleware, asyncHandler(async (_req: Request, res: Response) => {
  const users = await userService.listUsers();
  res.status(200).json({ message: 'Fetched users successfully', data: toUserDtoList(users) });
}));

userRouter.post('/', requireAuthMiddleware, requireAdminMiddleware, validateBody(createUserSchema), asyncHandler(async (req: Request<unknown, unknown, CreateUserInput>, res: Response) => {
  const user = await userService.createUser(req.body);
  res.status(201).json({ message: 'User created successfully', data: toUserDto(user) });
}));

userRouter.patch('/:id', requireAuthMiddleware, requireAdminMiddleware, validateParams(userParamsSchema), validateBody(updateUserSchema), asyncHandler(async (req: Request<UserParams, unknown, UpdateUserInput>, res: Response) => {
  const user = await userService.updateUser(req.params.id, req.body);
  res.status(200).json({ message: 'User updated successfully', data: toUserDto(user) });
}));
