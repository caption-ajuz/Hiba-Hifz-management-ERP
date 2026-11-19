import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import fs from 'fs';
import http from 'http';
import path from 'path';
import cors from 'cors';
import cookieParser from 'cookie-parser';
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
import campusRoutes from './server/routes/campusRoutes';
import eventRoutes from './server/routes/eventRoutes';
import timetableRoutes from './server/routes/timetableRoutes';
import feedbackRoutes from './server/routes/feedbackRoutes';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  app.set('trust proxy', 1);
  const server = http.createServer(app);

  // Initialize Socket.IO
  initSocketIO(server);

  // Core Middlewares
  app.use(cors({ origin: true, credentials: true }));
  app.use(cookieParser());
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
  app.use('/api/events', eventRoutes);
  app.use('/api/timetable', timetableRoutes);
  app.use('/api/feedback', feedbackRoutes);

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

  const distPath = path.resolve(__dirname, 'dist');
  const isRender = process.env.RENDER === 'true';
  const hasBuiltDist = fs.existsSync(path.join(distPath, 'index.html'));
  const isProduction = process.env.NODE_ENV === 'production' || (isRender && hasBuiltDist);
  // Parse port from CLI flags (--port <number>) or use 3000 for local dev to avoid port 8080 collision with internal proxy
  const portArgIndex = process.argv.indexOf('--port');
  let port = 3000;
  if (portArgIndex !== -1 && process.argv[portArgIndex + 1]) {
    port = parseInt(process.argv[portArgIndex + 1], 10);
  } else if ((isProduction || isRender) && process.env.PORT) {
    port = parseInt(process.env.PORT, 10);
  }

  if (!isProduction) {
    // Development mode: Mount Vite dev server middleware
    const hmrDisabled = process.env.DISABLE_HMR === 'true';
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: {
        middlewareMode: true,
        allowedHosts: true,
        hmr: hmrDisabled ? false : { server, path: '/__vite_hmr' },
        watch: hmrDisabled ? null : {},
      },
      appType: 'spa',
    });

    if (hmrDisabled) {
      // Prevent @vite/client from opening a failing WebSocket to port 24678 when HMR is disabled
      app.get('/@vite/client', (_req, res) => {
        res.type('application/javascript').send(`
          export function createHotContext() {
            return {
              data: {},
              accept() {},
              acceptExports() {},
              dispose() {},
              prune() {},
              decline() {},
              invalidate() {},
              on() {},
              off() {},
              send() {},
            };
          }
          export function updateStyle(id, content) {
            let style = document.querySelector(\`style[data-vite-dev-id="\${id}"]\`);
            if (!style) {
              style = document.createElement('style');
              style.setAttribute('data-vite-dev-id', id);
              document.head.appendChild(style);
            }
            style.textContent = content;
          }
          export function removeStyle(id) {
            const style = document.querySelector(\`style[data-vite-dev-id="\${id}"]\`);
            if (style) style.remove();
          }
          export function injectQuery(url) { return url; }
          export const ErrorOverlay = class {};
        `);
      });
    }

    app.use(vite.middlewares);
  } else {
    // Production mode: Serve built static assets
    const publicPath = path.resolve(__dirname, 'public');

    // Robust static asset handlers supporting /assets, /public/assets, and legacy /src/assets
    app.use('/assets', express.static(path.resolve(distPath, 'assets')));
    app.use('/assets', express.static(path.resolve(publicPath, 'assets')));
    app.use('/public/assets', express.static(path.resolve(distPath, 'assets')));
    app.use('/public/assets', express.static(path.resolve(publicPath, 'assets')));
    app.use('/src/assets/images', express.static(path.resolve(publicPath, 'assets', 'images')));
    app.use('/src/assets', express.static(path.resolve(publicPath, 'assets')));

    // Ensure service worker and PWA manifest are never stale in browsers
    app.get(['/sw.js', '/registerSW.js'], (_req, res, next) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Service-Worker-Allowed', '/');
      next();
    });
    app.get(['/manifest.json', '/manifest.webmanifest'], (_req, res, next) => {
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Content-Type', 'application/manifest+json');
      next();
    });

    // General static middleware for dist (HTML, scripts, stylesheets)
    app.use(express.static(distPath));

    // Never return HTML index for missing image or media extensions (prevents broken image box)
    app.get(/\.(jpg|jpeg|png|gif|svg|webp|ico|css|js|map|webmanifest)$/, (_req, res) => {
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
