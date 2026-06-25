import apiClient from '@/api/apiClient';

export interface News {
  postid: number;
  title: string;
  slug?: string;
  summary?: string;
  content?: string;
  thumbnail?: string;
  userid?: number;
  createdat?: string;
  isactive?: boolean;
  authorName?: string;
}

export interface CreateNewsRequest {
  title: string;
  summary?: string;
  content?: string;
  thumbnail?: string;
  isactive?: boolean;
}

export interface UpdateNewsRequest {
  title: string;
  summary?: string;
  content?: string;
  thumbnail?: string;
  isactive?: boolean;
}

export const newsApi = {
  getAll: async (): Promise<News[]> => {
    const { data } = await apiClient.get<News[]>('/news');
    return data;
  },

  getActive: async (): Promise<News[]> => {
    const { data } = await apiClient.get<News[]>('/news/active');
    return data;
  },

  getById: async (id: number): Promise<News> => {
    const { data } = await apiClient.get<News>(`/news/${id}`);
    return data;
  },

  getBySlug: async (slug: string): Promise<News> => {
    const { data } = await apiClient.get<News>(`/news/by-slug/${slug}`);
    return data;
  },

  create: async (payload: CreateNewsRequest): Promise<News> => {
    const { data } = await apiClient.post<News>('/news', payload);
    return data;
  },

  update: async (id: number, payload: UpdateNewsRequest): Promise<News> => {
    const { data } = await apiClient.put<News>(`/news/${id}`, payload);
    return data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/news/${id}`);
  },
};
