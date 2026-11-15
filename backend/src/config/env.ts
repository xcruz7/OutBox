import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export const ENV = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  FRONTEND_URLS: (process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:5173')
    .split(',')
    .map((url) => url.trim().replace(/\/$/, ''))
    .filter(Boolean),
  DATABASE_URL: process.env.DATABASE_URL || 'mysql://outbox_user:outbox_pass@localhost:3306/outbox_scheduler',
  REDIS_URL: process.env.REDIS_URL || '',
  REDIS_HOST: process.env.REDIS_HOST || '127.0.0.1',
  REDIS_PORT: parseInt(process.env.REDIS_PORT || '6379', 10),
  REDIS_PASSWORD: process.env.REDIS_PASSWORD || undefined,
  JWT_SECRET: process.env.JWT_SECRET || 'outbox_super_secret_jwt_key_fallback_do_not_use_in_prod',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  WORKER_CONCURRENCY: parseInt(process.env.WORKER_CONCURRENCY || '5', 10),
  EMAIL_RATE_LIMIT_MAX: parseInt(process.env.EMAIL_RATE_LIMIT_MAX || '10', 10),
  EMAIL_RATE_LIMIT_DURATION_MS: parseInt(process.env.EMAIL_RATE_LIMIT_DURATION_MS || '1000', 10),
  ETHEREAL_USER: process.env.ETHEREAL_USER || '',
  ETHEREAL_PASS: process.env.ETHEREAL_PASS || '',
  // Optional Real SMTP (e.g. Gmail) for sending to actual inboxes
  SMTP_SERVICE: process.env.SMTP_SERVICE || '',
  SMTP_HOST: process.env.SMTP_HOST || '',
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '587', 10),
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  SMTP_FROM: process.env.SMTP_FROM || '',
};

export function assertRuntimeConfiguration(runtime: 'api' | 'worker'): void {
  if (ENV.NODE_ENV !== 'production') return;

  const missing = [
    !process.env.DATABASE_URL && 'DATABASE_URL',
    !process.env.REDIS_URL && 'REDIS_URL',
    runtime === 'api' && !process.env.JWT_SECRET && 'JWT_SECRET',
    runtime === 'api' && !process.env.FRONTEND_URL && !process.env.CLIENT_URL && 'FRONTEND_URL',
    runtime === 'worker' && !process.env.SMTP_USER && 'SMTP_USER',
    runtime === 'worker' && !process.env.SMTP_PASS && 'SMTP_PASS',
  ].filter(Boolean);

  if (missing.length > 0) {
    throw new Error(`Missing required production environment variables: ${missing.join(', ')}`);
  }
}
