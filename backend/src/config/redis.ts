import { RedisOptions } from 'ioredis';
import { ENV } from './env.js';

const baseRedisOptions: Pick<RedisOptions, 'maxRetriesPerRequest' | 'enableReadyCheck' | 'retryStrategy'> = {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  retryStrategy(times) {
    return Math.min(times * 500, 5000);
  },
};

const localRedisConnectionOptions: RedisOptions = {
  host: ENV.REDIS_HOST,
  port: ENV.REDIS_PORT,
  password: ENV.REDIS_PASSWORD || undefined,
  ...baseRedisOptions,
};

function connectionOptionsFromUrl(redisUrl: string): RedisOptions {
  const parsed = new URL(redisUrl);
  const database = parsed.pathname.length > 1 ? Number(parsed.pathname.slice(1)) : undefined;

  if ((parsed.protocol !== 'redis:' && parsed.protocol !== 'rediss:') || !parsed.hostname) {
    throw new Error('REDIS_URL must use redis:// or rediss:// and include a host.');
  }

  return {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 6379,
    username: parsed.username ? decodeURIComponent(parsed.username) : undefined,
    password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
    db: Number.isInteger(database) ? database : undefined,
    tls: parsed.protocol === 'rediss:' ? {} : undefined,
    ...baseRedisOptions,
  };
}

// Converts a managed redis:// or rediss:// endpoint into BullMQ-compatible ioredis options.
export const redisConnectionOptions: RedisOptions = ENV.REDIS_URL
  ? connectionOptionsFromUrl(ENV.REDIS_URL)
  : localRedisConnectionOptions;
