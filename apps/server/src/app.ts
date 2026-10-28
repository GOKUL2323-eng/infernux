import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { config } from './config/env';
import apiRouter from './routes';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';
import { generalLimiter } from './middlewares/rateLimiter.middleware';

export function createApp(): Application {
  const app = express();

  // Security headers
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );

  // CORS
  app.use(
    cors({
      origin: true, // Dynamically reflect origin so credentialed requests from browser never fail CORS
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // Request parsers
  app.use(express.json({ limit: '20mb' }));
  app.use(express.urlencoded({ extended: true, limit: '20mb' }));

  // Static uploads serving
  app.use('/uploads', express.static(config.storage.localUploadDir));

  // Rate limiting
  app.use(generalLimiter);

  // Health check endpoint
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'Infernux API',
      version: '1.0.0',
    });
  });

  // API v1 Routes
  app.use('/api/v1', apiRouter);

  // Fallthrough 404 & error handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

