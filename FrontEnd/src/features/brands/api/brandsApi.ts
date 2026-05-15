import apiClient from '@/api/apiClient';

export interface Brand {
  brandid: number;
  brandname: string;
  products?: unknown[];
}

export const brandsApi = {
  getAll: () => apiClient.get<Brand[]>('/Brands'),
  getById: (id: number) => apiClient.get<Brand>(`/Brands/${id}`),
  create: (data: Omit<Brand, 'brandid' | 'products'>) =>
    apiClient.post<Brand>('/Brands', data),
  update: (id: number, data: Partial<Brand>) =>
    apiClient.put(`/Brands/${id}`, { ...data, brandid: id }),
  delete: (id: number) => apiClient.delete(`/Brands/${id}`),
};
