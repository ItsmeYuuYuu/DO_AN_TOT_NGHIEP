import apiClient from '@/api/apiClient';

export interface WarrantyPackage {
  packageid: number;
  packagename: string;
  durationmonths: number;
  price: number;
}

export const warrantyPackagesApi = {
  getAll: async (): Promise<WarrantyPackage[]> => {
    const res = await apiClient.get<WarrantyPackage[]>('/WarrantyPackages');
    return res.data;
  },
  getById: async (id: number): Promise<WarrantyPackage> => {
    const res = await apiClient.get<WarrantyPackage>(`/WarrantyPackages/${id}`);
    return res.data;
  },
  create: async (data: Omit<WarrantyPackage, 'packageid'>): Promise<WarrantyPackage> => {
    const res = await apiClient.post<WarrantyPackage>('/WarrantyPackages', data);
    return res.data;
  },
  update: async (id: number, data: Omit<WarrantyPackage, 'packageid'>): Promise<WarrantyPackage> => {
    const res = await apiClient.put<WarrantyPackage>(`/WarrantyPackages/${id}`, data);
    return res.data;
  },
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/WarrantyPackages/${id}`);
  },
};
