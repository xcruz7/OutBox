import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticatedRequest, JwtPayload } from '../types/index.js';
import { ENV } from '../config/env.js';
import { sendError } from '../utils/responseHandler.js';

export function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      sendError(res, 'Authentication token missing or invalid', 401);
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, ENV.JWT_SECRET) as JwtPayload;

    req.user = decoded;
    next();
  } catch (error) {
    sendError(res, 'Unauthorized: Invalid or expired token', 401);
  }
}
