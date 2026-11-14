import { Request } from 'express';

export interface JwtPayload {
  userId: string;
  email: string;
}

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

export type EmailStatusType =
  | 'PENDING'
  | 'SCHEDULED'
  | 'PROCESSING'
  | 'SENT'
  | 'FAILED'
  | 'CANCELLED';

export interface ScheduleEmailInput {
  recipient: string;
  subject: string;
  body: string;
  scheduledAt: string; // ISO 8601 string
}

export interface SendEmailJobData {
  emailId: string;
  userId: string;
}
