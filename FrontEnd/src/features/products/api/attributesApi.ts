import apiClient from '@/api/apiClient';

export interface AttributeValue {
  valueid: number;
  attributeid?: number;
  valuename: string;
  attributename?: string;
}

export const attributesApi = {
  // Variant Assignments
  getVariantAttributes: async (variantId: number): Promise<AttributeValue[]> => {
    const res = await apiClient.get<AttributeValue[]>(`/ProductVariants/${variantId}/attributes`);
    return res.data;
  },
  assignVariantAttributes: async (variantId: number, specs: { key: string; value: string }[]): Promise<void> => {
    await apiClient.put(`/ProductVariants/${variantId}/attributes`, specs);
  }
};
