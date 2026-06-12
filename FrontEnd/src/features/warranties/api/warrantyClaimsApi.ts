import apiClient from '@/api/apiClient';

export interface WarrantyClaimHistory {
  historyid: number;
  userid?: number;
  username?: string;
  fromstatus?: string;
  tostatus: string;
  note?: string;
  createdat: string;
}

export interface WarrantyClaim {
  claimid: number;
  imei: string;
  customerid: number;
  customername: string;
  customerphone: string;
  productname?: string;
  variantsku?: string;
  assigneduserid?: number;
  assignedusername?: string;
  faultdescription: string;
  status: string;
  coverage: string;
  imageurls: string[];
  estimatedcost?: number;
  finalcost?: number;
  conclusion?: string;
  receivedat: string;
  completedat?: string;
  createdat: string;
  updatedat: string;
  histories: WarrantyClaimHistory[];
}

export interface WarrantyEmployee {
  userid: number;
  fullname: string;
  role: string;
}

export interface WarrantyImageUpload {
  fileName: string;
  url: string;
  size: number;
}

export const warrantyClaimsApi = {
  getAll: (status?: string) =>
    apiClient.get<WarrantyClaim[]>('/WarrantyClaims', {
      params: status ? { status } : undefined,
    }),
  create: (payload: { imei: string; faultdescription: string; imageurls: string[] }) =>
    apiClient.post<WarrantyClaim>('/WarrantyClaims', payload),
  claim: (claimId: number) =>
    apiClient.post<WarrantyClaim>(`/WarrantyClaims/${claimId}/claim`),
  assign: (claimId: number, assigneduserid: number, note?: string) =>
    apiClient.patch<WarrantyClaim>(`/WarrantyClaims/${claimId}/assign`, {
      assigneduserid,
      note,
    }),
  updateStatus: (
    claimId: number,
    payload: {
      status: string;
      estimatedcost?: number;
      finalcost?: number;
      conclusion?: string;
      note?: string;
    },
  ) => apiClient.patch<WarrantyClaim>(`/WarrantyClaims/${claimId}/status`, payload),
  getEmployees: () =>
    apiClient.get<WarrantyEmployee[]>('/WarrantyClaims/employees'),
  uploadImages: (files: File[]) => {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    return apiClient.post<WarrantyImageUpload[]>('/WarrantyImages/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
