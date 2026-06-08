import apiClient from '@/api/apiClient';

export interface UserItem {
  userid: number;
  username: string;
  fullname: string;
  email?: string;
  phone?: string;
  roleid?: number;
  rolename?: string;
  isactive?: boolean;
  createdat?: string;
  role?: { roleid: number; rolename: string };
}

export const employeeRoles = [
  { id: 1, name: 'Admin', label: 'Quản trị viên' },
  { id: 4, name: 'Manager', label: 'Quản lý cửa hàng' },
  { id: 5, name: 'Sales', label: 'Nhân viên bán hàng' },
  { id: 6, name: 'Warehouse', label: 'Nhân viên kho' },
  { id: 7, name: 'Warranty', label: 'Nhân viên bảo hành' },
  { id: 8, name: 'Content', label: 'Nhân viên nội dung' },
  { id: 9, name: 'Consultant', label: 'Nhân viên tư vấn AI' },
] as const;

export const roleNamesById: Record<number, string> = {
  1: 'Admin',
  2: 'Staff',
  3: 'Customer',
  4: 'Manager',
  5: 'Sales',
  6: 'Warehouse',
  7: 'Warranty',
  8: 'Content',
  9: 'Consultant',
};

export const roleLabels: Record<string, string> = {
  Admin: 'Quản trị viên',
  Staff: 'Nhân viên (quyền cũ)',
  Customer: 'Khách hàng',
  Manager: 'Quản lý cửa hàng',
  Sales: 'Nhân viên bán hàng',
  Warehouse: 'Nhân viên kho',
  Warranty: 'Nhân viên bảo hành',
  Content: 'Nhân viên nội dung',
  Consultant: 'Nhân viên tư vấn AI',
};

export const usersApi = {
  getAll: () => apiClient.get<UserItem[]>('/Users'),
  getById: (id: number) => apiClient.get<UserItem>(`/Users/${id}`),
  create: (data: Partial<UserItem> & { passwordhash?: string }) => {
    const { passwordhash, ...user } = data;
    return apiClient.post<UserItem>('/Users', { ...user, password: passwordhash });
  },
  update: (id: number, data: Partial<UserItem>) =>
    apiClient.put(`/Users/${id}`, { ...data, userid: id }),
  delete: (id: number) => apiClient.delete(`/Users/${id}`),
  toggleActive: (id: number) => apiClient.patch(`/Users/${id}/toggle-active`, {}),
};
