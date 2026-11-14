import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import { getDashboardMetrics } from '../services/emailService.js';
import { sendSuccess } from '../utils/responseHandler.js';

export async function getDashboardStats(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const stats = await getDashboardMetrics(userId);
    sendSuccess(res, stats, 'Dashboard metrics retrieved');
  } catch (error) {
    next(error);
  }
}
