import apiClient from '@/api/apiClient';

export interface Slider {
  sliderid: number;
  title: string;
  imageurl: string;
  linkurl?: string;
  displayorder?: number;
  isactive?: boolean;
}

export interface CreateSliderRequest {
  title: string;
  imageurl: string;
  linkurl?: string;
  displayorder?: number;
  isactive?: boolean;
}

export interface UpdateSliderRequest {
  title: string;
  imageurl: string;
  linkurl?: string;
  displayorder?: number;
  isactive?: boolean;
}

export const slidersApi = {
  getAll: async (): Promise<Slider[]> => {
    const { data } = await apiClient.get('/api/sliders');
    return data;
  },

  getActive: async (): Promise<Slider[]> => {
    const { data } = await apiClient.get('/api/sliders/active');
    return data;
  },

  getById: async (id: number): Promise<Slider> => {
    const { data } = await apiClient.get(`/api/sliders/${id}`);
    return data;
  },

  create: async (payload: CreateSliderRequest): Promise<Slider> => {
    const { data } = await apiClient.post('/api/sliders', payload);
    return data;
  },

  update: async (id: number, payload: UpdateSliderRequest): Promise<Slider> => {
    const { data } = await apiClient.put(`/api/sliders/${id}`, payload);
    return data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/sliders/${id}`);
  },
};
