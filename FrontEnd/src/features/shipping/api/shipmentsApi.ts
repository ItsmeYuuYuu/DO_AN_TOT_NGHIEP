import apiClient from '@/api/apiClient';

export interface ShipmentHistory {
  historyid: number;
  userid?: number;
  user?: string;
  fromstatus?: string;
  tostatus: string;
  note?: string;
  createdat?: string;
}

export interface Shipment {
  shipmentid: number;
  orderid: number;
  carrier: string;
  trackingcode: string;
  shippingfee: number;
  status: string;
  estimateddeliveryat?: string;
  deliveryattempts: number;
  shippingname?: string;
  shippingphone?: string;
  shippingaddress?: string;
  paymentmethod?: string;
  paymentstatus?: string;
  finalamount: number;
  createdat?: string;
  updatedat?: string;
  pickedupat?: string;
  deliveredat?: string;
  returnedat?: string;
  histories: ShipmentHistory[];
}

export const shipmentsApi = {
  getAll: (status?: string) =>
    apiClient.get<Shipment[]>('/Shipments', { params: status ? { status } : undefined }),
  getByOrder: (orderId: number) =>
    apiClient.get<Shipment>(`/Shipments/order/${orderId}`),
  updateStatus: (shipmentId: number, status: string, note?: string) =>
    apiClient.patch<Shipment>(`/Shipments/${shipmentId}/status`, { status, note }),
};
