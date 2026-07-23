import apiClient from '@/api/apiClient';

export interface RegisterRequest {
  username: string;
  password: string;
  fullname: string;
  email: string;
  phone: string;
  verificationCode?: string;
}

export const authApi = {
  login: (username: string, password: string) =>
    apiClient.post('/auth/login', { username, password }),
  requestRegistrationCode: (email: string) => apiClient.post('/auth/registration-code', { email }),
  register: (data: RegisterRequest) => apiClient.post('/auth/register', data),
  forgotPassword: (email: string) => apiClient.post('/auth/forgot-password', { email }),
  resetPassword: (data: { email: string; verificationCode: string; newPassword: string; confirmPassword: string }) =>
    apiClient.post('/auth/reset-password', data),
  logout: () => apiClient.post('/auth/logout'),
  me: () => apiClient.get('/auth/me'),
};
