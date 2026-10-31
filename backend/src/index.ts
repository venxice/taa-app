// ============================================================
// TAA-App Backend API - Main Entry Point
// ============================================================
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';

import { env } from './config/env';
import { prisma } from './config/prisma';
import { errorHandler } from './middlewares/errorHandler';
import { notFound } from './middlewares/notFound';
import { apiLimiter } from './middlewares/rateLimiter';
import { verifyCookieRequestOrigin } from './middlewares/csrfOrigin';
import routes from './routes';

const app = express();

// ---------- Global Middlewares ----------
app.use(helmet());
app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use('/api', verifyCookieRequestOrigin);
app.use('/api', (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});
app.use('/api', apiLimiter);

// ---------- Health Check ----------
app.get('/health', (_req, res) => {
  res.json({ success: true, message: 'TAA-App API is running' });
});

// ---------- API Routes ----------
app.use('/api', routes);

// ---------- Error Handling ----------
app.use(notFound);
app.use(errorHandler);

// ---------- Start Server ----------
async function bootstrap() {
  try {
    await prisma.$connect();
    console.log('✅ Database connected');

    app.listen(env.PORT, () => {
      console.log(`🚀 TAA-App API running on http://localhost:${env.PORT}`);
      console.log(`   Environment: ${env.NODE_ENV}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

bootstrap();
