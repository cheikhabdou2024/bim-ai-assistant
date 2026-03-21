import apiClient from '../../../shared/api/axios.client';
import { LoginResponse, RegisterResponse } from '../types/auth.types';

export const authApi = {
  register: (data: { name: string; email: string; password: string }) =>
    apiClient.post<RegisterResponse>('/auth/register', data).then((r) => r.data),

  login: (data: { email: string; password: string }) =>
    apiClient.post<LoginResponse>('/auth/login', data).then((r) => r.data),

  logout: () =>
    apiClient.post('/auth/logout').then((r) => r.data),

  refresh: () =>
    apiClient.post<{ accessToken: string }>('/auth/refresh').then((r) => r.data),

  me: () =>
    apiClient.get('/users/me').then((r) => r.data),
};
