import apiClient from '@/api/apiClient';

export const authApi = {
  login: (username: string, password: string) =>
    apiClient.post('/auth/login', { username, password }),
  register: (data: any) => apiClient.post('/auth/register', data),
  forgotPassword: (email: string) => apiClient.post('/auth/forgot-password', { email }),
  logout: () => apiClient.post('/auth/logout'),
  me: () => apiClient.get('/auth/me'),
};
