import apiClient from '@/api/apiClient';

export interface PromotionalContent {
  contentid: number;
  contenttype: string;
  title?: string;
  imageurl: string;
  linkurl?: string;
  displayorder?: number;
  isactive?: boolean;
  createdat?: string;
}

export interface CreatePromotionalContentRequest {
  contenttype: string;
  title?: string;
  imageurl: string;
  linkurl?: string;
  displayorder?: number;
  isactive?: boolean;
}

export interface UpdatePromotionalContentRequest {
  contenttype: string;
  title?: string;
  imageurl: string;
  linkurl?: string;
  displayorder?: number;
  isactive?: boolean;
}

export const promotionsApi = {
  getAll: async (type?: string): Promise<PromotionalContent[]> => {
    const params = type ? { type } : undefined;
    const { data } = await apiClient.get<PromotionalContent[]>('/PromotionalContents', { params });
    return data;
  },

  getActive: async (type?: string): Promise<PromotionalContent[]> => {
    const params = type ? { type } : undefined;
    const { data } = await apiClient.get<PromotionalContent[]>('/PromotionalContents/active', { params });
    return data;
  },

  getById: async (id: number): Promise<PromotionalContent> => {
    const { data } = await apiClient.get<PromotionalContent>(`/PromotionalContents/${id}`);
    return data;
  },

  create: async (payload: CreatePromotionalContentRequest): Promise<PromotionalContent> => {
    const { data } = await apiClient.post<PromotionalContent>('/PromotionalContents', payload);
    return data;
  },

  update: async (id: number, payload: UpdatePromotionalContentRequest): Promise<PromotionalContent> => {
    const { data } = await apiClient.put<PromotionalContent>(`/PromotionalContents/${id}`, payload);
    return data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/PromotionalContents/${id}`);
  },
};
