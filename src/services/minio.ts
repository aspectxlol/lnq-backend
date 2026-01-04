import { Client } from 'minio';
import dotenv from 'dotenv';

dotenv.config();

const isTestEnv = process.env.NODE_ENV === 'test';

const minioClient = new Client({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT || '9000', 10),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
});

const bucketName = process.env.MINIO_BUCKET_NAME || 'images';

export async function checkMinIOConnection(timeoutMs: number = 2000): Promise<void> {
  if (isTestEnv) {
    return;
  }

  const timeoutPromise = new Promise<never>((_, reject) => {
    const id = setTimeout(() => {
      clearTimeout(id);
      reject(new Error('MinIO connection check timed out'));
    }, timeoutMs);
  });

  // We only want to verify MinIO is reachable.
  // Bucket existence is handled by initializeMinIO() which can create it.
  await Promise.race([minioClient.listBuckets(), timeoutPromise]);
}

export async function initializeMinIO() {
  if (isTestEnv) {
    return;
  }
  try {
    const exists = await minioClient.bucketExists(bucketName);
    if (!exists) {
      await minioClient.makeBucket(bucketName, 'us-east-1');
      console.log(`Bucket '${bucketName}' created successfully`);
    } else {
      console.log(`Bucket '${bucketName}' already exists`);
    }
  } catch (error) {
    console.error('Error initializing MinIO:', error);
    throw error;
  }
}

export async function uploadImage(
  fileName: string,
  fileBuffer: Buffer,
  mimeType: string
): Promise<string> {
  if (isTestEnv) {
    return `${Date.now()}-${fileName}`;
  }
  try {
    const objectName = `${Date.now()}-${fileName}`;

    await minioClient.putObject(
      bucketName,
      objectName,
      fileBuffer,
      fileBuffer.length,
      {
        'Content-Type': mimeType,
      }
    );

    return objectName;
  } catch (error) {
    console.error('Error uploading image to MinIO:', error);
    throw new Error('Failed to upload image');
  }
}

export async function deleteImage(imageId: string): Promise<void> {
  if (isTestEnv) {
    return;
  }
  try {
    await minioClient.removeObject(bucketName, imageId);
  } catch (error) {
    console.error('Error deleting image from MinIO:', error);
    throw new Error('Failed to delete image');
  }
}

export function getImageUrl(imageId: string): string {
  return `http://${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT}/${bucketName}/${imageId}`;
}

export default minioClient;
