import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { createApp } from './app';
import { config } from './config/env';
import { connectDatabase, disconnectDatabase } from './config/database';
import { initializeSocketIO } from './sockets';
import { startStoryCleanupJob } from './jobs/story-cleanup.job';
import { logger } from './utils/logger';

async function bootstrap() {
  const app = createApp();
  const server = http.createServer(app);

  // Initialize Socket.IO with CORS
  const io = new SocketIOServer(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

  initializeSocketIO(io);

  // Connect Database
  await connectDatabase();

  // Start background jobs
  const cleanupTimer = startStoryCleanupJob(15);

  // Start listening
  server.listen(config.port, config.host, () => {
    logger.info(
      `MOZHI API & Realtime Server running on http://${config.host}:${config.port} [env: ${config.env}]`,
      'Bootstrap'
    );
  });

  // Graceful shutdown
  const handleShutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Shutting down gracefully...`, 'Bootstrap');
    clearInterval(cleanupTimer);
    io.close();
    server.close(async () => {
      await disconnectDatabase();
      logger.info('Infernux server exited cleanly', 'Bootstrap');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));
}

bootstrap().catch((error) => {
  logger.error('Fatal error during server bootstrap', 'Bootstrap', error);
  process.exit(1);
});

