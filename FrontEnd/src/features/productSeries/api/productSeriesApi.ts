import apiClient from '@/api/apiClient';

export interface ProductSeries {
  seriesid: number;
  brandid: number;
  brandname: string;
  seriesname: string;
  displayorder: number;
  isactive: boolean;
  productcount: number;
}

export interface CreateProductSeriesRequest {
  brandid: number;
  seriesname: string;
  displayorder?: number;
  isactive?: boolean;
}

export const productSeriesApi = {
  getAll: (params?: { brandId?: number; activeOnly?: boolean }) =>
    apiClient.get<ProductSeries[]>('/ProductSeries', { params }),
  getById: (id: number) => apiClient.get<ProductSeries>(`/ProductSeries/${id}`),
  create: (data: CreateProductSeriesRequest) =>
    apiClient.post<ProductSeries>('/ProductSeries', data),
  update: (id: number, data: CreateProductSeriesRequest) =>
    apiClient.put<ProductSeries>(`/ProductSeries/${id}`, data),
  delete: (id: number) => apiClient.delete(`/ProductSeries/${id}`),
};
