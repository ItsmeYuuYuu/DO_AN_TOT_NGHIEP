import apiClient from '@/api/apiClient';

export interface KpiResponse {
  totalRevenueCurrent: number;
  totalRevenuePrevious: number;
  completedOrdersCurrent: number;
  completedOrdersPrevious: number;
  cancelledRateCurrent: number;
  cancelledRatePrevious: number;
  aovCurrent: number;
  aovPrevious: number;
  pendingOverSlaCount: number;
}

export interface TopProduct {
  productId: number;
  productName: string;
  unitsSold: number;
  revenue: number;
}

export interface OrderStatusDistribution {
  status: string;
  count: number;
}

export const dashboardApi = {
  getKpi: (period: string = '7d') => 
    apiClient.get<KpiResponse>(`/dashboard/kpi?period=${period}`),
  
  getTopProducts: (period: string = '7d', limit: number = 5) => 
    apiClient.get<TopProduct[]>(`/dashboard/top-products?period=${period}&limit=${limit}`),
    
  getOrderStatusDistribution: (period: string = '7d') => 
    apiClient.get<OrderStatusDistribution[]>(`/dashboard/order-status-distribution?period=${period}`),
};
