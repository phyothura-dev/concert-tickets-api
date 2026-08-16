import { Router, type Request, type Response } from 'express';
import { toCategoryDto, toCategoryDtoList } from '../dtos/category.dto';
import { requireAuthMiddleware } from '../middleware/auth.middleware';
import { requireAdminMiddleware } from '../middleware/authorization.middleware';
import { asyncHandler } from '../middleware/async-handler';
import { validateBody, validateParams } from '../middleware/validate.middleware';
import { categoryService } from '../services/category.service';
import {
  categoryParamsSchema,
  createCategorySchema,
  updateCategorySchema,
  type CategoryParams,
  type CreateCategoryInput,
  type UpdateCategoryInput,
} from '../validations/category.validation';

export const categoryRouter = Router();


categoryRouter.get('/', asyncHandler(async (_req: Request, res: Response) => {
  const categories = await categoryService.listCategories();
  res.status(200).json({ message: 'Fetched categories successfully', data: toCategoryDtoList(categories) });
}));

categoryRouter.post('/', requireAuthMiddleware, requireAdminMiddleware, validateBody(createCategorySchema), asyncHandler(async (req: Request<unknown, unknown, CreateCategoryInput>, res: Response) => {
  const category = await categoryService.createCategory(req.body);
  res.status(201).json({ message: 'Category created successfully', data: toCategoryDto(category) });
}));

categoryRouter.get('/:id', validateParams(categoryParamsSchema), asyncHandler(async (req: Request<CategoryParams>, res: Response) => {
  const category = await categoryService.getCategory(req.params.id);
  res.status(200).json({ message: 'Fetched category successfully', data: toCategoryDto(category) });
}));

categoryRouter.patch('/:id', requireAuthMiddleware, requireAdminMiddleware, validateParams(categoryParamsSchema), validateBody(updateCategorySchema), asyncHandler(async (req: Request<CategoryParams, unknown, UpdateCategoryInput>, res: Response) => {
  const category = await categoryService.updateCategory(req.params.id, req.body);
  res.status(200).json({ message: 'Category updated successfully', data: toCategoryDto(category) });
}));

categoryRouter.delete('/:id', requireAuthMiddleware, requireAdminMiddleware, validateParams(categoryParamsSchema), asyncHandler(async (req: Request<CategoryParams>, res: Response) => {
  const result = await categoryService.deleteCategory(req.params.id);
  res.status(200).json({ message: 'Category deleted successfully', data: result });
}));
