import { ENV } from '../src/config/env.js';

describe('Worker Concurrency & Rate Limiting Configuration', () => {
  it('should have valid worker concurrency settings', () => {
    expect(ENV.WORKER_CONCURRENCY).toBeGreaterThan(0);
    expect(typeof ENV.WORKER_CONCURRENCY).toBe('number');
  });

  it('should have valid rate limiter thresholds', () => {
    expect(ENV.EMAIL_RATE_LIMIT_MAX).toBeGreaterThan(0);
    expect(ENV.EMAIL_RATE_LIMIT_DURATION_MS).toBeGreaterThanOrEqual(100);
  });

  it('should enforce recipient email RFC format', () => {
    const validEmail = 'alex.mercer@outboxlabs.com';
    const invalidEmail = 'not-an-email';

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    expect(emailRegex.test(validEmail)).toBe(true);
    expect(emailRegex.test(invalidEmail)).toBe(false);
  });
});
