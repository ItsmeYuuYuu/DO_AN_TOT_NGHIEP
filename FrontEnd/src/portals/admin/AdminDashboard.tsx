import React, { useState, useEffect, useCallback } from 'react';
import { formatCurrency } from '@/utils/formatters';
import { dashboardApi } from '@/features/dashboard/api/dashboardApi';
import type { 
  TodaySalesResults, 
  RevenueBreakdownItem, 
  RecentActivity, 
  TopCustomer, 
  TopProduct 
} from '@/features/dashboard/api/dashboardApi';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ShoppingBag, 
  XOctagon, 
  RefreshCw, 
  Search, 
  FileText, 
  History, 
  Activity
} from 'lucide-react';


// ─── Stat Card Component ──────────────────────────────────────────────────────
interface StatCardProps {
  title: string;
  value: string | number;
  subValue1?: { label: string; value: number };
  subValue2?: { label: string; value: number };
  icon: React.ReactNode;
  color: string;
  loading: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, subValue1, subValue2, icon, color, loading }) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-150 p-6 shadow-sm hover:shadow-md transition-shadow duration-300 flex flex-col justify-between h-40">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{title}</p>
          {loading ? (
            <div className="h-8 w-32 bg-slate-100 rounded-lg animate-pulse mt-2" />
          ) : (
            <p className="text-2xl font-black text-slate-800 mt-1.5 tracking-tight leading-none">{value}</p>
          )}
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color} shrink-0 shadow-inner`}>
          {icon}
        </div>
      </div>
      
      <div className="mt-4 border-t border-slate-50 pt-3 flex flex-col gap-1">
        {loading ? (
          <div className="h-4 w-full bg-slate-50 rounded animate-pulse" />
        ) : (
          <>
            {subValue1 && (
              <div className="flex items-center justify-between text-xs font-medium">
                <span className="text-slate-500">{subValue1.label}</span>
                <span className={`flex items-center gap-0.5 font-bold ${subValue1.value >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                  {subValue1.value >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {subValue1.value >= 0 ? '+' : ''}{subValue1.value}%
                </span>
              </div>
            )}
            {subValue2 && (
              <div className="flex items-center justify-between text-xs font-medium">
                <span className="text-slate-500">{subValue2.label}</span>
                <span className={`flex items-center gap-0.5 font-bold ${subValue2.value >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                  {subValue2.value >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {subValue2.value >= 0 ? '+' : ''}{subValue2.value}%
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// ─── Status Pill Badge mapping ────────────────────────────────────────────────
const statusConfig: Record<string, { label: string; badgeClass: string }> = {
  Completed:  { label: 'Hoàn thành', badgeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-250' },
  Shipped:    { label: 'Đang giao',  badgeClass: 'bg-blue-50 text-blue-700 border border-blue-250' },
  Processing: { label: 'Đang xử lý', badgeClass: 'bg-amber-50 text-amber-700 border border-amber-250' },
  Pending:    { label: 'Chờ duyệt',  badgeClass: 'bg-slate-100 text-slate-700 border border-slate-200' },
  Cancelled:  { label: 'Đã hủy',     badgeClass: 'bg-rose-50 text-rose-700 border border-rose-250' },
};

// ─── Admin Dashboard Main Component ──────────────────────────────────────────
const AdminDashboard: React.FC = () => {
  // Today KPI State
  const [todayResults, setTodayResults] = useState<TodaySalesResults | null>(null);
  const [todayLoading, setTodayLoading] = useState(true);
  const [todayError, setTodayError] = useState<string | null>(null);

  // Revenue breakdown chart state
  const [revenuePeriod, setRevenuePeriod] = useState<string>('this_month');
  const [revenueGroupBy, setRevenueGroupBy] = useState<string>('day');
  const [revenueData, setRevenueData] = useState<RevenueBreakdownItem[]>([]);
  const [revenueLoading, setRevenueLoading] = useState(true);
  const [revenueError, setRevenueError] = useState<string | null>(null);

  // Recent activities state
  const [activityType, setActivityType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedQuery, setDebouncedQuery] = useState<string>('');
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const [activitiesError, setActivitiesError] = useState<string | null>(null);

  // Top products state
  const [topProductsPeriod, setTopProductsPeriod] = useState<string>('this_month');
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [topProductsLoading, setTopProductsLoading] = useState(true);
  const [topProductsError, setTopProductsError] = useState<string | null>(null);

  // Top customers state
  const [topCustomersPeriod, setTopCustomersPeriod] = useState<string>('this_month');
  const [topCustomers, setTopCustomers] = useState<TopCustomer[]>([]);
  const [topCustomersLoading, setTopCustomersLoading] = useState(true);
  const [topCustomersError, setTopCustomersError] = useState<string | null>(null);

  // Refresh trigger
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Format activity time
  const formatActivityTime = (ts: string) => {
    try {
      const d = new Date(ts);
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      const timeStr = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      const itemDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      
      if (itemDate.getTime() === today.getTime()) {
        return `Hôm nay, ${timeStr}`;
      } else if (itemDate.getTime() === yesterday.getTime()) {
        return `Hôm qua, ${timeStr}`;
      } else {
        return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')} ${timeStr}`;
      }
    } catch {
      return '';
    }
  };

  // Fetch functions
  const fetchTodayResults = useCallback(async () => {
    setTodayLoading(true);
    setTodayError(null);
    try {
      const res = await dashboardApi.getTodayResults();
      setTodayResults(res.data);
    } catch {
      setTodayError('Không tải được kết quả bán hàng hôm nay');
    } finally {
      setTodayLoading(false);
    }
  }, []);

  const fetchRevenueBreakdown = useCallback(async () => {
    setRevenueLoading(true);
    setRevenueError(null);
    try {
      const res = await dashboardApi.getRevenueBreakdown(revenuePeriod, revenueGroupBy);
      setRevenueData(res.data);
    } catch {
      setRevenueError('Không tải được biểu đồ doanh thu');
    } finally {
      setRevenueLoading(false);
    }
  }, [revenueGroupBy, revenuePeriod]);

  const fetchRecentActivities = useCallback(async () => {
    setActivitiesLoading(true);
    setActivitiesError(null);
    try {
      const res = await dashboardApi.getRecentActivities(activityType, debouncedQuery, 15);
      setActivities(res.data);
    } catch {
      setActivitiesError('Không tải được hoạt động gần đây');
    } finally {
      setActivitiesLoading(false);
    }
  }, [activityType, debouncedQuery]);

  const fetchTopProducts = useCallback(async () => {
    setTopProductsLoading(true);
    setTopProductsError(null);
    try {
      const res = await dashboardApi.getTopProductsV2(topProductsPeriod, 10);
      setTopProducts(res.data);
    } catch {
      setTopProductsError('Không tải được sản phẩm bán chạy');
    } finally {
      setTopProductsLoading(false);
    }
  }, [topProductsPeriod]);

  const fetchTopCustomers = useCallback(async () => {
    setTopCustomersLoading(true);
    setTopCustomersError(null);
    try {
      const res = await dashboardApi.getTopCustomers(topCustomersPeriod, 10);
      setTopCustomers(res.data);
    } catch {
      setTopCustomersError('Không tải được top khách hàng');
    } finally {
      setTopCustomersLoading(false);
    }
  }, [topCustomersPeriod]);

  // Triggers
  useEffect(() => {
    fetchTodayResults();
    setLastUpdated(new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  }, [fetchTodayResults, refreshKey]);

  useEffect(() => {
    fetchRevenueBreakdown();
  }, [fetchRevenueBreakdown, refreshKey]);

  useEffect(() => {
    fetchRecentActivities();
  }, [fetchRecentActivities, refreshKey]);

  useEffect(() => {
    fetchTopProducts();
  }, [fetchTopProducts, refreshKey]);

  useEffect(() => {
    fetchTopCustomers();
  }, [fetchTopCustomers, refreshKey]);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  // Helper for custom bar chart heights
  const maxRevenue = Math.max(...revenueData.map(item => item.revenue), 0);
  const chartHeightLimit = maxRevenue > 0 ? maxRevenue : 1;

  // Format short values for Y-axis helper
  const formatYAxisValue = (val: number) => {
    if (val >= 1000000000) {
      return (val / 1000000000).toFixed(1).replace('.0', '') + ' tỷ';
    }
    if (val >= 1000000) {
      return (val / 1000000).toFixed(1).replace('.0', '') + ' triệu';
    }
    if (val >= 1000) {
      return (val / 1000).toFixed(0) + 'k';
    }
    return val.toString();
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-10">
      
      {/* ─── Top Control Dashboard Title ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-150 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Activity className="text-blue-600" size={24} />
            Tổng Quan Kinh Doanh
          </h2>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            Theo dõi doanh số, hóa đơn, luồng kho và xếp hạng kinh doanh. Cập nhật mới nhất lúc <span className="font-bold text-slate-700">{lastUpdated || '--:--'}</span>.
          </p>
        </div>
        
        <button 
          onClick={handleRefresh}
          className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-700 hover:text-blue-700 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-xl transition-all shadow-sm shrink-0"
        >
          <RefreshCw size={16} className={`${todayLoading || revenueLoading || activitiesLoading ? 'animate-spin' : ''}`} />
          Tải lại dữ liệu
        </button>
      </div>

      {todayError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 px-5 py-4 rounded-2xl font-bold flex items-center gap-2">
          <span className="text-rose-600">⚠</span>
          <div>{todayError}</div>
        </div>
      )}

      {/* ─── Today KPIs Stat Cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Doanh thu thuần hôm nay"
          value={todayResults ? formatCurrency(todayResults.netRevenueToday) : '0đ'}
          subValue1={todayResults ? { label: 'So với hôm qua', value: todayResults.changeVsYesterdayPercentage } : undefined}
          subValue2={todayResults ? { label: 'Cùng ngày tháng trước', value: todayResults.changeVsLastMonthPercentage } : undefined}
          color="bg-blue-50 text-blue-600"
          icon={<DollarSign size={24} />}
          loading={todayLoading}
        />
        
        <StatCard
          title="Hóa đơn hoàn thành"
          value={todayResults ? `${todayResults.invoicesToday} hóa đơn` : '0 hóa đơn'}
          subValue1={todayResults ? { label: 'Giá trị TB hôm nay', value: todayResults.invoicesToday > 0 ? Math.round(todayResults.netRevenueToday / todayResults.invoicesToday / 1000) * 1000 : 0 } : undefined}
          icon={<FileText size={24} />}
          color="bg-emerald-50 text-emerald-600"
          loading={todayLoading}
        />

        <StatCard
          title="Trả hàng / Hủy đơn hôm nay"
          value={todayResults ? `${todayResults.returnsToday} đơn` : '0 đơn'}
          icon={<XOctagon size={24} />}
          color="bg-rose-50 text-rose-600"
          loading={todayLoading}
        />
      </div>


      {/* ─── Middle Section: Revenue Chart + Recent Activities ──────────────────── */}
      <div id="phan-tich" className="grid grid-cols-1 lg:grid-cols-3 gap-6 scroll-mt-32">
        
        {/* Revenue Chart Box */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-150 p-6 shadow-sm flex flex-col h-[460px]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h3 className="font-extrabold text-slate-800 text-base">Biểu đồ doanh thu</h3>
              <p className="text-xs text-slate-400 font-medium">Phân tích dòng doanh số theo các bộ lọc</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              {/* Group By Filter */}
              <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                {(['hour', 'day', 'dayofweek'] as const).map((g) => {
                  const label = g === 'hour' ? 'Giờ' : g === 'day' ? 'Ngày' : 'Thứ';
                  return (
                    <button
                      key={g}
                      onClick={() => setRevenueGroupBy(g)}
                      className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                        revenueGroupBy === g 
                          ? 'bg-white text-slate-800 shadow-sm' 
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {/* Period Filter */}
              <select
                value={revenuePeriod}
                onChange={(e) => setRevenuePeriod(e.target.value)}
                className="bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="today">Hôm nay</option>
                <option value="yesterday">Hôm qua</option>
                <option value="7d">7 ngày qua</option>
                <option value="30d">30 ngày qua</option>
                <option value="this_month">Tháng này</option>
              </select>
            </div>
          </div>

          {/* Chart Content Area */}
          <div className="flex-1 flex flex-col justify-end relative mt-6 pb-2">
            {revenueError && (
              <div className="absolute inset-0 flex items-center justify-center text-rose-500 text-sm font-semibold bg-white/80">
                {revenueError}
              </div>
            )}
            
            {revenueLoading ? (
              <div className="h-full flex items-end justify-between px-2 gap-4 animate-pulse pt-8">
                {Array.from({ length: 12 }).map((_, idx) => (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full bg-slate-100 rounded-t-lg" style={{ height: `${Math.max(10, Math.sin(idx) * 80 + 20)}%` }} />
                    <div className="h-3 w-8 bg-slate-100 rounded" />
                  </div>
                ))}
              </div>
            ) : revenueData.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm gap-2">
                <TrendingUp size={32} className="text-slate-300" />
                Không có dữ liệu kinh doanh trong chu kỳ được chọn.
              </div>
            ) : (
              <div className="h-full flex flex-col justify-between pt-6">
                {/* Visual Chart Canvas Grid & Bars */}
                <div className="flex-1 relative flex items-end">
                  
                  {/* Background Y-Axis Guide Lines */}
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none text-[10px] text-slate-400">
                    <div className="w-full border-t border-dashed border-slate-100 flex justify-between pt-0.5">
                      <span>{formatYAxisValue(maxRevenue)}</span>
                    </div>
                    <div className="w-full border-t border-dashed border-slate-100 flex justify-between pt-0.5">
                      <span>{formatYAxisValue(maxRevenue * 0.75)}</span>
                    </div>
                    <div className="w-full border-t border-dashed border-slate-100 flex justify-between pt-0.5">
                      <span>{formatYAxisValue(maxRevenue * 0.5)}</span>
                    </div>
                    <div className="w-full border-t border-dashed border-slate-100 flex justify-between pt-0.5">
                      <span>{formatYAxisValue(maxRevenue * 0.25)}</span>
                    </div>
                    <div className="w-full border-t border-slate-200 pt-0.5">
                      <span>0</span>
                    </div>
                  </div>

                  {/* Vertical Bars container */}
                  <div className="w-full h-full flex items-end justify-between gap-1 sm:gap-2 px-1 relative z-10 select-none overflow-x-auto scrollbar-none">
                    {revenueData.map((item, index) => {
                      const pctHeight = (item.revenue / chartHeightLimit) * 100;
                      return (
                        <div key={index} className="flex-1 min-w-[20px] max-w-[60px] h-full flex flex-col justify-end items-center group relative">
                          
                          {/* CSS-only Tooltip on Hover */}
                          <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center z-30 transition-all duration-200">
                            <div className="bg-slate-900 text-white text-[10px] sm:text-xs font-bold px-2.5 py-1.5 rounded-lg shadow-xl whitespace-nowrap">
                              <p className="text-slate-400 font-medium text-[9px] uppercase">{item.label}</p>
                              <p className="mt-0.5 text-blue-300">{formatCurrency(item.revenue)}</p>
                            </div>
                            <div className="w-2.5 h-2.5 -mt-1.5 rotate-45 bg-slate-900" />
                          </div>

                          {/* Interactive Bar */}
                          <div 
                            style={{ height: `${Math.max(1.5, pctHeight)}%` }}
                            className={`w-full rounded-t-lg transition-all duration-500 ease-out ${
                              item.revenue > 0 
                                ? 'bg-gradient-to-t from-blue-600 to-indigo-500 group-hover:from-blue-500 group-hover:to-indigo-400 shadow-md group-hover:shadow-lg' 
                                : 'bg-slate-100'
                            }`}
                          />

                          {/* X-axis Label */}
                          <span className="text-[10px] font-bold text-slate-500 mt-2 truncate w-full text-center">
                            {item.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Live Activities Feed Sidebar */}
        <div className="bg-white rounded-2xl border border-slate-150 p-5 shadow-sm flex flex-col h-[460px]">
          <div className="pb-3 border-b border-slate-100">
            <h3 className="font-extrabold text-slate-800 text-base">Nhật ký hoạt động</h3>
            <p className="text-xs text-slate-400 font-medium mt-0.5">Hóa đơn, đơn hàng và sự kiện hệ thống</p>
          </div>

          {/* Search bar inside Sidebar */}
          <div className="mt-3 relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search size={14} />
            </span>
            <input
              type="text"
              placeholder="Tìm kiếm mã, nhân viên, khách hàng..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white placeholder-slate-400 transition-all"
            />
          </div>

          {/* Tab Filter Switcher */}
          <div className="mt-3 flex gap-1 border-b border-slate-100 pb-2 overflow-x-auto scrollbar-none">
            {([
              { id: 'all', label: 'Tất cả' },
              { id: 'invoice', label: 'Hóa đơn' },
              { id: 'order', label: 'Đặt hàng' },
              { id: 'audit', label: 'Thủ kho' }
            ]).map(tab => (
              <button
                key={tab.id}
                onClick={() => setActivityType(tab.id)}
                className={`px-3 py-1 text-[11px] font-bold rounded-lg whitespace-nowrap transition-all ${
                  activityType === tab.id
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Activities List */}
          <div className="flex-1 overflow-y-auto mt-3 pr-1 space-y-3.5 scrollbar-thin">
            {activitiesError && (
              <div className="text-center text-xs text-rose-500 py-8 font-semibold">
                {activitiesError}
              </div>
            )}
            
            {activitiesLoading ? (
              Array.from({ length: 6 }).map((_, idx) => (
                <div key={idx} className="flex gap-3 items-center animate-pulse">
                  <div className="w-8 h-8 rounded-lg bg-slate-100" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-slate-100 rounded w-3/4" />
                    <div className="h-2 bg-slate-50 rounded w-1/2" />
                  </div>
                </div>
              ))
            ) : activities.length === 0 ? (
              <div className="text-center text-slate-400 text-xs py-12">
                Không tìm thấy hoạt động phù hợp.
              </div>
            ) : (
              activities.map((item) => {
                const isInvoice = item.type === 'invoice';
                const isOrder = item.type === 'order';
                
                let iconEl = <History size={14} />;
                let iconBg = 'bg-amber-50 text-amber-600 border border-amber-150';
                
                if (isInvoice) {
                  iconEl = <FileText size={14} />;
                  iconBg = 'bg-emerald-50 text-emerald-600 border border-emerald-150';
                } else if (isOrder) {
                  iconEl = <ShoppingBag size={14} />;
                  iconBg = 'bg-blue-50 text-blue-600 border border-blue-150';
                }

                const config = item.status ? statusConfig[item.status] : null;

                return (
                  <div key={item.id} className="flex items-start justify-between gap-3 text-xs p-2 hover:bg-slate-50 rounded-xl transition-all border border-transparent hover:border-slate-100">
                    <div className="flex gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm ${iconBg}`}>
                        {iconEl}
                      </div>
                      <div className="min-w-0">
                        <p className="font-extrabold text-slate-700 leading-tight">{item.title}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5 font-medium">{item.subtitle}</p>
                        <span className="text-[10px] text-slate-400 font-bold block mt-1">{formatActivityTime(item.timestamp)}</span>
                      </div>
                    </div>
                    
                    <div className="text-right shrink-0 flex flex-col items-end gap-1">
                      {item.amount !== null && item.amount !== undefined && (
                        <span className="font-bold text-slate-800">
                          +{formatCurrency(item.amount)}
                        </span>
                      )}
                      {config && (
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider ${config.badgeClass}`}>
                          {config.label}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* ─── Bottom Section: Best Selling Products & Top Spending Customers ──────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Top 10 Best Sellers Grid */}
        <div className="bg-white rounded-2xl border border-slate-150 p-6 shadow-sm flex flex-col h-[520px]">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="font-extrabold text-slate-800 text-base">Top 10 Sản phẩm bán chạy nhất</h3>
              <p className="text-xs text-slate-400 font-medium">Bảng xếp hạng dựa trên số lượng biến thể bán ra</p>
            </div>
            
            <select
              value={topProductsPeriod}
              onChange={(e) => setTopProductsPeriod(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="7d">7 ngày qua</option>
              <option value="30d">30 ngày qua</option>
              <option value="this_month">Tháng này</option>
            </select>
          </div>

          <div className="flex-1 overflow-y-auto mt-4 scrollbar-thin">
            {topProductsError && (
              <div className="text-center text-xs text-rose-500 py-12 font-semibold">
                {topProductsError}
              </div>
            )}
            
            {topProductsLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 8 }).map((_, idx) => (
                  <div key={idx} className="h-10 bg-slate-50 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : topProducts.length === 0 ? (
              <div className="text-center text-slate-400 text-xs py-24">
                Không tìm thấy dữ liệu sản phẩm trong kỳ.
              </div>
            ) : (
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-slate-50 pb-2">
                    <th className="py-2.5 pl-3 w-12 text-center">Hạng</th>
                    <th className="py-2.5">Tên sản phẩm</th>
                    <th className="py-2.5 text-center w-24">Số lượng</th>
                    <th className="py-2.5 text-right pr-3 w-32">Tổng doanh số</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 font-semibold">
                  {topProducts.map((p, index) => {
                    const rankBg = index === 0 ? 'bg-amber-100 text-amber-700 border-amber-200' : index === 1 ? 'bg-slate-100 text-slate-700 border-slate-200' : index === 2 ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-slate-50 text-slate-500';
                    return (
                      <tr key={p.productId} className="hover:bg-slate-50/55 transition-colors group">
                        <td className="py-3 pl-3 text-center">
                          <span className={`inline-flex items-center justify-center w-6 h-6 rounded-lg text-[11px] font-extrabold border ${rankBg}`}>
                            {index + 1}
                          </span>
                        </td>
                        <td className="py-3 text-slate-700 font-extrabold max-w-[200px] truncate group-hover:text-blue-600 transition-colors">
                          {p.productName}
                        </td>
                        <td className="py-3 text-center text-slate-600 font-extrabold">
                          {p.unitsSold}
                        </td>
                        <td className="py-3 text-right pr-3 font-black text-slate-800">
                          {formatCurrency(p.revenue)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Top 10 Spending Customers Grid */}
        <div className="bg-white rounded-2xl border border-slate-150 p-6 shadow-sm flex flex-col h-[520px]">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="font-extrabold text-slate-800 text-base">Top 10 Khách hàng thân thiết</h3>
              <p className="text-xs text-slate-400 font-medium">Khách hàng chi tiêu nhiều nhất trong kỳ</p>
            </div>
            
            <select
              value={topCustomersPeriod}
              onChange={(e) => setTopCustomersPeriod(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="7d">7 ngày qua</option>
              <option value="30d">30 ngày qua</option>
              <option value="this_month">Tháng này</option>
            </select>
          </div>

          <div className="flex-1 overflow-y-auto mt-4 scrollbar-thin">
            {topCustomersError && (
              <div className="text-center text-xs text-rose-500 py-12 font-semibold">
                {topCustomersError}
              </div>
            )}
            
            {topCustomersLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 8 }).map((_, idx) => (
                  <div key={idx} className="h-10 bg-slate-50 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : topCustomers.length === 0 ? (
              <div className="text-center text-slate-400 text-xs py-24">
                Không tìm thấy dữ liệu khách hàng trong kỳ.
              </div>
            ) : (
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-slate-50 pb-2">
                    <th className="py-2.5 pl-3 w-12 text-center">Hạng</th>
                    <th className="py-2.5">Khách hàng</th>
                    <th className="py-2.5 text-center w-24">Số đơn</th>
                    <th className="py-2.5 text-right pr-3 w-32">Tổng chi tiêu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 font-semibold">
                  {topCustomers.map((c, index) => {
                    const rankBg = index === 0 ? 'bg-amber-100 text-amber-700 border-amber-200' : index === 1 ? 'bg-slate-100 text-slate-700 border-slate-200' : index === 2 ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-slate-50 text-slate-500';
                    return (
                      <tr key={c.customerId} className="hover:bg-slate-50/55 transition-colors group">
                        <td className="py-3 pl-3 text-center">
                          <span className={`inline-flex items-center justify-center w-6 h-6 rounded-lg text-[11px] font-extrabold border ${rankBg}`}>
                            {index + 1}
                          </span>
                        </td>
                        <td className="py-3 text-slate-700 font-extrabold">
                          <div className="min-w-0">
                            <p className="truncate text-slate-800">{c.fullName}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5 font-medium">{c.phone || 'Không có SĐT'}</p>
                          </div>
                        </td>
                        <td className="py-3 text-center text-slate-600 font-extrabold">
                          {c.ordersCount}
                        </td>
                        <td className="py-3 text-right pr-3 font-black text-slate-800">
                          {formatCurrency(c.totalSpent)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};

export default AdminDashboard;
