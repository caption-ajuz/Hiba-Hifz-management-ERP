import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import http from 'http';
import path from 'path';
import cors from 'cors';
import { fileURLToPath } from 'url';

// Database & Services
import { connectDB } from './server/config/db';
import { checkCloudinaryHealth } from './server/config/cloudinary';
import { seedDatabaseIfEmpty } from './server/seed/seedData';
import { initSocketIO } from './server/socket';

// Routes
import authRoutes from './server/routes/authRoutes';
import studentRoutes from './server/routes/studentRoutes';
import teacherRoutes from './server/routes/teacherRoutes';
import classRoutes from './server/routes/classRoutes';
import attendanceRoutes from './server/routes/attendanceRoutes';
import hifzRoutes from './server/routes/hifzRoutes';
import uploadRoutes from './server/routes/uploadRoutes';
import healthRoutes from './server/routes/healthRoutes';
import announcementRoutes from './server/routes/announcementRoutes';
import evaluationRoutes from './server/routes/evaluationRoutes';
import envDownloadRoutes from './server/routes/envDownloadRoutes';
import campusRoutes from './server/routes/campusRoutes';
import eventRoutes from './server/routes/eventRoutes';
import timetableRoutes from './server/routes/timetableRoutes';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = http.createServer(app);

  // Initialize Socket.IO
  initSocketIO(server);

  // Core Middlewares
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Static files for local uploads (accessible in both dev and production)
  app.use('/uploads', express.static(path.resolve(__dirname, 'public/uploads')));

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/campuses', campusRoutes);
  app.use('/api/students', studentRoutes);
  app.use('/api/teachers', teacherRoutes);
  app.use('/api/classes', classRoutes);
  app.use('/api/attendance', attendanceRoutes);
  app.use('/api/hifz', hifzRoutes);
  app.use('/api/upload', uploadRoutes);
  app.use('/api/health', healthRoutes);
  app.use('/api/announcements', announcementRoutes);
  app.use('/api/evaluations', evaluationRoutes);
  app.use('/api/download-env', envDownloadRoutes);
  app.use('/api/events', eventRoutes);
  app.use('/api/timetable', timetableRoutes);

  // Connect to MongoDB Atlas and Seed initial data in background/concurrently
  connectDB()
    .then(async (connected) => {
      if (connected) {
        console.log('[Server] MongoDB Atlas connection verified. Verifying initial data seed...');
        await seedDatabaseIfEmpty();
      } else {
        console.warn('[Server] MongoDB Atlas offline or connecting; falling back gracefully to runtime cache.');
      }
    })
    .catch((err) => {
      console.error('[Server] MongoDB connection initial error:', err.message);
    });

  // Check Cloudinary media service
  checkCloudinaryHealth().catch((err) => {
    console.warn('[Server] Cloudinary health check warning:', err.message);
  });

  const isProduction = process.env.NODE_ENV === 'production';
  const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;

  if (!isProduction) {
    // Development mode: Mount Vite dev server middleware
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });

    app.use(vite.middlewares);
  } else {
    // Production mode: Serve built static assets
    const distPath = path.resolve(__dirname, 'dist');
    const publicPath = path.resolve(__dirname, 'public');

    // Robust static asset handlers supporting /assets, /public/assets, and legacy /src/assets
    app.use('/assets', express.static(path.resolve(distPath, 'assets')));
    app.use('/assets', express.static(path.resolve(publicPath, 'assets')));
    app.use('/public/assets', express.static(path.resolve(distPath, 'assets')));
    app.use('/public/assets', express.static(path.resolve(publicPath, 'assets')));
    app.use('/src/assets/images', express.static(path.resolve(publicPath, 'assets', 'images')));
    app.use('/src/assets', express.static(path.resolve(publicPath, 'assets')));

    // General static middleware for dist (HTML, scripts, stylesheets)
    app.use(express.static(distPath));

    // Never return HTML index for missing image or media extensions (prevents broken image box)
    app.get(/\.(jpg|jpeg|png|gif|svg|webp|ico|css|js|map)$/, (_req, res) => {
      res.status(404).end();
    });

    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  // Global Error Handler
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('[Global Server Error]:', err);
    res.status(err.status || 500).json({
      success: false,
      error: err.message || 'An unexpected internal server error occurred',
    });
  });

  server.listen(port, '0.0.0.0', () => {
    console.log(`[HYBA Server] Live at http://0.0.0.0:${port} (Mode: ${process.env.NODE_ENV || 'development'})`);
  });
}

startServer().catch((err) => {
  console.error('[HYBA Server Boot Failure]:', err);
  process.exit(1);
});
