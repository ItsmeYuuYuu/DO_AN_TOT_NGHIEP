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
  checkouttype?: string;
  paymentstatus?: string;
  requiredpayment?: number;
  paidamount?: number;
  depositpercentage?: number;
  shippingname?: string;
  shippingphone?: string;
  shippingemail?: string;
  shippingaddress?: string;
  customernote?: string;
  reservationexpiresat?: string;
  paymenttoken?: string;
  cancellationreason?: string;
  vouchercode?: string;
  customer?: { customerid: number; fullname: string; phone: string; email?: string };
  orderitems?: OrderItem[];
  orderpayments?: OrderPayment[];
  shipment?: {
    carrier: string;
    trackingcode: string;
    status: string;
    estimateddeliveryat?: string;
    deliveryattempts: number;
    deliveredat?: string;
  };
}

export interface OrderPayment {
  paymentid: number;
  provider: string;
  paymenttype: string;
  amount: number;
  status: string;
  transactionref?: string;
  createdat?: string;
  paidat?: string;
}

export interface OrderItem {
  orderitemid: number;
  orderid: number;
  imei?: string;
  sellingprice: number;
  warrantyprice?: number;
  packageid?: number;
  packagename?: string;
  productname?: string;
  variantsku?: string;
  variantid?: number;
  productid?: number;
  imageurl?: string;
}

export interface BulkUpdateFailedItem {
  orderId: number;
  reason: string;
}

export interface BulkUpdateStatusResponse {
  updatedOrderIds: number[];
  failed: BulkUpdateFailedItem[];
  message: string;
}

export interface PaymentCheckout {
  orderid: number;
  paymentmethod?: string;
  paymentstatus?: string;
  finalamount: number;
  requiredpayment: number;
  paidamount: number;
  reservationexpiresat?: string;
  shippingname?: string;
  qrImageUrl?: string;
  qrContent?: string;
  paymentInstructions?: string;
  requiresStaffConfirmation: boolean;
}

export interface PaymentActionResult {
  orderid: number;
  paymentstatus: string;
  paidamount: number;
  remainingamount: number;
  transactionref?: string;
}

export const ordersApi = {
  getAll: () => apiClient.get<Order[]>('/Orders'),
  getById: (id: number) => apiClient.get<Order>(`/Orders/${id}`),
  getByCustomer: (customerId: number) => apiClient.get<Order[]>(`/Orders/customer/${customerId}`),
  getByUser: (userId: number) => apiClient.get<Order[]>(`/Orders/user/${userId}`),
  create: (data: Partial<Order>) => apiClient.post<Order>('/Orders', data),
  update: (id: number, data: Partial<Order>) => apiClient.put(`/Orders/${id}`, data),
  updateStatus: (id: number, status: string) => apiClient.patch(`/Orders/${id}/status`, { status }),
  bulkUpdateStatus: (orderIds: number[], status: string) => apiClient.post<BulkUpdateStatusResponse>(`/Orders/bulk-status`, { orderIds, status }),
  getPayment: (id: number, token: string) =>
    apiClient.get<PaymentCheckout>(`/Orders/${id}/payment`, { params: { token } }),
  simulatePayment: (id: number, paymenttoken: string, success: boolean) =>
    apiClient.post<PaymentActionResult>(`/Orders/${id}/simulate-payment`, { paymenttoken, success }),
  cancelPendingPayment: (id: number, paymenttoken: string) =>
    apiClient.post<{ orderid: number; orderstatus: string; paymentstatus: string }>(`/Orders/${id}/cancel-payment`, { paymenttoken }),
  cancelByCustomer: (id: number, reason?: string) =>
    apiClient.post<{ orderid: number; orderstatus: string }>(`/Orders/${id}/customer-cancel`, { reason }),
  confirmPayment: (id: number, amount?: number, transactionref?: string, note?: string) =>
    apiClient.post<PaymentActionResult>(`/Orders/${id}/confirm-payment`, { amount, transactionref, note }),
  delete: (id: number) => apiClient.delete(`/Orders/${id}`),
};
