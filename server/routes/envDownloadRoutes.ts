import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

const router = Router();

// GET /api/download-env - Generates downloadable environment configuration
router.get('/', (_req: Request, res: Response) => {
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', 'attachment; filename="hyba.env"');
      const content = fs.readFileSync(envPath, 'utf8');
      return res.send(content);
    }

    // Fallback template
    const template = `# HYBA HIFZ CAMPUS MANAGEMENT SYSTEM - ENV CONFIGURATION
MONGODB_URI="mongodb+srv://muhammadajash59594_db_user:jastBzYB7F3sgHrY@hiba.aseakjf.mongodb.net/hyba_hifz?retryWrites=true&w=majority"
CLOUDINARY_URL="cloudinary://681148252944323:ZkP5e7DSjh2dcLSAXcKwwF7lYnU@bhlwt5m9"
CLOUDINARY_CLOUD_NAME="bhlwt5m9"
CLOUDINARY_API_KEY="681148252944323"
CLOUDINARY_API_SECRET="ZkP5e7DSjh2dcLSAXcKwwF7lYnU"
JWT_SECRET="hyba_hifz_campus_secure_jwt_secret_key_2026_quran_management"
SESSION_SECRET="hyba_session_key_markazul_hidayathil_islamiyya_2026"
PORT=3000
NODE_ENV=production
`;
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', 'attachment; filename="hyba.env"');
    return res.send(template);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to generate env file download' });
  }
});

export default router;
