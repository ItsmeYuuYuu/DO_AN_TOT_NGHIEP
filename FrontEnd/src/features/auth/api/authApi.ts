import apiClient from '@/api/apiClient';

export const authApi = {
  login: (username: string, password: string) =>
    apiClient.post('/auth/login', { username, password }),
  logout: () => apiClient.post('/auth/logout'),
  me: () => apiClient.get('/auth/me'),
};
