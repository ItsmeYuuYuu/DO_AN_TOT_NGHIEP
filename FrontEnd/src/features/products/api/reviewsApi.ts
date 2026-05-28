import apiClient from '@/api/apiClient';

export interface Review {
  reviewid: number;
  variantid?: number;
  customerid?: number;
  rating?: number;
  comment?: string;
  createdat?: string;
  customerName?: string;
  variantSku?: string;
}

export interface CreateReviewRequest {
  variantid?: number;
  rating: number;
  comment?: string;
}

export interface UpdateReviewRequest {
  rating: number;
  comment?: string;
}

export const reviewsApi = {
  getAll: async (): Promise<Review[]> => {
    const { data } = await apiClient.get('/api/reviews');
    return data;
  },

  getByVariant: async (variantId: number): Promise<Review[]> => {
    const { data } = await apiClient.get(`/api/reviews/variant/${variantId}`);
    return data;
  },

  getMyReviews: async (): Promise<Review[]> => {
    const { data } = await apiClient.get('/api/reviews/me');
    return data;
  },

  create: async (payload: CreateReviewRequest): Promise<Review> => {
    const { data } = await apiClient.post('/api/reviews', payload);
    return data;
  },

  update: async (id: number, payload: UpdateReviewRequest): Promise<Review> => {
    const { data } = await apiClient.put(`/api/reviews/${id}`, payload);
    return data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/reviews/${id}`);
  },
};
