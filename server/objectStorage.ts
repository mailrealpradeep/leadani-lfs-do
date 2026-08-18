import fs from 'fs';
import path from 'path';
import {
  STORAGE_DRIVER,
  S3_ENDPOINT,
  S3_REGION,
  S3_BUCKET,
  S3_ACCESS_KEY_ID,
  S3_SECRET_ACCESS_KEY,
  S3_FORCE_PATH_STYLE,
} from './config';

const STORAGE_DIR = './uploads';

interface StorageBackend {
  upload(filePath: string, data: Buffer): Promise<void>;
  download(filePath: string): Promise<Buffer | null>;
  delete(filePath: string): Promise<boolean>;
  exists(filePath: string): Promise<boolean>;
}

class LocalStorageBackend implements StorageBackend {
  private baseDir: string;

  constructor() {
    this.baseDir = path.resolve(STORAGE_DIR);
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  async upload(filePath: string, data: Buffer): Promise<void> {
    const fullPath = path.join(this.baseDir, filePath);
    const dir = path.dirname(fullPath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    await fs.promises.writeFile(fullPath, data);
  }

  async download(filePath: string): Promise<Buffer | null> {
    const fullPath = path.join(this.baseDir, filePath);

    if (!fs.existsSync(fullPath)) {
      return null;
    }

    return fs.promises.readFile(fullPath);
  }

  async delete(filePath: string): Promise<boolean> {
    const fullPath = path.join(this.baseDir, filePath);

    if (!fs.existsSync(fullPath)) {
      return false;
    }

    await fs.promises.unlink(fullPath);
    return true;
  }

  async exists(filePath: string): Promise<boolean> {
    const fullPath = path.join(this.baseDir, filePath);
    return fs.existsSync(fullPath);
  }
}

// S3-compatible backend (DigitalOcean Spaces, AWS S3, MinIO, …). The bucket
// stays private; files are always served through the app (/api/files, notice
// routes), never via public bucket URLs.
class S3StorageBackend implements StorageBackend {
  private clientPromise: Promise<import('@aws-sdk/client-s3').S3Client> | null = null;

  private async client() {
    if (!this.clientPromise) {
      this.clientPromise = import('@aws-sdk/client-s3').then(
        ({ S3Client }) =>
          new S3Client({
            endpoint: S3_ENDPOINT,
            region: S3_REGION,
            credentials: {
              accessKeyId: S3_ACCESS_KEY_ID,
              secretAccessKey: S3_SECRET_ACCESS_KEY,
            },
            forcePathStyle: S3_FORCE_PATH_STYLE,
          }),
      );
    }
    return this.clientPromise;
  }

  private static isNotFound(error: any): boolean {
    return (
      error?.name === 'NoSuchKey' ||
      error?.name === 'NotFound' ||
      error?.$metadata?.httpStatusCode === 404
    );
  }

  async upload(filePath: string, data: Buffer): Promise<void> {
    const { PutObjectCommand } = await import('@aws-sdk/client-s3');
    const client = await this.client();
    await client.send(
      new PutObjectCommand({ Bucket: S3_BUCKET, Key: filePath, Body: data }),
    );
  }

  async download(filePath: string): Promise<Buffer | null> {
    const { GetObjectCommand } = await import('@aws-sdk/client-s3');
    const client = await this.client();
    try {
      const result = await client.send(
        new GetObjectCommand({ Bucket: S3_BUCKET, Key: filePath }),
      );
      if (!result.Body) return null;
      return Buffer.from(await result.Body.transformToByteArray());
    } catch (error: any) {
      if (S3StorageBackend.isNotFound(error)) return null;
      throw error;
    }
  }

  async delete(filePath: string): Promise<boolean> {
    const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
    if (!(await this.exists(filePath))) return false;
    const client = await this.client();
    await client.send(
      new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: filePath }),
    );
    return true;
  }

  async exists(filePath: string): Promise<boolean> {
    const { HeadObjectCommand } = await import('@aws-sdk/client-s3');
    const client = await this.client();
    try {
      await client.send(
        new HeadObjectCommand({ Bucket: S3_BUCKET, Key: filePath }),
      );
      return true;
    } catch (error: any) {
      if (S3StorageBackend.isNotFound(error)) return false;
      throw error;
    }
  }
}

// Single shared backend instance — the driver is fixed for the process lifetime.
const backend: StorageBackend =
  STORAGE_DRIVER === 's3' ? new S3StorageBackend() : new LocalStorageBackend();

export class ObjectStorage {
  async upload(filePath: string, data: Buffer): Promise<void> {
    return backend.upload(filePath, data);
  }

  async download(filePath: string): Promise<Buffer | null> {
    return backend.download(filePath);
  }

  async delete(filePath: string): Promise<boolean> {
    return backend.delete(filePath);
  }

  async exists(filePath: string): Promise<boolean> {
    return backend.exists(filePath);
  }

  async getPublicUrl(filePath: string): Promise<string> {
    // Served through the app for both backends — the bucket stays private and
    // stored URLs (e.g. call_sessions.recording_url) keep the same shape.
    return `/api/files/${filePath}`;
  }
}
