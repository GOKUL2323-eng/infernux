import mongoose from 'mongoose';
import dns from 'dns';
import { config } from './env';
import { logger } from '../utils/logger';

// Ensure Windows Node.js can resolve MongoDB Atlas SRV records
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {
  // ignore if custom DNS cannot be bound
}

let memoryServerInstance: any = null;

export async function connectDatabase(): Promise<void> {
  mongoose.set('strictQuery', true);

  mongoose.connection.on('connected', () => {
    logger.info('MongoDB connection established successfully', 'Database');
  });

  mongoose.connection.on('error', (err) => {
    logger.error('MongoDB connection error encountered', 'Database', err);
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected. Reconnection attempted...', 'Database');
  });

  try {
    // 1. Try to connect to configured MongoDB URI (local or Atlas)
    await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 2000,
      autoIndex: config.env !== 'production',
    });
    logger.info(`Connected to primary database: ${config.mongoUri}`, 'Database');
  } catch (error) {
    if (config.env === 'production') {
      logger.error('Failed to connect to primary MongoDB in production', 'Database', error);
      process.exit(1);
    }

    // 2. In development, auto-fallback to in-memory MongoDB so the app works seamlessly out-of-the-box
    logger.warn(
      `Could not reach primary MongoDB at ${config.mongoUri}. Auto-starting embedded in-memory MongoDB...`,
      'Database'
    );

    try {
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      memoryServerInstance = await MongoMemoryServer.create();
      const memoryUri = memoryServerInstance.getUri();

      await mongoose.connect(memoryUri, {
        dbName: 'infernux',
        autoIndex: true,
      });

      logger.info(`Embedded MongoDB active and connected at ${memoryUri}`, 'Database');
    } catch (memError) {
      logger.error('Failed to start embedded in-memory MongoDB fallback', 'Database', memError);
    }
  }
}

export async function disconnectDatabase(): Promise<void> {
  try {
    await mongoose.disconnect();
    if (memoryServerInstance) {
      await memoryServerInstance.stop();
      memoryServerInstance = null;
    }
    logger.info('MongoDB disconnected gracefully', 'Database');
  } catch (error) {
    logger.error('Error during MongoDB disconnect', 'Database', error);
  }
}
