import apiClient from '@/api/apiClient';

export interface Product {
  productid: number;
  productname: string;
  description?: string;
  brandid?: number;
  categoryid?: number;
  seriesid?: number;
  createdat?: string;
  brand?: { id: number; name: string };
  category?: { id: number; name: string };
  series?: { id: number; name: string };
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
  stockquantity?: number;
}

export interface ReviewSummary {
  avgRating: number;
  totalReviews: number;
  star5: number;
  star4: number;
  star3: number;
  star2: number;
  star1: number;
}

export interface VariantAttributeValue {
  valueid: number;
  valuename: string;
  attributename: string;
}

export interface FullProductVariant extends ProductVariant {
  condition?: { conditionid: number; conditionname: string };
  attributes?: VariantAttributeValue[];
}

export interface FullProductDetail extends Product {
  productvariants?: FullProductVariant[];
  reviewSummary?: ReviewSummary;
  relatedProducts?: Product[];
}

export interface CreateVariantSpec {
  key: string;
  value: string;
}

export interface CreateProductImage {
  imageurl: string;
  ismain: boolean;
}

export interface UploadedProductImage {
  fileName: string;
  url: string;
  size: number;
}

export interface CreateFullProductVariant {
  condition?: string;
  sku: string;
  baseprice: number;
  saleprice?: number;
  specs?: CreateVariantSpec[];
  images: CreateProductImage[];
  quantity?: number;
}

export interface CreateFullProduct {
  productname: string;
  description?: string;
  categoryid?: number;
  brandid?: number;
  seriesid?: number;
  variants?: CreateFullProductVariant[];
}

export interface UpdateFullProductVariant extends CreateFullProductVariant {
  variantid?: number;
  quantity: number;
}

export interface UpdateFullProduct {
  productname: string;
  description?: string;
  categoryid?: number;
  brandid?: number;
  seriesid?: number;
  variants: UpdateFullProductVariant[];
}

export const productsApi = {
  getAll: () => apiClient.get<Product[]>('/Products'),
  getById: (id: number) => apiClient.get<Product>(`/Products/${id}`),
  getFullDetail: (id: number) => apiClient.get<FullProductDetail>(`/Products/${id}/full-detail`),
  search: (params: { q?: string; categoryId?: number; brandId?: number; seriesId?: number; minPrice?: number; maxPrice?: number }) =>
    apiClient.get<Product[]>('/Products/search', { params }),
  create: (data: Partial<Product>) => apiClient.post<Product>('/Products', data),
  createFull: (data: CreateFullProduct) => apiClient.post<Product>('/Products/full', data),
  updateFull: (id: number, data: UpdateFullProduct) => apiClient.put(`/Products/${id}/full`, data),
  uploadImages: (files: File[]) => {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    return apiClient.post<UploadedProductImage[]>('/ProductImages/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60_000,
    });
  },
  deleteUploadedImage: (fileName: string) =>
    apiClient.delete(`/ProductImages/uploaded/${encodeURIComponent(fileName)}`),
  update: (id: number, data: Partial<Product>) => apiClient.put(`/Products/${id}`, data),
  delete: (id: number) => apiClient.delete(`/Products/${id}`),
};
