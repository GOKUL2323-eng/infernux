import mongoose from 'mongoose';
import { config } from './env';
import { logger } from '../utils/logger';

export async function connectDatabase(): Promise<void> {
  try {
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

    await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 5000,
      autoIndex: config.env !== 'production',
    });
  } catch (error) {
    logger.error('Failed to connect to MongoDB initially', 'Database', error);
    // In local dev without local mongo running, we warn rather than crashing immediately so tests/mocks can function
    if (config.env === 'production') {
      process.exit(1);
    }
  }
}

export async function disconnectDatabase(): Promise<void> {
  try {
    await mongoose.disconnect();
    logger.info('MongoDB disconnected gracefully', 'Database');
  } catch (error) {
    logger.error('Error during MongoDB disconnect', 'Database', error);
  }
}
