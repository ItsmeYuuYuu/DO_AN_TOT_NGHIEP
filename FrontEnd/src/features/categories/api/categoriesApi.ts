import apiClient from '@/api/apiClient';

export interface Category {
  categoryid: number;
  categoryname: string;
  description?: string;
  productcount?: number;
  products?: unknown[];
}

export const categoriesApi = {
  getAll: () => apiClient.get<Category[]>('/Categories'),
  getById: (id: number) => apiClient.get<Category>(`/Categories/${id}`),
  create: (data: Omit<Category, 'categoryid' | 'products'>) =>
    apiClient.post<Category>('/Categories', data),
  update: (id: number, data: Partial<Category>) =>
    apiClient.put(`/Categories/${id}`, { ...data, categoryid: id }),
  delete: (id: number) => apiClient.delete(`/Categories/${id}`),
};
