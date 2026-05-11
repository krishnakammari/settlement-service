import { app } from './app';
import { connectDB } from './db';
import { logger } from './logger';

const port = process.env.PORT || 3000;
const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/settlement';

const start = async () => {
  await connectDB(mongoUri);
  app.listen(port, () => {
    logger.info(`Settlement service running on port ${port}`);
  });
};

start();
