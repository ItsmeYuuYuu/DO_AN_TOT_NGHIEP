import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bot,
  DollarSign,
  FileText,
  History,
  PieChart,
  RefreshCw,
  Search,
  ShoppingBag,
  TrendingDown,
  TrendingUp,
  XOctagon,
} from 'lucide-react';
import { formatCurrency, formatDateTime } from '@/utils/formatters';
import { dashboardApi } from '@/features/dashboard/api/dashboardApi';
import type {
  RecentActivity,
  OrderStatusDistribution,
  RevenueBreakdownItem,
  TodaySalesResults,
  TopCustomer,
  TopProduct,
} from '@/features/dashboard/api/dashboardApi';
import { chatSessionsApi } from '@/features/chat/api/chatSessionsApi';

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
  return formatDateTime(timestamp);
};

const activityStatusLabel: Record<string, string> = {
  Completed: 'Hoàn tất',
  Shipped: 'Đang giao',
  Processing: 'Đang xử lý',
  Pending: 'Chờ duyệt',
  Cancelled: 'Đã hủy',
};

const donutColors = ['#e30613', '#f59e0b', '#172033', '#22c55e', '#94a3b8'];

const buildAreaPath = (data: RevenueBreakdownItem[], width: number, height: number) => {
  if (data.length === 0) return { linePath: '', areaPath: '' };
  const max = Math.max(...data.map(item => item.revenue), 1);
  const step = data.length > 1 ? width / (data.length - 1) : width;
  const points = data.map((item, index) => {
    const x = data.length > 1 ? index * step : width / 2;
    const y = height - (item.revenue / max) * (height - 50) - 10;
    return { x, y };
  });
  const linePath = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(2)} ${height} L ${points[0].x.toFixed(2)} ${height} Z`;
  return { linePath, areaPath };
};

const DonutChart = ({
  data,
  loading,
  period,
  onPeriodChange,
}: {
  data: OrderStatusDistribution[];
  loading: boolean;
  period: string;
  onPeriodChange: (value: string) => void;
}) => {
  const total = data.reduce((sum, item) => sum + item.count, 0);
  let offset = 25;
  const radius = 34;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="ops-card flex h-[460px] min-w-0 flex-col p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="ops-label">Cơ cấu đơn hàng</p>
          <h2 className="mt-1 text-xl font-black text-[#172033]">Cơ cấu đơn hàng</h2>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={period}
            onChange={event => onPeriodChange(event.target.value)}
            className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-black text-[#172033] outline-none focus:border-[#e30613]"
          >
            <option value="7d">7 ngày</option>
            <option value="30d">30 ngày</option>
            <option value="this_month">Tháng này</option>
          </select>
          <PieChart size={22} className="text-[#e30613]" />
        </div>
      </div>
      <div className={`flex flex-1 items-center justify-center gap-5 ${total > 0 ? 'flex-col xl:flex-row' : 'flex-col'}`}>
        <div className="relative mx-auto h-44 w-44">
          {loading ? (
            <div className="h-full w-full animate-pulse rounded-full bg-slate-100" />
          ) : (
            <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
              <circle cx="50" cy="50" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="12" />
              {total > 0 && data.map((item, index) => {
                const dash = (item.count / total) * circumference;
                const segment = (
                  <circle
                    key={item.status}
                    cx="50"
                    cy="50"
                    r={radius}
                    fill="none"
                    stroke={donutColors[index % donutColors.length]}
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeDasharray={`${dash} ${circumference - dash}`}
                    strokeDashoffset={offset}
                  />
                );
                offset -= dash;
                return segment;
              })}
            </svg>
          )}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-3xl font-black text-[#172033]">{loading ? '...' : total}</span>
            <span className="text-xs font-bold text-slate-400">đơn</span>
          </div>
        </div>
        {!loading && total === 0 ? (
          <div className="max-w-56 text-center">
            <p className="text-sm font-black text-[#172033]">Chưa có đơn trong kỳ này</p>
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-400">
              Khi có đơn hàng, biểu đồ sẽ hiển thị tỷ lệ theo từng trạng thái.
            </p>
          </div>
        ) : (
        <div className="w-full space-y-2">
          {(loading ? Array.from({ length: 4 }) : data).map((item, index) => {
            if (loading) {
              return <div key={index} className="h-9 animate-pulse rounded-full bg-slate-100" />;
            }
            const typedItem = item as OrderStatusDistribution;
            const percent = total > 0 ? Math.round((typedItem.count / total) * 100) : 0;
            return (
              <div key={typedItem.status} className="flex items-center justify-between gap-3 rounded-full border border-slate-100 bg-white px-3 py-2">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: donutColors[index % donutColors.length] }} />
                  <span className="truncate text-xs font-black text-[#172033]">{activityStatusLabel[typedItem.status] ?? typedItem.status}</span>
                </span>
                <span className="text-xs font-black text-slate-500">{typedItem.count} · {percent}%</span>
              </div>
            );
          })}
        </div>
        )}
      </div>
    </div>
  );
};

const StatCard = ({ title, value, hint, trend, icon, tone, loading }: StatCardProps) => (
  <div className="ops-card overflow-hidden p-5">
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="ops-label">{title}</p>
        {loading ? (
          <div className="mt-3 h-8 w-32 animate-pulse rounded-full bg-slate-100" />
        ) : (
          <p className="mt-2 text-3xl font-black tracking-tight text-[#172033]">{value}</p>
        )}
      </div>
      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${tone}`}>{icon}</div>
    </div>
    <div className="mt-4 border-t border-slate-100 pt-3 text-xs font-bold text-slate-500">
      {loading ? (
        <div className="h-4 w-full animate-pulse rounded-full bg-slate-50" />
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
  const [playIntro] = useState(() => {
    if (typeof window === 'undefined') return false;
    const shouldPlay = window.sessionStorage.getItem('admin-dashboard-intro') === '1';
    window.sessionStorage.removeItem('admin-dashboard-intro');
    return shouldPlay;
  });
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

  const [orderStatusData, setOrderStatusData] = useState<OrderStatusDistribution[]>([]);
  const [orderStatusLoading, setOrderStatusLoading] = useState(true);
  const [orderStatusPeriod, setOrderStatusPeriod] = useState('30d');
  const [aiRecommendationCount, setAiRecommendationCount] = useState(0);
  const [aiMetricsLoading, setAiMetricsLoading] = useState(true);

  const [refreshKey, setRefreshKey] = useState(0);
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; label: string; revenue: number } | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  const fetchTodayResults = useCallback(async () => {
    setTodayLoading(true);
    setTodayError(null);
    try {
      const response = await dashboardApi.getTodayResults('30d');
      setTodayResults(response.data);
    } catch {
      setTodayError('Không tải được kết quả vận hành trong 30 ngày.');
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
      const response = await dashboardApi.getTopProductsV2(topProductsPeriod, 5);
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
      const response = await dashboardApi.getTopCustomers(topCustomersPeriod, 5);
      setTopCustomers(response.data);
    } catch {
      setTopCustomers([]);
    } finally {
      setTopCustomersLoading(false);
    }
  }, [topCustomersPeriod]);

  const fetchOrderStatusDistribution = useCallback(async () => {
    setOrderStatusLoading(true);
    try {
      const response = await dashboardApi.getOrderStatusDistribution(orderStatusPeriod);
      setOrderStatusData(response.data);
    } catch {
      setOrderStatusData([]);
    } finally {
      setOrderStatusLoading(false);
    }
  }, [orderStatusPeriod]);

  const fetchAiRecommendationMetrics = useCallback(async () => {
    setAiMetricsLoading(true);
    try {
      const result = await chatSessionsApi.getRecommendationMetrics(30);
      setAiRecommendationCount(result.totalrecommendations);
    } catch {
      setAiRecommendationCount(0);
    } finally {
      setAiMetricsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTodayResults();
  }, [fetchTodayResults, refreshKey]);

  useEffect(() => { fetchRevenueBreakdown(); }, [fetchRevenueBreakdown, refreshKey]);
  useEffect(() => { fetchRecentActivities(); }, [fetchRecentActivities, refreshKey]);
  useEffect(() => { fetchTopProducts(); }, [fetchTopProducts, refreshKey]);
  useEffect(() => { fetchTopCustomers(); }, [fetchTopCustomers, refreshKey]);
  useEffect(() => { fetchOrderStatusDistribution(); }, [fetchOrderStatusDistribution, refreshKey]);
  useEffect(() => { fetchAiRecommendationMetrics(); }, [fetchAiRecommendationMetrics, refreshKey]);

  useEffect(() => {
    if ((revenuePeriod === 'today' || revenuePeriod === 'yesterday') && revenueGroupBy !== 'hour') {
      setRevenueGroupBy('hour');
      return;
    }

    if (revenuePeriod !== 'today' && revenuePeriod !== 'yesterday' && revenueGroupBy === 'hour') {
      setRevenueGroupBy('day');
    }
  }, [revenueGroupBy, revenuePeriod]);

  const maxRevenue = Math.max(...revenueData.map(item => item.revenue), 0);
  const chartHeightLimit = maxRevenue > 0 ? maxRevenue : 1;
  const totalRevenueInChart = useMemo(
    () => revenueData.reduce((total, item) => total + item.revenue, 0),
    [revenueData],
  );
  const areaChart = useMemo(() => buildAreaPath(revenueData, 720, 260), [revenueData]);
  const topProductMaxRevenue = Math.max(...topProducts.map(product => product.revenue), 1);
  const topCustomerMaxSpent = Math.max(...topCustomers.map(customer => customer.totalSpent), 1);
  const revenueGroupOptions = revenuePeriod === 'today' || revenuePeriod === 'yesterday'
    ? (['hour'] as const)
    : (['day', 'dayofweek'] as const);

  return (
    <div className={`mx-auto max-w-[1600px] space-y-6 pb-10 ${playIntro ? 'admin-dashboard-intro' : ''}`}>
      <section className="ops-hero admin-intro-hero overflow-hidden">
        <div className="grid gap-6 p-6 lg:grid-cols-[1.4fr_0.6fr] lg:items-end">
          <div>
            <h1 className="ops-hero-title">Tổng quan vận hành</h1>
          </div>
          <button
            type="button"
            onClick={() => setRefreshKey(prev => prev + 1)}
            className="ops-hero-action"
          >
            <RefreshCw size={16} className={`${todayLoading || revenueLoading || activitiesLoading || aiMetricsLoading ? 'animate-spin' : ''}`} />
            Tải lại dữ liệu
          </button>
        </div>
        {todayError && (
          <div className="border-t border-rose-200 bg-rose-50 px-6 py-3 text-sm font-bold text-rose-700">
            {todayError}
          </div>
        )}
      </section>

      <div className="admin-intro-stats grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Doanh thu 30 ngày"
          value={todayResults ? formatCurrency(todayResults.netRevenueToday) : '0đ'}
          hint="so với 30 ngày liền trước"
          trend={todayResults?.changeVsYesterdayPercentage}
          icon={<DollarSign size={24} />}
          tone="bg-red-50 text-[#e30613]"
          loading={todayLoading}
        />
        <StatCard
          title="Đơn hoàn tất (30 ngày)"
          value={todayResults ? `${todayResults.invoicesToday} đơn` : '0 đơn'}
          hint={todayResults && todayResults.invoicesToday > 0 ? `AOV ${formatCurrency(todayResults.netRevenueToday / todayResults.invoicesToday)}` : 'Chưa có đơn hoàn tất'}
          icon={<FileText size={24} />}
          tone="bg-amber-50 text-amber-700"
          loading={todayLoading}
        />
        <StatCard
          title="Hủy / trả (30 ngày)"
          value={todayResults ? `${todayResults.returnsToday} đơn` : '0 đơn'}
          hint="cần theo dõi nguyên nhân"
          icon={<XOctagon size={24} />}
          tone="bg-slate-100 text-[#172033]"
          loading={todayLoading}
        />
        <StatCard
          title="AI đề xuất (30 ngày)"
          value={`${aiRecommendationCount} lượt`}
          hint="sản phẩm được AI gợi ý"
          icon={<Bot size={24} />}
          tone="bg-violet-50 text-violet-700"
          loading={aiMetricsLoading}
        />
      </div>

      <div className="admin-intro-analytics grid gap-6 lg:grid-cols-4">
        <section className="ops-card flex h-[460px] min-w-0 flex-col p-6 lg:col-span-2">
          <div className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-4 sm:flex-row sm:items-start">
            <div>
              <p className="ops-label">Phân tích doanh thu</p>
              <h2 className="mt-1 text-xl font-black text-[#172033]">Biểu đồ doanh thu</h2>
              <p className="mt-1 text-xs text-slate-400">Tổng trong biểu đồ: {formatCurrency(totalRevenueInChart)}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex rounded-full border border-slate-200 bg-slate-50 p-1">
                {revenueGroupOptions.map(group => (
                  <button
                    key={group}
                    type="button"
                    onClick={() => setRevenueGroupBy(group)}
                    className={`px-3 py-1 text-xs font-black transition ${
                      revenueGroupBy === group ? 'rounded-full bg-[#e30613] text-white shadow-sm' : 'rounded-full text-slate-500 hover:text-[#c4000b]'
                    }`}
                  >
                    {group === 'hour' ? 'Giờ' : group === 'day' ? 'Ngày' : 'Thứ'}
                  </button>
                ))}
              </div>
              <select
                value={revenuePeriod}
                onChange={event => setRevenuePeriod(event.target.value)}
                className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-black text-[#172033] outline-none focus:border-[#e30613]"
              >
                <option value="today">Hôm nay</option>
                <option value="yesterday">Hôm qua</option>
                <option value="7d">7 ngày qua</option>
                <option value="30d">30 ngày qua</option>
                <option value="this_month">Tháng này</option>
              </select>
            </div>
          </div>

          <div className="relative mt-4 min-h-0 flex-1 overflow-hidden">
            {revenueLoading ? (
              <div className="flex h-full w-full items-end gap-3 overflow-hidden">
                {Array.from({ length: 12 }).map((_, index) => (
                  <div key={index} className="flex flex-1 flex-col items-center gap-2">
                    <div className="w-full animate-pulse rounded-t-3xl bg-slate-100" style={{ height: `${30 + (index % 5) * 12}%` }} />
                    <div className="h-3 w-8 animate-pulse rounded-full bg-slate-100" />
                  </div>
                ))}
              </div>
            ) : revenueData.length === 0 ? (
              <div className="flex h-full w-full flex-col items-center justify-center text-sm text-slate-400">
                <TrendingUp className="mb-3 text-slate-300" size={38} />
                Không có dữ liệu doanh thu trong kỳ.
              </div>
            ) : (
              <div className="relative h-full w-full overflow-hidden rounded-[24px] border border-slate-100 bg-gradient-to-br from-white via-[#fff7f7] to-[#f8fafc] p-3">
                <div className="relative h-[calc(100%-36px)] w-full">
                  <svg viewBox="0 0 720 260" preserveAspectRatio="none" className="admin-intro-revenue-chart h-full w-full">
                    <defs>
                      <linearGradient id="revenue-area-gradient" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#e30613" stopOpacity="0.34" />
                        <stop offset="60%" stopColor="#f59e0b" stopOpacity="0.16" />
                        <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                      </linearGradient>
                      <linearGradient id="revenue-line-gradient" x1="0" x2="1" y1="0" y2="0">
                        <stop offset="0%" stopColor="#e30613" />
                        <stop offset="100%" stopColor="#f59e0b" />
                      </linearGradient>
                    </defs>
                    <path d={areaChart.areaPath} fill="url(#revenue-area-gradient)" />
                    <path d={areaChart.linePath} fill="none" stroke="url(#revenue-line-gradient)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="6" />
                    {revenueData.map((item, index) => {
                      const x = revenueData.length > 1 ? (index * 720) / (revenueData.length - 1) : 360;
                      const y = 260 - (item.revenue / chartHeightLimit) * (260 - 50) - 10;
                      return (
                        <circle
                          key={`${item.label}-${index}`}
                          cx={x}
                          cy={y}
                          r="6"
                          fill="#fff"
                          stroke="#e30613"
                          strokeWidth="4"
                          className="cursor-pointer transition-all duration-150 hover:r-8 hover:stroke-[#f59e0b]"
                          onMouseEnter={() => setHoveredPoint({ x, y, label: item.label, revenue: item.revenue })}
                          onMouseLeave={() => setHoveredPoint(null)}
                        />
                      );
                    })}
                  </svg>
                  {hoveredPoint && (
                    <div
                      className="absolute pointer-events-none rounded-2xl bg-[#172033]/95 px-3 py-2 text-xs font-bold text-white shadow-xl -translate-x-1/2 -translate-y-full mb-3 backdrop-blur-sm transition-all duration-150"
                      style={{
                        left: `${(hoveredPoint.x / 720) * 100}%`,
                        top: `${(hoveredPoint.y / 260) * 100}%`,
                      }}
                    >
                      <div className="text-[10px] text-slate-400 font-semibold">{hoveredPoint.label}</div>
                      <div className="mt-0.5 text-xs font-black text-[#ffd166]">{formatCurrency(hoveredPoint.revenue)}</div>
                    </div>
                  )}
                </div>
                <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                  {revenueData.map((item, index) => (
                    <div key={`${item.label}-${index}`} className="group relative min-w-12 flex-1 text-center">
                      <div className="mx-auto h-2 w-2 rounded-full bg-[#e30613]" />
                      <span className="mt-1 block truncate text-[10px] font-bold text-slate-500">{item.label}</span>
                      <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 rounded-2xl bg-[#172033] px-3 py-2 text-[10px] font-bold text-white shadow-xl group-hover:block">
                        {formatCurrency(item.revenue)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {maxRevenue > 0 && (
              <span className="absolute right-0 top-0 text-[10px] font-bold text-slate-400">{formatYAxisValue(maxRevenue)}</span>
            )}
          </div>
        </section>

        <DonutChart
          data={orderStatusData}
          loading={orderStatusLoading}
          period={orderStatusPeriod}
          onPeriodChange={setOrderStatusPeriod}
        />

        <section className="ops-card flex h-[460px] min-w-0 flex-col p-5">
          <div className="border-b border-slate-100 pb-3">
            <p className="ops-label">Hoạt động gần đây</p>
            <h2 className="mt-1 text-xl font-black text-[#172033]">Nhật ký hoạt động</h2>
          </div>
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              type="text"
              value={searchQuery}
              onChange={event => setSearchQuery(event.target.value)}
              placeholder="Tìm mã đơn, khách hàng..."
              className="w-full rounded-full border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs font-semibold outline-none focus:border-[#e30613] focus:bg-white"
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
                  activityType === tab.id ? 'rounded-full bg-[#e30613] text-white shadow-sm' : 'rounded-full text-slate-500 hover:bg-red-50 hover:text-[#c4000b]'
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
                <div key={item.id} className="flex gap-3 rounded-3xl border border-transparent p-2 transition hover:border-red-100 hover:bg-red-50/40">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center ${
                    item.type === 'invoice' ? 'rounded-2xl bg-emerald-50 text-emerald-700' :
                      item.type === 'order' ? 'rounded-2xl bg-red-50 text-[#e30613]' : 'rounded-2xl bg-amber-50 text-amber-700'
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
                      <span className="mt-1 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-black text-slate-500">
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

      <div className="admin-intro-details grid gap-6 lg:grid-cols-2">
        <section className="ops-card p-6">
          <div className="mb-4 flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <p className="ops-label">Sản phẩm nổi bật</p>
              <h2 className="mt-1 text-xl font-black text-[#172033]">Sản phẩm bán chạy</h2>
            </div>
            <select
              value={topProductsPeriod}
              onChange={event => setTopProductsPeriod(event.target.value)}
              className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-black text-[#172033] outline-none focus:border-[#e30613]"
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
              {topProducts.map((product, index) => {
                const progress = Math.max(6, (product.revenue / topProductMaxRevenue) * 100);
                return (
                  <div key={product.productId} className="rounded-3xl border border-slate-100 bg-white p-3 transition hover:border-red-100 hover:bg-red-50/40">
                    <div className="grid grid-cols-[42px_1fr_auto] items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e30613] text-xs font-black text-white">#{index + 1}</span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-[#172033]">{product.productName}</p>
                        <p className="text-xs text-slate-400">{product.unitsSold} máy đã bán</p>
                      </div>
                      <span className="text-sm font-black text-[#e30613]">{formatCurrency(product.revenue)}</span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-gradient-to-r from-[#e30613] to-[#f59e0b]" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="ops-card p-6">
          <div className="mb-4 flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <p className="ops-label">Khách hàng nổi bật</p>
              <h2 className="mt-1 text-xl font-black text-[#172033]">Khách hàng thân thiết</h2>
            </div>
            <select
              value={topCustomersPeriod}
              onChange={event => setTopCustomersPeriod(event.target.value)}
              className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-black text-[#172033] outline-none focus:border-[#e30613]"
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
              {topCustomers.map((customer, index) => {
                const progress = Math.max(6, (customer.totalSpent / topCustomerMaxSpent) * 100);
                return (
                  <div key={customer.customerId} className="rounded-3xl border border-slate-100 bg-white p-3 transition hover:border-amber-100 hover:bg-amber-50/40">
                    <div className="grid grid-cols-[42px_1fr_auto] items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#ffd166] text-xs font-black text-[#172033]">#{index + 1}</span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-[#172033]">{customer.fullName}</p>
                        <p className="text-xs text-slate-400">{customer.phone || 'Không có SĐT'} · {customer.ordersCount} đơn</p>
                      </div>
                      <span className="text-sm font-black text-[#e30613]">{formatCurrency(customer.totalSpent)}</span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-gradient-to-r from-[#ffd166] to-[#e30613]" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default AdminDashboard;
