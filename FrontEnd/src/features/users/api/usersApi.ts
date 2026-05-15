import apiClient from '@/api/apiClient';

export interface UserItem {
  userid: number;
  username: string;
  fullname: string;
  email?: string;
  phone?: string;
  roleid?: number;
  isactive?: boolean;
  createdat?: string;
  role?: { roleid: number; rolename: string };
}

export const usersApi = {
  getAll: () => apiClient.get<UserItem[]>('/Users'),
  getById: (id: number) => apiClient.get<UserItem>(`/Users/${id}`),
  create: (data: Partial<UserItem>) => apiClient.post<UserItem>('/Users', data),
  update: (id: number, data: Partial<UserItem>) =>
    apiClient.put(`/Users/${id}`, { ...data, userid: id }),
  delete: (id: number) => apiClient.delete(`/Users/${id}`),
  toggleActive: (id: number) => apiClient.patch(`/Users/${id}/toggle-active`, {}),
};
