import type { NextFunction, Request, Response } from 'express';
import { ValidationError } from '../lib/errors';
import { paymentMethodSchema } from '../validations/payment.validation';
import type { PaymentMethod } from '../entities/PaymentSubmission';

export type PaymentScreenshot = {
  bytes: Buffer;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  extension: 'jpg' | 'png' | 'webp';
};

type FormFile = { arrayBuffer(): Promise<ArrayBuffer>; size: number; type: string };
type FormDataLike = { getAll(name: string): unknown[] };
type RequestConstructor = new (url: string, init: { method: string; headers: Record<string, string>; body: Buffer }) => {
  formData(): Promise<FormDataLike>;
};

const MAX_FILE_BYTES = 1024 * 1024;
const MAX_MULTIPART_BYTES = MAX_FILE_BYTES + 64 * 1024;

function detectImage(bytes: Buffer): Pick<PaymentScreenshot, 'mimeType' | 'extension'> | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { mimeType: 'image/jpeg', extension: 'jpg' };
  }
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { mimeType: 'image/png', extension: 'png' };
  }
  if (bytes.length >= 12 && bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP') {
    return { mimeType: 'image/webp', extension: 'webp' };
  }
  return null;
}

function isFormFile(value: unknown): value is FormFile {
  return typeof value === 'object' && value !== null
    && 'arrayBuffer' in value && typeof value.arrayBuffer === 'function'
    && 'size' in value && typeof value.size === 'number'
    && 'type' in value && typeof value.type === 'string';
}

export async function paymentUploadMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.is('multipart/form-data')) {
      throw new ValidationError('Payment screenshot is required', null, 'PAYMENT_SCREENSHOT_REQUIRED');
    }
    const chunks: Buffer[] = [];
    let received = 0;
    for await (const chunk of req) {
      const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array);
      received += bytes.length;
      if (received > MAX_MULTIPART_BYTES) {
        throw new ValidationError('Payment screenshot must not exceed 1 MB', null, 'PAYMENT_SCREENSHOT_TOO_LARGE');
      }
      chunks.push(bytes);
    }
    const NativeRequest = (globalThis as unknown as { Request: RequestConstructor }).Request;
    const nativeRequest = new NativeRequest('http://localhost/upload', {
      method: 'POST',
      headers: { 'content-type': req.headers['content-type'] ?? '' },
      body: Buffer.concat(chunks),
    });
    const form = await nativeRequest.formData();
    const paymentMethod = paymentMethodSchema.safeParse(form.getAll('paymentMethod')[0]);
    if (!paymentMethod.success) {
      throw new ValidationError('Select a supported payment method', null, 'PAYMENT_METHOD_INVALID');
    }
    const files = form.getAll('screenshot');
    if (files.length !== 1 || !isFormFile(files[0])) {
      throw new ValidationError('Exactly one payment screenshot is required', null, 'PAYMENT_SCREENSHOT_REQUIRED');
    }
    const file = files[0];
    if (file.size < 1 || file.size > MAX_FILE_BYTES) {
      throw new ValidationError('Payment screenshot must not exceed 1 MB', null, 'PAYMENT_SCREENSHOT_TOO_LARGE');
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    const detected = detectImage(bytes);
    if (!detected || file.type !== detected.mimeType) {
      throw new ValidationError('Only JPEG, PNG, and WebP screenshots are accepted', null, 'PAYMENT_SCREENSHOT_UNSUPPORTED_TYPE');
    }
    res.locals['paymentScreenshot'] = { bytes, ...detected } satisfies PaymentScreenshot;
    res.locals['paymentMethod'] = paymentMethod.data;
    next();
  } catch (error) {
    next(error);
  }
}

export function getPaymentMethod(res: Response): PaymentMethod {
  const method = res.locals['paymentMethod'] as PaymentMethod | undefined;
  if (!method) throw new ValidationError('Select a supported payment method', null, 'PAYMENT_METHOD_INVALID');
  return method;
}

export function getPaymentScreenshot(res: Response): PaymentScreenshot {
  const screenshot = res.locals['paymentScreenshot'] as PaymentScreenshot | undefined;
  if (!screenshot) throw new ValidationError('Payment screenshot is required', null, 'PAYMENT_SCREENSHOT_REQUIRED');
  return screenshot;
}
