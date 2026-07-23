import apiClient from '@/api/apiClient';
import type { Product } from '@/features/products/api/productsApi';

export interface HomepageProductSectionItem {
  itemid: number;
  sectionid: number;
  productid: number;
  displayorder?: number;
  isactive?: boolean;
  createdat?: string;
  product?: Product;
}

export interface HomepageProductSection {
  sectionid: number;
  sectionkey: string;
  title: string;
  subtitle?: string;
  theme: 'Red' | 'LightBlue' | string;
  displayorder?: number;
  isactive?: boolean;
  createdat?: string;
  items: HomepageProductSectionItem[];
}

export interface UpdateHomepageProductSection {
  title: string;
  subtitle?: string;
  theme: string;
  displayorder?: number;
  isactive?: boolean;
  items: Array<{
    productid: number;
    displayorder?: number;
    isactive?: boolean;
  }>;
}

export interface HomepageProductMetric {
  productid: number;
  soldquantity: number;
}

export const homepageSectionsApi = {
  getActive: async (): Promise<HomepageProductSection[]> => {
    const { data } = await apiClient.get<HomepageProductSection[]>('/HomepageProductSections/active');
    return data;
  },
  getAll: async (): Promise<HomepageProductSection[]> => {
    const { data } = await apiClient.get<HomepageProductSection[]>('/HomepageProductSections');
    return data;
  },
  getProductMetrics: async (): Promise<HomepageProductMetric[]> => {
    const { data } = await apiClient.get<HomepageProductMetric[]>('/HomepageProductSections/product-metrics');
    return data;
  },
  update: async (sectionId: number, payload: UpdateHomepageProductSection): Promise<void> => {
    await apiClient.put(`/HomepageProductSections/${sectionId}`, payload);
  },
};
