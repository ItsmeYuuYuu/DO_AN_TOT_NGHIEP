import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  DollarSign,
  FileText,
  History,
  RefreshCw,
  Search,
  ShoppingBag,
  TrendingDown,
  TrendingUp,
  XOctagon,
} from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';
import { dashboardApi } from '@/features/dashboard/api/dashboardApi';
import type {
  RecentActivity,
  RevenueBreakdownItem,
  TodaySalesResults,
  TopCustomer,
  TopProduct,
} from '@/features/dashboard/api/dashboardApi';

interface StatCardProps {
  title: string;
  value: string;
  hint?: string;
  trend?: number;
  icon: React.ReactNode;
  tone: string;
  loading: boolean;
}

const formatYAxisValue = (value: number) => {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1).replace('.0', '')} tỷ`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace('.0', '')} triệu`;
  if (value >= 1000) return `${Math.round(value / 1000)}k`;
  return value.toString();
};

const formatActivityTime = (timestamp: string) => {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  });
};

const activityStatusLabel: Record<string, string> = {
  Completed: 'Hoàn tất',
  Shipped: 'Đang giao',
  Processing: 'Đang xử lý',
  Pending: 'Chờ duyệt',
  Cancelled: 'Đã hủy',
};

const StatCard = ({ title, value, hint, trend, icon, tone, loading }: StatCardProps) => (
  <div className="ops-card p-5">
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="ops-label">{title}</p>
        {loading ? (
          <div className="mt-3 h-8 w-32 animate-pulse bg-slate-100" />
        ) : (
          <p className="mt-2 text-3xl font-black tracking-tight text-[#172033]">{value}</p>
        )}
      </div>
      <div className={`flex h-12 w-12 items-center justify-center ${tone}`}>{icon}</div>
    </div>
    <div className="mt-4 border-t border-slate-100 pt-3 text-xs font-bold text-slate-500">
      {loading ? (
        <div className="h-4 w-full animate-pulse bg-slate-50" />
      ) : trend !== undefined ? (
        <span className={`inline-flex items-center gap-1 ${trend >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
          {trend >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
          {trend >= 0 ? '+' : ''}{trend}% {hint}
        </span>
      ) : (
        <span>{hint}</span>
      )}
    </div>
  </div>
);

const AdminDashboard: React.FC = () => {
  const [todayResults, setTodayResults] = useState<TodaySalesResults | null>(null);
  const [todayLoading, setTodayLoading] = useState(true);
  const [todayError, setTodayError] = useState<string | null>(null);

  const [revenuePeriod, setRevenuePeriod] = useState('this_month');
  const [revenueGroupBy, setRevenueGroupBy] = useState('day');
  const [revenueData, setRevenueData] = useState<RevenueBreakdownItem[]>([]);
  const [revenueLoading, setRevenueLoading] = useState(true);

  const [activityType, setActivityType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);

  const [topProductsPeriod, setTopProductsPeriod] = useState('this_month');
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [topProductsLoading, setTopProductsLoading] = useState(true);

  const [topCustomersPeriod, setTopCustomersPeriod] = useState('this_month');
  const [topCustomers, setTopCustomers] = useState<TopCustomer[]>([]);
  const [topCustomersLoading, setTopCustomersLoading] = useState(true);

  const [refreshKey, setRefreshKey] = useState(0);
  const [lastUpdated, setLastUpdated] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  const fetchTodayResults = useCallback(async () => {
    setTodayLoading(true);
    setTodayError(null);
    try {
      const response = await dashboardApi.getTodayResults();
      setTodayResults(response.data);
    } catch {
      setTodayError('Không tải được kết quả bán hàng hôm nay.');
    } finally {
      setTodayLoading(false);
    }
  }, []);

  const fetchRevenueBreakdown = useCallback(async () => {
    setRevenueLoading(true);
    try {
      const response = await dashboardApi.getRevenueBreakdown(revenuePeriod, revenueGroupBy);
      setRevenueData(response.data);
    } catch {
      setRevenueData([]);
    } finally {
      setRevenueLoading(false);
    }
  }, [revenueGroupBy, revenuePeriod]);

  const fetchRecentActivities = useCallback(async () => {
    setActivitiesLoading(true);
    try {
      const response = await dashboardApi.getRecentActivities(activityType, debouncedQuery, 15);
      setActivities(response.data);
    } catch {
      setActivities([]);
    } finally {
      setActivitiesLoading(false);
    }
  }, [activityType, debouncedQuery]);

  const fetchTopProducts = useCallback(async () => {
    setTopProductsLoading(true);
    try {
      const response = await dashboardApi.getTopProductsV2(topProductsPeriod, 10);
      setTopProducts(response.data);
    } catch {
      setTopProducts([]);
    } finally {
      setTopProductsLoading(false);
    }
  }, [topProductsPeriod]);

  const fetchTopCustomers = useCallback(async () => {
    setTopCustomersLoading(true);
    try {
      const response = await dashboardApi.getTopCustomers(topCustomersPeriod, 10);
      setTopCustomers(response.data);
    } catch {
      setTopCustomers([]);
    } finally {
      setTopCustomersLoading(false);
    }
  }, [topCustomersPeriod]);

  useEffect(() => {
    fetchTodayResults();
    setLastUpdated(new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  }, [fetchTodayResults, refreshKey]);

  useEffect(() => { fetchRevenueBreakdown(); }, [fetchRevenueBreakdown, refreshKey]);
  useEffect(() => { fetchRecentActivities(); }, [fetchRecentActivities, refreshKey]);
  useEffect(() => { fetchTopProducts(); }, [fetchTopProducts, refreshKey]);
  useEffect(() => { fetchTopCustomers(); }, [fetchTopCustomers, refreshKey]);

  const maxRevenue = Math.max(...revenueData.map(item => item.revenue), 0);
  const chartHeightLimit = maxRevenue > 0 ? maxRevenue : 1;
  const totalRevenueInChart = useMemo(
    () => revenueData.reduce((total, item) => total + item.revenue, 0),
    [revenueData],
  );

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 pb-10">
      <section className="ops-card overflow-hidden">
        <div className="grid gap-6 p-6 lg:grid-cols-[1.4fr_0.6fr] lg:items-end">
          <div>
            <p className="ops-label">Business cockpit</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-[#172033] md:text-4xl">
              Tổng quan vận hành
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
              Theo dõi doanh thu, đơn hàng, hoạt động hệ thống và các sản phẩm đang bán tốt.
              Cập nhật mới nhất lúc <span className="font-black text-[#172033]">{lastUpdated || '--:--'}</span>.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setRefreshKey(prev => prev + 1)}
            className="ops-button-primary"
          >
            <RefreshCw size={16} className={`${todayLoading || revenueLoading || activitiesLoading ? 'animate-spin' : ''}`} />
            Tải lại dữ liệu
          </button>
        </div>
        {todayError && (
          <div className="border-t border-rose-200 bg-rose-50 px-6 py-3 text-sm font-bold text-rose-700">
            {todayError}
          </div>
        )}
      </section>

      <div className="grid gap-5 md:grid-cols-3">
        <StatCard
          title="Doanh thu hôm nay"
          value={todayResults ? formatCurrency(todayResults.netRevenueToday) : '0đ'}
          hint="so với hôm qua"
          trend={todayResults?.changeVsYesterdayPercentage}
          icon={<DollarSign size={24} />}
          tone="bg-indigo-50 text-indigo-700"
          loading={todayLoading}
        />
        <StatCard
          title="Đơn hoàn tất"
          value={todayResults ? `${todayResults.invoicesToday} đơn` : '0 đơn'}
          hint={todayResults && todayResults.invoicesToday > 0 ? `AOV ${formatCurrency(todayResults.netRevenueToday / todayResults.invoicesToday)}` : 'Chưa có đơn hoàn tất'}
          icon={<FileText size={24} />}
          tone="bg-emerald-50 text-emerald-700"
          loading={todayLoading}
        />
        <StatCard
          title="Hủy / trả hôm nay"
          value={todayResults ? `${todayResults.returnsToday} đơn` : '0 đơn'}
          hint="cần theo dõi nguyên nhân"
          icon={<XOctagon size={24} />}
          tone="bg-rose-50 text-rose-700"
          loading={todayLoading}
        />
      </div>

      <div id="phan-tich" className="grid scroll-mt-32 gap-6 lg:grid-cols-3">
        <section className="ops-card flex h-[460px] flex-col p-6 lg:col-span-2">
          <div className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-4 sm:flex-row sm:items-start">
            <div>
              <p className="ops-label">Revenue analytics</p>
              <h2 className="mt-1 text-xl font-black text-[#172033]">Biểu đồ doanh thu</h2>
              <p className="mt-1 text-xs text-slate-400">Tổng trong biểu đồ: {formatCurrency(totalRevenueInChart)}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex border border-slate-200 bg-slate-50 p-1">
                {(['hour', 'day', 'dayofweek'] as const).map(group => (
                  <button
                    key={group}
                    type="button"
                    onClick={() => setRevenueGroupBy(group)}
                    className={`px-3 py-1 text-xs font-black transition ${
                      revenueGroupBy === group ? 'bg-[#172033] text-white' : 'text-slate-500 hover:text-[#172033]'
                    }`}
                  >
                    {group === 'hour' ? 'Giờ' : group === 'day' ? 'Ngày' : 'Thứ'}
                  </button>
                ))}
              </div>
              <select
                value={revenuePeriod}
                onChange={event => setRevenuePeriod(event.target.value)}
                className="border border-slate-200 bg-white px-3 py-2 text-xs font-black text-[#172033] outline-none"
              >
                <option value="today">Hôm nay</option>
                <option value="yesterday">Hôm qua</option>
                <option value="7d">7 ngày qua</option>
                <option value="30d">30 ngày qua</option>
                <option value="this_month">Tháng này</option>
              </select>
            </div>
          </div>

          <div className="relative mt-6 flex flex-1 items-end">
            {revenueLoading ? (
              <div className="flex h-full w-full items-end gap-2">
                {Array.from({ length: 12 }).map((_, index) => (
                  <div key={index} className="flex flex-1 flex-col items-center gap-2">
                    <div className="w-full animate-pulse bg-slate-100" style={{ height: `${30 + (index % 5) * 12}%` }} />
                    <div className="h-3 w-8 animate-pulse bg-slate-100" />
                  </div>
                ))}
              </div>
            ) : revenueData.length === 0 ? (
              <div className="flex h-full w-full flex-col items-center justify-center text-sm text-slate-400">
                <BarChart3 className="mb-3 text-slate-300" size={38} />
                Không có dữ liệu doanh thu trong kỳ.
              </div>
            ) : (
              <div className="flex h-full w-full items-end gap-2 overflow-x-auto">
                {revenueData.map((item, index) => {
                  const height = (item.revenue / chartHeightLimit) * 100;
                  return (
                    <div key={`${item.label}-${index}`} className="group flex h-full min-w-10 flex-1 flex-col justify-end gap-2">
                      <div className="relative flex flex-1 items-end">
                        <div
                          className="w-full bg-gradient-to-t from-[#172033] to-[#818cf8] transition group-hover:from-[#4f46e5] group-hover:to-orange-400"
                          style={{ height: `${Math.max(2, height)}%` }}
                        />
                        <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 hidden -translate-x-1/2 bg-[#172033] px-2 py-1 text-[10px] font-bold text-white group-hover:block">
                          {formatCurrency(item.revenue)}
                        </div>
                      </div>
                      <span className="truncate text-center text-[10px] font-bold text-slate-500">{item.label}</span>
                    </div>
                  );
                })}
              </div>
            )}
            {maxRevenue > 0 && (
              <span className="absolute right-0 top-0 text-[10px] font-bold text-slate-400">{formatYAxisValue(maxRevenue)}</span>
            )}
          </div>
        </section>

        <section className="ops-card flex h-[460px] flex-col p-5">
          <div className="border-b border-slate-100 pb-3">
            <p className="ops-label">Live feed</p>
            <h2 className="mt-1 text-xl font-black text-[#172033]">Nhật ký hoạt động</h2>
          </div>
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              type="text"
              value={searchQuery}
              onChange={event => setSearchQuery(event.target.value)}
              placeholder="Tìm mã đơn, khách hàng..."
              className="w-full border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs font-semibold outline-none focus:border-[#172033] focus:bg-white"
            />
          </div>
          <div className="mt-3 flex gap-1 overflow-x-auto border-b border-slate-100 pb-2">
            {[
              { id: 'all', label: 'Tất cả' },
              { id: 'invoice', label: 'Hóa đơn' },
              { id: 'order', label: 'Đặt hàng' },
              { id: 'audit', label: 'Nhật ký' },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActivityType(tab.id)}
                className={`whitespace-nowrap px-3 py-1 text-[11px] font-black transition ${
                  activityType === tab.id ? 'bg-[#172033] text-white' : 'text-slate-500 hover:bg-indigo-50/40'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="mt-3 flex-1 space-y-3 overflow-y-auto pr-1">
            {activitiesLoading ? (
              Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="flex animate-pulse gap-3">
                  <div className="h-9 w-9 bg-slate-100" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-3/4 bg-slate-100" />
                    <div className="h-2 w-1/2 bg-slate-50" />
                  </div>
                </div>
              ))
            ) : activities.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">Không tìm thấy hoạt động phù hợp.</div>
            ) : (
              activities.map(item => (
                <div key={item.id} className="flex gap-3 border border-transparent p-2 transition hover:border-slate-100 hover:bg-indigo-50/40">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center ${
                    item.type === 'invoice' ? 'bg-emerald-50 text-emerald-700' :
                      item.type === 'order' ? 'bg-indigo-50 text-[#4338ca]' : 'bg-amber-50 text-amber-700'
                  }`}>
                    {item.type === 'invoice' ? <FileText size={15} /> : item.type === 'order' ? <ShoppingBag size={15} /> : <History size={15} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-black text-[#172033]">{item.title}</p>
                    <p className="mt-0.5 truncate text-[11px] text-slate-400">{item.subtitle}</p>
                    <p className="mt-1 text-[10px] font-bold text-slate-400">{formatActivityTime(item.timestamp)}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    {item.amount !== null && item.amount !== undefined && (
                      <p className="text-xs font-black text-[#172033]">+{formatCurrency(item.amount)}</p>
                    )}
                    {item.status && (
                      <span className="mt-1 inline-flex bg-slate-100 px-1.5 py-0.5 text-[9px] font-black text-slate-500">
                        {activityStatusLabel[item.status] ?? item.status}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="ops-card p-6">
          <div className="mb-4 flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <p className="ops-label">Top products</p>
              <h2 className="mt-1 text-xl font-black text-[#172033]">Sản phẩm bán chạy</h2>
            </div>
            <select
              value={topProductsPeriod}
              onChange={event => setTopProductsPeriod(event.target.value)}
              className="border border-slate-200 bg-white px-3 py-2 text-xs font-black text-[#172033]"
            >
              <option value="7d">7 ngày qua</option>
              <option value="30d">30 ngày qua</option>
              <option value="this_month">Tháng này</option>
            </select>
          </div>
          {topProductsLoading ? (
            <div className="space-y-3">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-11 animate-pulse bg-slate-50" />)}</div>
          ) : topProducts.length === 0 ? (
            <div className="py-14 text-center text-sm text-slate-400">Không có dữ liệu sản phẩm trong kỳ.</div>
          ) : (
            <div className="space-y-2">
              {topProducts.map((product, index) => (
                <div key={product.productId} className="grid grid-cols-[42px_1fr_auto] items-center gap-3 border border-slate-100 p-3 hover:bg-indigo-50/40">
                  <span className="flex h-8 w-8 items-center justify-center bg-[#172033] text-xs font-black text-white">#{index + 1}</span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-[#172033]">{product.productName}</p>
                    <p className="text-xs text-slate-400">{product.unitsSold} máy đã bán</p>
                  </div>
                  <span className="text-sm font-black text-[#4338ca]">{formatCurrency(product.revenue)}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="ops-card p-6">
          <div className="mb-4 flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <p className="ops-label">Top customers</p>
              <h2 className="mt-1 text-xl font-black text-[#172033]">Khách hàng thân thiết</h2>
            </div>
            <select
              value={topCustomersPeriod}
              onChange={event => setTopCustomersPeriod(event.target.value)}
              className="border border-slate-200 bg-white px-3 py-2 text-xs font-black text-[#172033]"
            >
              <option value="7d">7 ngày qua</option>
              <option value="30d">30 ngày qua</option>
              <option value="this_month">Tháng này</option>
            </select>
          </div>
          {topCustomersLoading ? (
            <div className="space-y-3">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-11 animate-pulse bg-slate-50" />)}</div>
          ) : topCustomers.length === 0 ? (
            <div className="py-14 text-center text-sm text-slate-400">Không có dữ liệu khách hàng trong kỳ.</div>
          ) : (
            <div className="space-y-2">
              {topCustomers.map((customer, index) => (
                <div key={customer.customerId} className="grid grid-cols-[42px_1fr_auto] items-center gap-3 border border-slate-100 p-3 hover:bg-indigo-50/40">
                  <span className="flex h-8 w-8 items-center justify-center bg-[#ffd166] text-xs font-black text-[#172033]">#{index + 1}</span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-[#172033]">{customer.fullName}</p>
                    <p className="text-xs text-slate-400">{customer.phone || 'Không có SĐT'} · {customer.ordersCount} đơn</p>
                  </div>
                  <span className="text-sm font-black text-[#4338ca]">{formatCurrency(customer.totalSpent)}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default AdminDashboard;
