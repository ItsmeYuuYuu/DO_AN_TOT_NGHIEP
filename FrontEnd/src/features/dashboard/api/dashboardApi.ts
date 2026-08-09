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

export interface TodaySalesResults {
  netRevenueToday: number;
  invoicesToday: number;
  returnsToday: number;
  netRevenueYesterday: number;
  netRevenueSameDayLastMonth: number;
  changeVsYesterdayPercentage: number;
  changeVsLastMonthPercentage: number;
}

export interface RevenueBreakdownItem {
  label: string;
  revenue: number;
}

export interface RecentActivity {
  id: string;
  title: string;
  subtitle: string;
  timestamp: string;
  status?: string;
  amount?: number;
  type: 'order' | 'invoice' | 'audit';
}

export interface TopCustomer {
  customerId: number;
  fullName: string;
  phone: string;
  totalSpent: number;
  ordersCount: number;
}

export const dashboardApi = {
  getKpi: (period: string = '7d') => 
    apiClient.get<KpiResponse>(`/dashboard/kpi?period=${period}`),
  
  getTopProducts: (period: string = '7d', limit: number = 5) => 
    apiClient.get<TopProduct[]>(`/dashboard/top-products?period=${period}&limit=${limit}`),
    
  getOrderStatusDistribution: (period: string = '7d') => 
    apiClient.get<OrderStatusDistribution[]>(`/dashboard/order-status-distribution?period=${period}`),

  getTodayResults: (period: string = '30d') =>
    apiClient.get<TodaySalesResults>(`/dashboard/today-results?period=${period}`),

  getRevenueBreakdown: (period: string = 'this_month', groupBy: string = 'day') => 
    apiClient.get<RevenueBreakdownItem[]>(`/dashboard/revenue-breakdown?period=${period}&groupBy=${groupBy}`),

  getRecentActivities: (type: string = 'all', q: string = '', limit: number = 10) => 
    apiClient.get<RecentActivity[]>(`/dashboard/recent-activities?type=${type}&q=${encodeURIComponent(q)}&limit=${limit}`),

  getTopProductsV2: (period: string = 'this_month', limit: number = 10) => 
    apiClient.get<TopProduct[]>(`/dashboard/top-products-v2?period=${period}&limit=${limit}`),

  getTopCustomers: (period: string = 'this_month', limit: number = 10) => 
    apiClient.get<TopCustomer[]>(`/dashboard/top-customers?period=${period}&limit=${limit}`),
};
