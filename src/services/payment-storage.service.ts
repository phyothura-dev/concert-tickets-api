import { createHash, randomUUID } from 'node:crypto';
import { InternalError } from '../lib/errors';
import type { PaymentScreenshot } from '../middleware/payment-upload.middleware';

type CloudinaryUploadResult = {
  format: string;
  public_id: string;
};

type CloudinaryClient = {
  config(options: { api_key: string; api_secret: string; cloud_name: string; secure: boolean }): void;
  uploader: {
    destroy(publicId: string, options: { invalidate: boolean; resource_type: 'image'; type: 'authenticated' }): Promise<{ result: string }>;
    upload_stream(
      options: {
        overwrite: boolean;
        public_id: string;
        resource_type: 'image';
        type: 'authenticated';
        unique_filename: boolean;
      },
      callback: (error: Error | undefined, result: CloudinaryUploadResult | undefined) => void,
    ): NodeJS.WritableStream;
  };
  utils: {
    private_download_url(
      publicId: string,
      format: string,
      options: { attachment: boolean; expires_at: number; resource_type: 'image'; type: 'authenticated' },
    ): string;
  };
};

const cloudinary = (require('cloudinary') as { v2: CloudinaryClient }).v2;

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new InternalError(
      'Cloudinary payment storage is not configured',
      { missingEnvironmentVariable: name },
      'PAYMENT_STORAGE_MISCONFIGURED',
    );
  }
  return value;
}

function parseStorageKey(storageKey: string): { format: string; publicId: string } {
  const separator = storageKey.lastIndexOf('.');
  if (separator <= 0 || separator === storageKey.length - 1) {
    throw new InternalError('Invalid Cloudinary payment storage key', null, 'PAYMENT_STORAGE_KEY_INVALID');
  }
  return { publicId: storageKey.slice(0, separator), format: storageKey.slice(separator + 1) };
}

export class PaymentStorageService {
  private configured = false;

  private configure(): void {
    if (this.configured) return;
    cloudinary.config({
      cloud_name: requiredEnv('CLOUDINARY_CLOUD_NAME'),
      api_key: requiredEnv('CLOUDINARY_API_KEY'),
      api_secret: requiredEnv('CLOUDINARY_API_SECRET'),
      secure: true,
    });
    this.configured = true;
  }

  async save(file: PaymentScreenshot): Promise<{ storageKey: string; sha256: string }> {
    this.configure();
    const publicId = `payment-proofs/${randomUUID()}`;
    const sha256 = createHash('sha256').update(file.bytes).digest('hex');

    try {
      const uploaded = await new Promise<CloudinaryUploadResult>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream({
          resource_type: 'image',
          type: 'authenticated',
          public_id: publicId,
          overwrite: false,
          unique_filename: false,
        }, (error, result) => {
          if (error) reject(error);
          else if (!result) reject(new Error('Cloudinary upload returned no result'));
          else resolve(result);
        });
        stream.end(file.bytes);
      });
      return { storageKey: `${uploaded.public_id}.${uploaded.format}`, sha256 };
    } catch (error) {
      throw new InternalError('Failed to store payment proof in Cloudinary', error, 'PAYMENT_STORAGE_WRITE_FAILED');
    }
  }

  async read(storageKey: string): Promise<Buffer> {
    this.configure();
    const { publicId, format } = parseStorageKey(storageKey);
    try {
      const url = cloudinary.utils.private_download_url(publicId, format, {
        resource_type: 'image',
        type: 'authenticated',
        expires_at: Math.floor(Date.now() / 1000) + 5 * 60,
        attachment: false,
      });
      const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
      if (!response.ok) throw new Error(`Cloudinary download failed with status ${response.status}`);
      return Buffer.from(await response.arrayBuffer());
    } catch (error) {
      throw new InternalError('Failed to read payment proof from Cloudinary', error, 'PAYMENT_STORAGE_READ_FAILED');
    }
  }

  async remove(storageKey: string): Promise<void> {
    this.configure();
    const { publicId } = parseStorageKey(storageKey);
    try {
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: 'image',
        type: 'authenticated',
        invalidate: true,
      });
      if (result.result !== 'ok' && result.result !== 'not found') {
        throw new Error(`Unexpected Cloudinary delete result: ${result.result}`);
      }
    } catch (error) {
      throw new InternalError('Failed to delete payment proof from Cloudinary', error, 'PAYMENT_STORAGE_DELETE_FAILED');
    }
  }
}
