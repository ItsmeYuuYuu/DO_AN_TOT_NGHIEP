import apiClient from '@/api/apiClient';

export interface RegisterRequest {
  username: string;
  password: string;
  fullname: string;
  email: string;
  phone: string;
}

export const authApi = {
  login: (username: string, password: string) =>
    apiClient.post('/auth/login', { username, password }),
  register: (data: RegisterRequest) => apiClient.post('/auth/register', data),
  forgotPassword: (email: string) => apiClient.post('/auth/forgot-password', { email }),
  logout: () => apiClient.post('/auth/logout'),
  me: () => apiClient.get('/auth/me'),
};
