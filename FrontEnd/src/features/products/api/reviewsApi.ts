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
  productName?: string;
  customerEmail?: string;
  customerPhone?: string;
}

export interface ReviewSummary {
  total: number;
  fiveStar: number;
  fourStar: number;
  threeStar: number;
  lowStar: number;
  averageRating: number;
}

export interface ReviewPage {
  items: Review[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
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
    const { data } = await apiClient.get('/reviews');
    return data;
  },

  getSummary: async (): Promise<ReviewSummary> => {
    const { data } = await apiClient.get('/reviews/summary');
    return data;
  },

  getAdminReviews: async (params: {
    query?: string;
    rating?: number;
    page?: number;
    pageSize?: number;
  }): Promise<ReviewPage> => {
    const { data } = await apiClient.get('/reviews/admin', { params });
    return data;
  },

  getByVariant: async (variantId: number): Promise<Review[]> => {
    const { data } = await apiClient.get(`/reviews/variant/${variantId}`);
    return data;
  },

  getByProduct: async (productId: number): Promise<Review[]> => {
    const { data } = await apiClient.get(`/reviews/product/${productId}`);
    return data;
  },

  getMyReviews: async (): Promise<Review[]> => {
    const { data } = await apiClient.get('/reviews/me');
    return data;
  },

  create: async (payload: CreateReviewRequest): Promise<Review> => {
    const { data } = await apiClient.post('/reviews', payload);
    return data;
  },

  update: async (id: number, payload: UpdateReviewRequest): Promise<Review> => {
    const { data } = await apiClient.put(`/reviews/${id}`, payload);
    return data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/reviews/${id}`);
  },
};
