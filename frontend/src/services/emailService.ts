import { api } from './api.js';
import {
  BulkScheduleEmailPayload,
  BulkScheduleEmailResult,
  DashboardMetrics,
  Email,
  ScheduleEmailPayload,
} from '../types/index.js';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export async function scheduleEmail(payload: ScheduleEmailPayload) {
  const response = await api.post<ApiResponse<Email>>('/emails/schedule', payload);
  return response.data.data;
}

export async function scheduleEmails(payload: BulkScheduleEmailPayload) {
  const response = await api.post<ApiResponse<BulkScheduleEmailResult>>(
    '/emails/schedule-bulk',
    payload
  );
  return response.data.data;
}

export async function getScheduledEmails() {
  const response = await api.get<ApiResponse<Email[]>>('/emails/scheduled');
  return response.data.data;
}

export async function getSentEmails() {
  const response = await api.get<ApiResponse<Email[]>>('/emails/sent');
  return response.data.data;
}

export async function getEmailDetails(id: string) {
  const response = await api.get<ApiResponse<Email>>(`/emails/${id}`);
  return response.data.data;
}

export async function cancelEmail(id: string) {
  const response = await api.post<ApiResponse<Email>>(`/emails/${id}/cancel`);
  return response.data.data;
}

export async function getDashboardStats() {
  const response = await api.get<ApiResponse<DashboardMetrics>>('/dashboard/stats');
  return response.data.data;
}
