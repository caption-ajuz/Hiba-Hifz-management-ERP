import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { dbStatus, connectDB } from '../config/db';
import { cloudinaryStatus, checkCloudinaryHealth } from '../config/cloudinary';
import { getIO } from '../socket';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Cache health results briefly to prevent load
let cachedHealth: any = null;
let lastCheckTime = 0;

export async function computeSanitizedHealth() {
  const now = Date.now();
  if (cachedHealth && now - lastCheckTime < 10000) {
    return cachedHealth;
  }

  // 1. MongoDB Status
  const mongoReadyState = mongoose.connection.readyState;
  // 0: disconnected, 1: connected, 2: connecting, 3: disconnecting
  let mongoStatus = 'disconnected';
  if (mongoReadyState === 1) mongoStatus = 'connected';
  else if (mongoReadyState === 2) mongoStatus = 'connecting';

  // 2. Cloudinary Status
  const isCloudinaryOk = await checkCloudinaryHealth();

  // 3. Socket.IO status
  const io = getIO();
  const socketOk = Boolean(io);
  const activeSockets = io ? io.engine?.clientsCount || 0 : 0;

  // Aggregate overall status
  let overall: 'green' | 'amber' | 'red' = 'green';
  if (mongoStatus === 'connected' && isCloudinaryOk && socketOk) {
    overall = 'green';
  } else if (mongoStatus === 'connecting' || (!isCloudinaryOk && mongoStatus === 'connected')) {
    overall = 'amber';
  } else {
    overall = 'red';
  }

  cachedHealth = {
    overall,
    timestamp: new Date().toISOString(),
    services: {
      mongodb: {
        name: 'MongoDB Atlas',
        status: mongoStatus === 'connected' ? 'Connected' : mongoStatus === 'connecting' ? 'Connecting' : 'Disconnected',
        isOperational: mongoStatus === 'connected',
        lastConnectedAt: dbStatus.lastConnectedAt || null,
        errorMessage: dbStatus.lastError || null,
        troubleshooting: mongoStatus === 'connected'
          ? 'Operational with connection pooling active.'
          : 'Check MongoDB Atlas network whitelist (0.0.0.0/0 allowed) and database credentials.',
      },
      cloudinary: {
        name: 'Cloudinary Media Storage',
        status: isCloudinaryOk ? 'Connected' : 'Unavailable',
        isOperational: isCloudinaryOk,
        cloudName: cloudinaryStatus.cloudName ? `${cloudinaryStatus.cloudName.slice(0, 3)}***` : undefined,
        lastCheckedAt: cloudinaryStatus.lastCheckedAt || null,
        errorMessage: cloudinaryStatus.lastError || null,
        troubleshooting: isCloudinaryOk
          ? 'Operational for signed media streaming and transformations.'
          : 'Check Cloudinary cloud name, API key, and secret in environment variables.',
      },
      websocket: {
        name: 'Socket.IO Real-Time Engine',
        status: socketOk ? 'Connected' : 'Unavailable',
        isOperational: socketOk,
        activeConnections: activeSockets,
        troubleshooting: socketOk
          ? 'Event-driven real-time channel established for attendance & Hifz updates.'
          : 'Ensure WebSocket server instance is running on port 3000.',
      },
    },
  };

  lastCheckTime = now;
  return cachedHealth;
}

// GET /api/health/minimal - Available for the minimal circular navbar indicator (sanitized, no credentials)
router.get('/minimal', async (_req: Request, res: Response) => {
  try {
    const health = await computeSanitizedHealth();
    return res.json({
      success: true,
      overall: health.overall, // 'green' | 'amber' | 'red'
      timestamp: health.timestamp,
    });
  } catch (err: any) {
    return res.json({
      success: true,
      overall: 'red',
      timestamp: new Date().toISOString(),
    });
  }
});

// GET /api/health/diagnostics - Detailed modal popover for Super Admin
router.get('/diagnostics', async (req: Request, res: Response) => {
  try {
    const health = await computeSanitizedHealth();
    return res.json({
      success: true,
      diagnostics: health,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve diagnostics' });
  }
});

// POST /api/health/retry - Allows Super Admin to trigger a reconnection attempt
router.post('/retry', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ success: false, error: 'Only Super Admin can retry infrastructure connections.' });
    }

    lastCheckTime = 0; // invalidate cache
    const mongoRes = await connectDB();
    const cloudRes = await checkCloudinaryHealth();
    const health = await computeSanitizedHealth();

    return res.json({
      success: true,
      message: 'Connection retry completed.',
      diagnostics: health,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Retry failed' });
  }
});

export default router;
