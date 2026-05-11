import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';

const prisma = new PrismaClient({
  log: [
    { level: 'warn', emit: 'event' },
    { level: 'info', emit: 'event' },
    { level: 'error', emit: 'event' },
  ],
  errorFormat: 'colorless',
});

// Logging for Prisma events
prisma.$on('warn', (e) => {
  logger.warn('Prisma Warning:', e);
});

prisma.$on('info', (e) => {
  logger.info('Prisma Info:', e);
});

prisma.$on('error', (e) => {
  logger.error('Prisma Error:', e);
});

export const connectDatabase = async (): Promise<void> => {
  try {
    await prisma.$connect();
    logger.info('✅ Database connected successfully');
  } catch (error) {
    logger.error('❌ Database connection failed:', error);
    process.exit(1);
  }
};

export { prisma };