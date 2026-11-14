import { Request, Response, NextFunction } from 'express';
import { registerUser, loginUser } from '../services/authService.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';
import { AuthenticatedRequest } from '../types/index.js';
import { prisma } from '../config/database.js';

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      sendError(res, 'Name, email, and password are required', 400);
      return;
    }

    if (password.length < 6) {
      sendError(res, 'Password must be at least 6 characters long', 400);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      sendError(res, 'Please provide a valid email address', 400);
      return;
    }

    const result = await registerUser(email, password, name);
    sendSuccess(res, result, 'User registered successfully', 201);
  } catch (error) {
    next(error);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      sendError(res, 'Email and password are required', 400);
      return;
    }

    const result = await loginUser(email, password);
    sendSuccess(res, result, 'Login successful', 200);
  } catch (error) {
    next(error);
  }
}

export async function getProfile(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      sendError(res, 'Unauthorized', 401);
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });

    if (!user) {
      sendError(res, 'User not found', 404);
      return;
    }

    sendSuccess(res, user, 'Profile retrieved');
  } catch (error) {
    next(error);
  }
}
