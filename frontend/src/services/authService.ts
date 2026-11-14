import { api } from './api.js';
import { User } from '../types/index.js';

interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    token: string;
  };
}

export async function login(email: string, password: string) {
  const response = await api.post<AuthResponse>('/auth/login', { email, password });
  return response.data.data;
}

export async function register(email: string, password: string, name: string) {
  const response = await api.post<AuthResponse>('/auth/register', { email, password, name });
  return response.data.data;
}

export async function getProfile() {
  const response = await api.get<{ success: boolean; data: User }>('/auth/profile');
  return response.data.data;
}
