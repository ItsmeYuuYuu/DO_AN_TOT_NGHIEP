import apiClient from '@/api/apiClient';

export interface Supplier {
  supplierid: number;
  suppliername: string;
  contactphone?: string;
  address?: string;
}

export type CreateSupplierRequest = Omit<Supplier, 'supplierid'>;
export type UpdateSupplierRequest = Omit<Supplier, 'supplierid'>;

export const suppliersApi = {
  getAll: () => apiClient.get<Supplier[]>('/Suppliers'),
  getById: (id: number) => apiClient.get<Supplier>(`/Suppliers/${id}`),
  create: (data: CreateSupplierRequest) => apiClient.post<Supplier>('/Suppliers', data),
  update: (id: number, data: UpdateSupplierRequest) => apiClient.put<Supplier>(`/Suppliers/${id}`, data),
  delete: (id: number) => apiClient.delete(`/Suppliers/${id}`),
};
