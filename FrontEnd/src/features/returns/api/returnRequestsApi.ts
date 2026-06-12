import apiClient from '@/api/apiClient';

export interface ReturnRequestHistory {
  historyid: number;
  userid?: number;
  userfullname?: string;
  fromstatus?: string;
  tostatus: string;
  note?: string;
  createdat?: string;
}

export interface ReturnItem {
  returnitemid: number;
  orderitemid: number;
  imei: string;
  variantid?: number;
  productname?: string;
  sku?: string;
  condition?: string;
  disposition?: string;
  replacementimei?: string;
  refundamount: number;
}

export interface RefundTransaction {
  refundtransactionid: number;
  amount: number;
  provider: string;
  status: string;
  transactionref?: string;
  processedby?: string;
  processedat?: string;
}

export interface ReturnRequest {
  returnrequestid: number;
  orderid: number;
  customerid?: number;
  customername?: string;
  customerphone?: string;
  requestedbyuserid?: number;
  assigneduserid?: number;
  assigneduser?: string;
  requesttype: 'Return' | 'Exchange';
  reason: string;
  description?: string;
  status: string;
  imageurls: string[];
  reviewnote?: string;
  resolution?: string;
  requestedrefundamount: number;
  refundamount?: number;
  refundstatus: string;
  requestedat?: string;
  reviewedat?: string;
  receivedat?: string;
  completedat?: string;
  updatedat?: string;
  items: ReturnItem[];
  histories: ReturnRequestHistory[];
  refundtransactions: RefundTransaction[];
}

export interface ReturnEmployee {
  userid: number;
  fullname: string;
}

export interface ReturnImageUpload {
  fileName: string;
  url: string;
  size: number;
}

export interface ReceiveReturnItemPayload {
  returnitemid: number;
  condition: string;
  disposition: 'Restock' | 'Warranty' | 'Damaged';
  replacementimei?: string;
  refundamount?: number;
}

export const returnRequestsApi = {
  getAll: (status?: string) =>
    apiClient.get<ReturnRequest[]>('/ReturnRequests', {
      params: status ? { status } : undefined,
    }),
  getMine: () => apiClient.get<ReturnRequest[]>('/ReturnRequests/mine'),
  create: (payload: {
    orderid: number;
    requesttype: 'Return' | 'Exchange';
    reason: string;
    description?: string;
    orderitemids: number[];
    imageurls: string[];
  }) => apiClient.post<ReturnRequest>('/ReturnRequests', payload),
  cancel: (id: number) => apiClient.patch<ReturnRequest>(`/ReturnRequests/${id}/cancel`),
  claim: (id: number) => apiClient.post<ReturnRequest>(`/ReturnRequests/${id}/claim`),
  assign: (id: number, assigneduserid: number, note?: string) =>
    apiClient.patch<ReturnRequest>(`/ReturnRequests/${id}/assign`, { assigneduserid, note }),
  review: (id: number, approved: boolean, note?: string) =>
    apiClient.patch<ReturnRequest>(`/ReturnRequests/${id}/review`, { approved, note }),
  receive: (
    id: number,
    items: ReceiveReturnItemPayload[],
    resolution?: string,
    note?: string,
  ) => apiClient.patch<ReturnRequest>(`/ReturnRequests/${id}/receive`, {
    items,
    resolution,
    note,
  }),
  refund: (
    id: number,
    amount: number,
    provider: string,
    transactionref?: string,
    note?: string,
  ) => apiClient.post<ReturnRequest>(`/ReturnRequests/${id}/refund`, {
    amount,
    provider,
    transactionref,
    note,
  }),
  getEmployees: () => apiClient.get<ReturnEmployee[]>('/ReturnRequests/employees'),
  uploadImages: (files: File[]) => {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    return apiClient.post<ReturnImageUpload[]>('/ReturnImages/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
