import { Router, Request, Response } from 'express';
import multer from 'multer';
import {
  uploadBufferToCloudinary,
  deleteFromCloudinary,
  MediaFolderType,
  getOptimizedImageUrl,
} from '../config/cloudinary';
import { authenticate, AuthRequest, logAuditEvent } from '../middleware/auth';

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

// POST /api/upload/image - Upload image buffer to organized Cloudinary folder
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

      // If an old image publicId was passed for replacement, delete it first
      if (oldPublicId && typeof oldPublicId === 'string') {
        await deleteFromCloudinary(oldPublicId);
      }

      const uploadResult = await uploadBufferToCloudinary(req.file.buffer, safeFolder, {
        transformation: [
          { quality: 'auto', fetch_format: 'auto' },
        ],
      });

      await logAuditEvent('MEDIA_UPLOAD', req.user, 'CloudinaryMedia', uploadResult.public_id, {
        folder: safeFolder,
        format: uploadResult.format,
        bytes: uploadResult.bytes,
      });

      return res.json({
        success: true,
        message: 'File successfully uploaded and stored in Cloudinary.',
        data: {
          secure_url: uploadResult.secure_url,
          public_id: uploadResult.public_id,
          format: uploadResult.format,
          bytes: uploadResult.bytes,
          optimized_url: getOptimizedImageUrl(uploadResult.public_id, 400, 400),
        },
      });
    } catch (err: any) {
      console.error('[Upload] Cloudinary upload error:', err);
      return res.status(500).json({
        success: false,
        error: err.message || 'Failed to upload media to Cloudinary',
      });
    }
  }
);

// DELETE /api/upload - Delete media from Cloudinary
router.delete('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { publicId } = req.body;
    if (!publicId) {
      return res.status(400).json({ success: false, error: 'publicId is required' });
    }

    const deleted = await deleteFromCloudinary(publicId);
    if (!deleted) {
      return res.status(500).json({ success: false, error: 'Could not delete media' });
    }

    await logAuditEvent('MEDIA_DELETE', req.user, 'CloudinaryMedia', publicId);

    return res.json({ success: true, message: 'Media removed from Cloudinary' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to delete media' });
  }
});

export default router;
