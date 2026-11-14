export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export type EmailStatus =
  | 'PENDING'
  | 'SCHEDULED'
  | 'PROCESSING'
  | 'SENT'
  | 'FAILED'
  | 'CANCELLED';

export interface Email {
  id: string;
  userId: string;
  recipient: string;
  subject: string;
  body: string;
  scheduledAt: string;
  sentAt: string | null;
  status: EmailStatus;
  jobId: string | null;
  attempts: number;
  maxAttempts: number;
  errorMessage: string | null;
  etherealMessageId: string | null;
  etherealPreviewUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardMetrics {
  total: number;
  scheduled: number;
  sent: number;
  failed: number;
  cancelled: number;
  recentActivity: Email[];
}

export interface ScheduleEmailPayload {
  recipient: string;
  subject: string;
  body: string;
  scheduledAt: string;
}
