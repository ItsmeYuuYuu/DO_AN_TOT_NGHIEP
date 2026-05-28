import apiClient from '@/api/apiClient';

export interface Banner {
  bannerid: number;
  imageurl: string;
  linkurl?: string;
  position?: string;
  isactive?: boolean;
}

export interface CreateBannerRequest {
  imageurl: string;
  linkurl?: string;
  position?: string;
  isactive?: boolean;
}

export interface UpdateBannerRequest {
  imageurl: string;
  linkurl?: string;
  position?: string;
  isactive?: boolean;
}

export const bannersApi = {
  getAll: async (): Promise<Banner[]> => {
    const { data } = await apiClient.get('/api/banners');
    return data;
  },

  getActive: async (): Promise<Banner[]> => {
    const { data } = await apiClient.get('/api/banners/active');
    return data;
  },

  getById: async (id: number): Promise<Banner> => {
    const { data } = await apiClient.get(`/api/banners/${id}`);
    return data;
  },

  create: async (payload: CreateBannerRequest): Promise<Banner> => {
    const { data } = await apiClient.post('/api/banners', payload);
    return data;
  },

  update: async (id: number, payload: UpdateBannerRequest): Promise<Banner> => {
    const { data } = await apiClient.put(`/api/banners/${id}`, payload);
    return data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/banners/${id}`);
  },
};
