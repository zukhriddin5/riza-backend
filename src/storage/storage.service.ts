import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import { join } from 'path';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import sharp from 'sharp';

// A ready-to-store image: the (possibly resized) bytes plus its final type.
interface ProcessedImage {
  buffer: Buffer;
  ext: string;
  contentType: string;
}

// One entry point for saving uploaded files. Every image is normalised (resized +
// compressed) first, then handed to the driver chosen by env — so the rest of the
// app never cares WHERE the bytes go or how big the original was.
//   STORAGE_DRIVER=local → write to ./uploads, served by the API (dev)
//   STORAGE_DRIVER=s3    → upload to Cloudflare R2 / DO Spaces / AWS S3 (prod)
@Injectable()
export class StorageService {
  private readonly driver = process.env.STORAGE_DRIVER ?? 'local';
  private s3?: S3Client; // built lazily so local dev needs no S3 env

  async save(file: Express.Multer.File): Promise<{ url: string }> {
    const image = await this.processImage(file);
    return this.driver === 's3' ? this.saveS3(image) : this.saveLocal(image);
  }

  // Cap dimensions to 1200px and re-encode as WebP (~80% quality). This bounds
  // storage + bandwidth no matter how huge the original was. Animated GIFs are
  // passed through untouched so they keep animating.
  private async processImage(file: Express.Multer.File): Promise<ProcessedImage> {
    if (file.mimetype === 'image/gif') {
      return { buffer: file.buffer, ext: '.gif', contentType: 'image/gif' };
    }

    const buffer = await sharp(file.buffer)
      .rotate() // honour EXIF orientation from phone cameras
      .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    return { buffer, ext: '.webp', contentType: 'image/webp' };
  }

  // A unique object key: random id + the final extension.
  private buildKey(ext: string): string {
    return `${randomUUID()}${ext}`;
  }

  private async saveLocal(image: ProcessedImage): Promise<{ url: string }> {
    const uploadsDir = join(process.cwd(), 'uploads');
    await fs.mkdir(uploadsDir, { recursive: true }); // no-op if it already exists

    const key = this.buildKey(image.ext);
    await fs.writeFile(join(uploadsDir, key), image.buffer);

    const base = process.env.APP_URL ?? `http://localhost:${process.env.PORT ?? 3000}`;
    return { url: `${base}/uploads/${key}` };
  }

  private async saveS3(image: ProcessedImage): Promise<{ url: string }> {
    const bucket = process.env.S3_BUCKET;
    const publicBase = process.env.S3_PUBLIC_URL;
    if (!bucket || !publicBase) {
      throw new BadRequestException('S3 storage is not fully configured');
    }

    const key = this.buildKey(image.ext);
    await this.getS3().send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: image.buffer,
        ContentType: image.contentType,
      }),
    );

    // R2/Spaces/S3 don't serve the object at the API host — return the bucket's
    // public URL (r2.dev, a custom domain, or the S3/Spaces CDN endpoint).
    return { url: `${publicBase.replace(/\/+$/, '')}/${key}` };
  }

  // S3-compatible client. For Cloudflare R2: region "auto",
  // endpoint https://<accountid>.r2.cloudflarestorage.com. Works for DO Spaces
  // and AWS S3 too — only the env values differ.
  private getS3(): S3Client {
    if (!this.s3) {
      this.s3 = new S3Client({
        region: process.env.S3_REGION ?? 'auto',
        endpoint: process.env.S3_ENDPOINT,
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY_ID ?? '',
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? '',
        },
        forcePathStyle: true, // safest for S3-compatible providers like R2
      });
    }
    return this.s3;
  }
}
