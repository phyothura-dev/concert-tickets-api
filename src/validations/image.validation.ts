import { z } from 'zod';

const MAX_IMAGE_BYTES = 1024 * 1024;
const mimeTypeSchema = z.enum(['image/jpeg', 'image/png', 'image/webp']);

export const imageFileSchema = z.object({
  buffer: z.instanceof(Buffer),
  size: z.number().positive().max(MAX_IMAGE_BYTES, 'Image must be 1 MB or smaller'),
  mimetype: mimeTypeSchema,
}).passthrough().transform((file) => ({
  bytes: file.buffer,
  mimeType: file.mimetype,
}));

export type UploadedImage = z.infer<typeof imageFileSchema>;
