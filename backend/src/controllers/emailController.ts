import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import {
  scheduleEmail,
  getScheduledEmails,
  getSentEmails,
  getEmailById,
  cancelScheduledEmail,
} from '../services/emailService.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';

export async function createScheduledEmail(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { recipient, subject, body, scheduledAt } = req.body;

    if (!recipient || !subject || !body || !scheduledAt) {
      sendError(res, 'All fields (recipient, subject, body, scheduledAt) are required', 400);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipient)) {
      sendError(res, 'Invalid recipient email address format', 400);
      return;
    }

    const email = await scheduleEmail(userId, {
      recipient,
      subject,
      body,
      scheduledAt,
    });

    sendSuccess(res, email, 'Email scheduled successfully', 201);
  } catch (error) {
    next(error);
  }
}

export async function listScheduledEmails(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const emails = await getScheduledEmails(userId);
    sendSuccess(res, emails, 'Scheduled emails retrieved');
  } catch (error) {
    next(error);
  }
}

export async function listSentEmails(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const emails = await getSentEmails(userId);
    sendSuccess(res, emails, 'Sent emails retrieved');
  } catch (error) {
    next(error);
  }
}

export async function getEmailDetails(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const emailId = req.params.id;
    const email = await getEmailById(userId, emailId);
    sendSuccess(res, email, 'Email details retrieved');
  } catch (error) {
    next(error);
  }
}

export async function cancelEmail(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const emailId = req.params.id;
    const email = await cancelScheduledEmail(userId, emailId);
    sendSuccess(res, email, 'Scheduled email cancelled successfully');
  } catch (error) {
    next(error);
  }
}
