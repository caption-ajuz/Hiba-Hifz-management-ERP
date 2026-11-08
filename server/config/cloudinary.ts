import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

export interface CloudinaryStatus {
  connected: boolean;
  state: 'connected' | 'error' | 'unconfigured';
  cloudName?: string;
  lastCheckedAt?: Date;
  lastError?: string;
}

export const cloudinaryStatus: CloudinaryStatus = {
  connected: false,
  state: 'unconfigured',
};

// Initialize Cloudinary
const cloudName = process.env.CLOUDINARY_CLOUD_NAME || 'bhlwt5m9';
const apiKey = process.env.CLOUDINARY_API_KEY || '681148252944323';
const apiSecret = process.env.CLOUDINARY_API_SECRET || 'ZkP5e7DSjh2dcLSAXcKwwF7lYnU';

if (process.env.CLOUDINARY_URL) {
  cloudinary.config({
    cloudinary_url: process.env.CLOUDINARY_URL,
    secure: true,
  });
} else {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
}

// Verify Cloudinary ping
export async function checkCloudinaryHealth(): Promise<boolean> {
  try {
    const res = await cloudinary.api.ping();
    if (res.status === 'ok') {
      cloudinaryStatus.connected = true;
      cloudinaryStatus.state = 'connected';
      cloudinaryStatus.cloudName = cloudName;
      cloudinaryStatus.lastCheckedAt = new Date();
      cloudinaryStatus.lastError = undefined;
      return true;
    }
    throw new Error('Ping status not ok');
  } catch (error: any) {
    cloudinaryStatus.connected = false;
    cloudinaryStatus.state = 'error';
    cloudinaryStatus.lastError = error.message || 'Cloudinary verification failed';
    cloudinaryStatus.lastCheckedAt = new Date();
    return false;
  }
}

export type MediaFolderType =
  | 'students'
  | 'teachers'
  | 'parents'
  | 'institution'
  | 'announcements'
  | 'documents';

/**
 * Upload a file buffer directly to Cloudinary using secure stream
 */
export async function uploadBufferToCloudinary(
  buffer: Buffer,
  folderType: MediaFolderType,
  options: {
    publicId?: string;
    transformation?: any;
    tags?: string[];
  } = {}
): Promise<{
  secure_url: string;
  public_id: string;
  format: string;
  bytes: number;
  width?: number;
  height?: number;
}> {
  const folder = `hyba/${folderType}`;

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: options.publicId,
        overwrite: true,
        resource_type: 'auto',
        transformation: options.transformation || [
          { quality: 'auto', fetch_format: 'auto' },
        ],
        tags: options.tags || ['hyba', folderType],
      },
      (error, result) => {
        if (error || !result) {
          return reject(error || new Error('Upload stream produced no result'));
        }
        resolve({
          secure_url: result.secure_url,
          public_id: result.public_id,
          format: result.format,
          bytes: result.bytes,
          width: result.width,
          height: result.height,
        });
      }
    );

    Readable.from(buffer).pipe(uploadStream);
  });
}

/**
 * Delete media by public ID when replaced or record deleted
 */
export async function deleteFromCloudinary(publicId: string): Promise<boolean> {
  if (!publicId) return false;
  try {
    const res = await cloudinary.uploader.destroy(publicId);
    return res.result === 'ok';
  } catch (err) {
    console.warn(`[Cloudinary] Failed to delete media ${publicId}:`, err);
    return false;
  }
}

/**
 * Generate optimized transformation URL
 */
export function getOptimizedImageUrl(
  publicIdOrUrl: string,
  width: number = 300,
  height: number = 300
): string {
  if (!publicIdOrUrl) return '';
  if (!publicIdOrUrl.startsWith('http') && !publicIdOrUrl.startsWith('/')) {
    return cloudinary.url(publicIdOrUrl, {
      width,
      height,
      crop: 'fill',
      gravity: 'face',
      quality: 'auto',
      fetch_format: 'auto',
      secure: true,
    });
  }
  return publicIdOrUrl;
}
