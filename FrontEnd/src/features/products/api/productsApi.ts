import apiClient from '@/api/apiClient';

export interface Product {
  productid: number;
  productname: string;
  description?: string;
  brandid?: number;
  categoryid?: number;
  createdat?: string;
  brand?: { brandid: number; brandname: string };
  category?: { categoryid: number; categoryname: string };
  productvariants?: ProductVariant[];
}

export interface ProductVariant {
  variantid: number;
  productid: number;
  sku: string;
  baseprice: number;
  saleprice?: number;
  conditionid?: number;
  productimages?: { imageid: number; imageurl: string; ismain: boolean }[];
}

export const productsApi = {
  getAll: () => apiClient.get<Product[]>('/Products'),
  getById: (id: number) => apiClient.get<Product>(`/Products/${id}`),
  create: (data: Partial<Product>) => apiClient.post<Product>('/Products', data),
  update: (id: number, data: Partial<Product>) => apiClient.put(`/Products/${id}`, data),
  delete: (id: number) => apiClient.delete(`/Products/${id}`),
};
