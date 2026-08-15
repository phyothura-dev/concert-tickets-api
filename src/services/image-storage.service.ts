import { createHash, randomUUID } from 'node:crypto';
import { InternalError } from '../lib/errors';
import type { UploadedImage } from '../validations/image.validation';

type CloudinaryUploadResult = {
  format: string;
  public_id: string;
  secure_url: string;
};

type CloudinaryClient = {
  config(options: { api_key: string; api_secret: string; cloud_name: string; secure: boolean }): void;
  uploader: {
    destroy(publicId: string, options: { invalidate: boolean; resource_type: 'image'; type?: 'authenticated' }): Promise<{ result: string }>;
    upload_stream(
      options: {
        overwrite: boolean;
        public_id: string;
        resource_type: 'image';
        type?: 'authenticated';
        unique_filename: boolean;
      },
      callback: (error: Error | undefined, result: CloudinaryUploadResult | undefined) => void,
    ): NodeJS.WritableStream;
  };
  utils: {
    private_download_url(publicId: string, format: string, options: { attachment: boolean; expires_at: number; resource_type: 'image'; type: 'authenticated' }): string;
  };
};

const cloudinary = (require('cloudinary') as { v2: CloudinaryClient }).v2;

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new InternalError('Cloudinary storage is not configured', { missingEnvironmentVariable: name }, 'IMAGE_STORAGE_MISCONFIGURED');
  }
  return value;
}

function parseStorageKey(storageKey: string): { format: string; publicId: string } {
  const separator = storageKey.lastIndexOf('.');
  if (separator <= 0 || separator === storageKey.length - 1) {
    throw new InternalError('Invalid Cloudinary storage key', null, 'IMAGE_STORAGE_KEY_INVALID');
  }
  return { publicId: storageKey.slice(0, separator), format: storageKey.slice(separator + 1) };
}

function publicIdFromUrl(imageUrl: string): string {
  const path = new URL(imageUrl).pathname;
  const marker = '/image/upload/';
  const uploadPath = path.slice(path.indexOf(marker) + marker.length).replace(/^v\d+\//, '');
  const extension = uploadPath.lastIndexOf('.');
  if (!path.includes(marker) || extension <= 0) {
    throw new InternalError('Invalid Cloudinary image URL', null, 'IMAGE_STORAGE_URL_INVALID');
  }
  return decodeURIComponent(uploadPath.slice(0, extension));
}

export class ImageStorageService {
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

  private async upload(file: UploadedImage, folder: string, authenticated: boolean): Promise<CloudinaryUploadResult> {
    this.configure();
    try {
      return await new Promise<CloudinaryUploadResult>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            resource_type: 'image',
            public_id: `${folder}/${randomUUID()}`,
            overwrite: false,
            unique_filename: false,
            ...(authenticated ? { type: 'authenticated' as const } : {}),
          },
          (error, result) => {
            if (error) reject(error);
            else if (!result) reject(new Error('Cloudinary upload returned no result'));
            else resolve(result);
          },
        );
        stream.end(file.bytes);
      });
    } catch (error) {
      throw new InternalError('Failed to store image in Cloudinary', error, 'IMAGE_STORAGE_WRITE_FAILED');
    }
  }

  async savePublic(file: UploadedImage, folder: string): Promise<string> {
    return (await this.upload(file, folder, false)).secure_url;
  }

  async savePrivate(file: UploadedImage, folder: string): Promise<{ storageKey: string; sha256: string }> {
    const uploaded = await this.upload(file, folder, true);
    return {
      storageKey: `${uploaded.public_id}.${uploaded.format}`,
      sha256: createHash('sha256').update(file.bytes).digest('hex'),
    };
  }

  async readPrivate(storageKey: string): Promise<Buffer> {
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
      throw new InternalError('Failed to read image from Cloudinary', error, 'IMAGE_STORAGE_READ_FAILED');
    }
  }

  async removePublic(imageUrl: string): Promise<void> {
    await this.remove(publicIdFromUrl(imageUrl), false);
  }

  async removePrivate(storageKey: string): Promise<void> {
    await this.remove(parseStorageKey(storageKey).publicId, true);
  }

  private async remove(publicId: string, authenticated: boolean): Promise<void> {
    this.configure();
    try {
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: 'image',
        invalidate: true,
        ...(authenticated ? { type: 'authenticated' as const } : {}),
      });
      if (result.result !== 'ok' && result.result !== 'not found') {
        throw new Error(`Unexpected Cloudinary delete result: ${result.result}`);
      }
    } catch (error) {
      throw new InternalError('Failed to remove image from Cloudinary', error, 'IMAGE_STORAGE_DELETE_FAILED');
    }
  }
}
