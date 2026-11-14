import { PrismaClient } from '@prisma/client';
import { ENV } from './env.js';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ||
  new PrismaClient({
    log: ENV.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (ENV.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

export async function connectDB(): Promise<void> {
  try {
    await prisma.$connect();
    console.log('[Database] MySQL connected successfully via Prisma.');
  } catch (error) {
    console.error('[Database] MySQL connection error:', error);
    throw error;
  }
}
