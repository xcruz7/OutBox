import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/responseHandler.js';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void {
  console.error('[Error Middleware]', err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  sendError(res, message, statusCode, err.errors || null);
}
