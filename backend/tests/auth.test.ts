import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ENV } from '../src/config/env.js';

describe('Authentication & Security Unit Tests', () => {
  const testPassword = 'StrongPassword123!';

  it('should securely hash a password using bcrypt', async () => {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(testPassword, salt);

    expect(hash).not.toBe(testPassword);
    expect(hash.startsWith('$2a$') || hash.startsWith('$2b$')).toBe(true);

    const matches = await bcrypt.compare(testPassword, hash);
    expect(matches).toBe(true);

    const wrongMatches = await bcrypt.compare('WrongPassword', hash);
    expect(wrongMatches).toBe(false);
  });

  it('should generate and verify signed JWT tokens', () => {
    const payload = { userId: 'user-uuid-1234', email: 'test@outboxlabs.com' };
    const token = jwt.sign(payload, ENV.JWT_SECRET, { expiresIn: '1h' });

    expect(typeof token).toBe('string');
    expect(token.split('.').length).toBe(3);

    const decoded = jwt.verify(token, ENV.JWT_SECRET) as any;
    expect(decoded.userId).toBe(payload.userId);
    expect(decoded.email).toBe(payload.email);
  });

  it('should reject invalid or tampered JWT tokens', () => {
    const payload = { userId: 'user-uuid-1234' };
    const token = jwt.sign(payload, 'different-secret-key');

    expect(() => {
      jwt.verify(token, ENV.JWT_SECRET);
    }).toThrow();
  });
});
