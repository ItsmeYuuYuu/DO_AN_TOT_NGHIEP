import apiClient from '@/api/apiClient';

export interface AttributeValue {
  valueid: number;
  attributeid?: number;
  valuename: string;
  attributename?: string;
}

export interface Attribute {
  attributeid: number;
  attributename: string;
  values?: AttributeValue[];
}

export const attributesApi = {
  // Attributes
  getAttributes: async (): Promise<Attribute[]> => {
    const res = await apiClient.get<Attribute[]>('/Attributes');
    return res.data;
  },
  createAttribute: async (attributename: string): Promise<Attribute> => {
    const res = await apiClient.post<Attribute>('/Attributes', { attributename });
    return res.data;
  },
  updateAttribute: async (id: number, attributename: string): Promise<Attribute> => {
    const res = await apiClient.put<Attribute>(`/Attributes/${id}`, { attributename });
    return res.data;
  },
  deleteAttribute: async (id: number): Promise<void> => {
    await apiClient.delete(`/Attributes/${id}`);
  },

  // Attribute Values
  createAttributeValue: async (attributeid: number, valuename: string): Promise<AttributeValue> => {
    const res = await apiClient.post<AttributeValue>('/AttributeValues', { attributeid, valuename });
    return res.data;
  },
  updateAttributeValue: async (id: number, valuename: string): Promise<AttributeValue> => {
    const res = await apiClient.put<AttributeValue>(`/AttributeValues/${id}`, { valuename });
    return res.data;
  },
  deleteAttributeValue: async (id: number): Promise<void> => {
    await apiClient.delete(`/AttributeValues/${id}`);
  },

  // Variant Assignments
  getVariantAttributes: async (variantId: number): Promise<AttributeValue[]> => {
    const res = await apiClient.get<AttributeValue[]>(`/ProductVariants/${variantId}/attributes`);
    return res.data;
  },
  assignVariantAttributes: async (variantId: number, valueIds: number[]): Promise<void> => {
    await apiClient.put(`/ProductVariants/${variantId}/attributes`, { valueIds });
  }
};
