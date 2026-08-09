import apiClient from '@/api/apiClient';

export interface UserItem {
  userid: number;
  username: string;
  fullname: string;
  email?: string;
  phone?: string;
  roleid?: number;
  rolename?: string;
  roleids?: number[];
  rolenames?: string[];
  permissions?: string[];
  isactive?: boolean;
  createdat?: string;
  createdbyuserid?: number | null;
  createdbyname?: string | null;
}

export interface RoleItem {
  roleid: number;
  rolename: string;
  permissions: string[];
}

export interface PermissionItem {
  permissionid: number;
  code: string;
  name: string;
  groupname: string;
  description?: string;
}

export interface UserPage {
  items: UserItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface UserListParams {
  query?: string;
  roleId?: number;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
}

export const usersApi = {
  getAll: (params?: UserListParams, signal?: AbortSignal) =>
    apiClient.get<UserPage>('/Users', { params, signal }),
  getById: (id: number) => apiClient.get<UserItem>(`/Users/${id}`),
  create: (data: Partial<UserItem> & { passwordhash?: string }) => {
    const { passwordhash, ...user } = data;
    return apiClient.post<UserItem>('/Users', { ...user, password: passwordhash });
  },
  update: (id: number, data: Partial<UserItem>) =>
    apiClient.put<UserItem>(`/Users/${id}`, { ...data, userid: id }),
  toggleActive: (id: number) => apiClient.patch(`/Users/${id}/toggle-active`, {}),
};

export const rolesApi = {
  getAll: () => apiClient.get<RoleItem[]>('/Roles'),
  getPermissions: () => apiClient.get<PermissionItem[]>('/Roles/permissions'),
  create: (data: { rolename: string; permissions: string[] }) => apiClient.post<RoleItem>('/Roles', data),
  update: (id: number, data: { rolename: string; permissions: string[] }) => apiClient.put<RoleItem>(`/Roles/${id}`, data),
  delete: (id: number) => apiClient.delete(`/Roles/${id}`),
};
