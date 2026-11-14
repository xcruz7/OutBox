import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database.js';
import { ENV } from '../config/env.js';
import { JwtPayload } from '../types/index.js';

export async function registerUser(email: string, password: string, name: string) {
  const normalizedEmail = email.trim().toLowerCase();

  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existingUser) {
    const error = new Error('A user with this email already exists.');
    (error as any).statusCode = 400;
    throw error;
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      passwordHash,
      name: name.trim(),
    },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
    },
  });

  const token = jwt.sign(
    { userId: user.id, email: user.email } as JwtPayload,
    ENV.JWT_SECRET,
    { expiresIn: ENV.JWT_EXPIRES_IN as any }
  );

  return { user, token };
}

export async function loginUser(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user) {
    const error = new Error('Invalid email or password.');
    (error as any).statusCode = 401;
    throw error;
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    const error = new Error('Invalid email or password.');
    (error as any).statusCode = 401;
    throw error;
  }

  const token = jwt.sign(
    { userId: user.id, email: user.email } as JwtPayload,
    ENV.JWT_SECRET,
    { expiresIn: ENV.JWT_EXPIRES_IN as any }
  );

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
    },
    token,
  };
}
