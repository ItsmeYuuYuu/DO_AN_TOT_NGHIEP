import apiClient from '@/api/apiClient';

export interface Order {
  orderid: number;
  customerid?: number;
  userid?: number;
  orderdate?: string;
  orderstatus?: string;
  totalamount?: number;
  discountamount?: number;
  finalamount?: number;
  paymentmethod?: string;
  vouchercode?: string;
  customer?: { customerid: number; fullname: string; phone: string };
  orderitems?: OrderItem[];
}

export interface OrderItem {
  orderitemid: number;
  orderid: number;
  imei?: string;
  sellingprice: number;
  warrantyprice?: number;
  packageid?: number;
}

export const ordersApi = {
  getAll: () => apiClient.get<Order[]>('/Orders'),
  getById: (id: number) => apiClient.get<Order>(`/Orders/${id}`),
  getByCustomer: (customerId: number) => apiClient.get<Order[]>(`/Orders/customer/${customerId}`),
  create: (data: Partial<Order>) => apiClient.post<Order>('/Orders', data),
  update: (id: number, data: Partial<Order>) => apiClient.put(`/Orders/${id}`, data),
  updateStatus: (id: number, status: string) => apiClient.patch(`/Orders/${id}/status`, JSON.stringify(status)),
  delete: (id: number) => apiClient.delete(`/Orders/${id}`),
};
