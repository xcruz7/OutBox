import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import {
  scheduleEmail,
  scheduleBulkEmails,
  getScheduledEmails,
  getSentEmails,
  getEmailById,
  cancelScheduledEmail,
} from '../services/emailService.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_BULK_RECIPIENTS = 500;

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

    if (!EMAIL_REGEX.test(recipient)) {
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

export async function createBulkScheduledEmails(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { recipients, subject, body, scheduledAt } = req.body;

    if (!Array.isArray(recipients) || recipients.length === 0) {
      sendError(res, 'At least one recipient email address is required', 400);
      return;
    }

    if (recipients.length > MAX_BULK_RECIPIENTS) {
      sendError(res, `A recipient file can contain at most ${MAX_BULK_RECIPIENTS} email addresses`, 400);
      return;
    }

    if (
      typeof subject !== 'string' ||
      typeof body !== 'string' ||
      typeof scheduledAt !== 'string' ||
      !subject.trim() ||
      !body.trim() ||
      !scheduledAt
    ) {
      sendError(res, 'All fields (recipients, subject, body, scheduledAt) are required', 400);
      return;
    }

    const normalizedInput = recipients
      .filter((recipient): recipient is string => typeof recipient === 'string')
      .map((recipient) => recipient.trim().toLowerCase())
      .filter(Boolean);

    if (normalizedInput.length !== recipients.length) {
      sendError(res, 'Each recipient must be a non-empty email address', 400);
      return;
    }

    const normalizedRecipients = [...new Set(normalizedInput)];

    const invalidRecipients = normalizedRecipients.filter((recipient) => !EMAIL_REGEX.test(recipient));
    if (invalidRecipients.length > 0) {
      sendError(res, 'The uploaded file contains invalid email address(es)', 400, invalidRecipients.slice(0, 10));
      return;
    }

    const emails = await scheduleBulkEmails(userId, {
      recipients: normalizedRecipients,
      subject,
      body,
      scheduledAt,
    });

    sendSuccess(
      res,
      {
        emails,
        count: emails.length,
        scheduledCount: emails.length,
        skippedDuplicates: normalizedInput.length - normalizedRecipients.length,
      },
      `${emails.length} email${emails.length === 1 ? '' : 's'} scheduled successfully`,
      201
    );
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
