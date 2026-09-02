import Redis from 'ioredis';
import { Queue } from 'bullmq';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const redisClient = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

export const importQueue = new Queue('import-queue', { connection: redisClient });
export const reconciliationQueue = new Queue('reconciliation-queue', { connection: redisClient });
