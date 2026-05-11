import mongoose from 'mongoose';
import { logger } from './logger';

export const connectDB = async (uri: string) => {
  try {
    await mongoose.connect(uri);
    logger.info('Connected to MongoDB');
  } catch (error) {
    logger.error('MongoDB connection error', { error });
    process.exit(1);
  }
};
