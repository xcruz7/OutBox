import { RedisOptions } from 'ioredis';
import { ENV } from './env.js';

export const redisConnectionOptions: RedisOptions = {
  host: ENV.REDIS_HOST,
  port: ENV.REDIS_PORT,
  password: ENV.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  retryStrategy(times) {
    const delay = Math.min(times * 500, 5000);
    return delay;
  },
};
