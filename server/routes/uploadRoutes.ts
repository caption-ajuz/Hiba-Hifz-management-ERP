import { Router, Response } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  uploadBufferToCloudinary,
  deleteFromCloudinary,
  MediaFolderType,
  getOptimizedImageUrl,
} from '../config/cloudinary';
import { authenticate, AuthRequest, logAuditEvent } from '../middleware/auth';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.resolve(__dirname, '../../public/uploads');

// Ensure local uploads directory exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const router = Router();

// Configure Multer for memory buffer storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file format. Allowed formats: JPG, PNG, WEBP, GIF, PDF.'));
    }
  },
});

// POST /api/upload/image - Dual-mode upload: Cloudinary with seamless local storage fallback
router.post(
  '/image',
  authenticate,
  upload.single('file'),
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No media file provided.' });
      }

      const folderType = (req.body.folder || 'students') as MediaFolderType;
      const validFolders: MediaFolderType[] = [
        'students',
        'teachers',
        'parents',
        'institution',
        'announcements',
        'documents',
      ];

      const safeFolder = validFolders.includes(folderType) ? folderType : 'students';
      const oldPublicId = req.body.oldPublicId;

      // Handle replacement deletion
      if (oldPublicId && typeof oldPublicId === 'string') {
        if (oldPublicId.startsWith('local_')) {
          const localFilename = oldPublicId.replace('local_', '');
          const localPath = path.join(uploadsDir, localFilename);
          if (fs.existsSync(localPath)) {
            try {
              fs.unlinkSync(localPath);
            } catch (err) {
              console.warn('[Upload] Failed to delete old local file:', err);
            }
          }
        } else {
          try {
            await deleteFromCloudinary(oldPublicId);
          } catch {
            // Ignore failure on old file deletion
          }
        }
      }

      // Try Cloudinary first if configured
      const hasCloudinary = Boolean(process.env.CLOUDINARY_URL || (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY));

      if (hasCloudinary) {
        try {
          const uploadResult = await uploadBufferToCloudinary(req.file.buffer, safeFolder, {
            transformation: [{ quality: 'auto', fetch_format: 'auto' }],
          });

          await logAuditEvent('MEDIA_UPLOAD', req.user, 'CloudinaryMedia', uploadResult.public_id, {
            folder: safeFolder,
            format: uploadResult.format,
            bytes: uploadResult.bytes,
          });

          return res.json({
            success: true,
            message: 'File successfully uploaded and stored in Cloudinary CDN.',
            data: {
              secure_url: uploadResult.secure_url,
              public_id: uploadResult.public_id,
              format: uploadResult.format,
              bytes: uploadResult.bytes,
              optimized_url: getOptimizedImageUrl(uploadResult.public_id, 400, 400),
            },
          });
        } catch (cloudErr: any) {
          console.warn('[Upload] Cloudinary upload failed; falling back seamlessly to local disk:', cloudErr.message);
        }
      }

      // Local disk fallback
      const ext = path.extname(req.file.originalname) || '.jpg';
      const cleanExt = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.pdf'].includes(ext.toLowerCase()) ? ext.toLowerCase() : '.jpg';
      const safeFilename = `${safeFolder}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${cleanExt}`;
      const destination = path.join(uploadsDir, safeFilename);

      fs.writeFileSync(destination, req.file.buffer);

      const publicUrl = `/uploads/${safeFilename}`;
      const publicId = `local_${safeFilename}`;

      await logAuditEvent('MEDIA_UPLOAD_LOCAL', req.user, 'LocalMedia', publicId, {
        folder: safeFolder,
        bytes: req.file.size,
      });

      return res.json({
        success: true,
        message: 'File uploaded and persisted to local server storage.',
        data: {
          secure_url: publicUrl,
          public_id: publicId,
          format: cleanExt.replace('.', ''),
          bytes: req.file.size,
          optimized_url: publicUrl,
        },
      });
    } catch (err: any) {
      console.error('[Upload] Upload error:', err);
      return res.status(500).json({
        success: false,
        error: err.message || 'Failed to upload media.',
      });
    }
  }
);

// DELETE /api/upload - Delete media
router.delete('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { publicId } = req.body;
    if (!publicId) {
      return res.status(400).json({ success: false, error: 'publicId is required' });
    }

    if (publicId.startsWith('local_')) {
      const localFilename = publicId.replace('local_', '');
      const localPath = path.join(uploadsDir, localFilename);
      if (fs.existsSync(localPath)) {
        fs.unlinkSync(localPath);
      }
    } else {
      await deleteFromCloudinary(publicId);
    }

    await logAuditEvent('MEDIA_DELETE', req.user, 'Media', publicId);

    return res.json({ success: true, message: 'Media removed successfully' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to delete media' });
  }
});

export default router;
