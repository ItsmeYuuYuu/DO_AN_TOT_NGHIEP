import { useState, useEffect } from 'react';
import { dashboardApi } from '../api/dashboardApi';
import type { KpiResponse, TopProduct, OrderStatusDistribution } from '../api/dashboardApi';

export const useDashboard = (period: string) => {
  const [kpi, setKpi] = useState<KpiResponse | null>(null);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [distribution, setDistribution] = useState<OrderStatusDistribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      setLoading(true);
      setError(null);
      try {
        const results = await Promise.allSettled([
          dashboardApi.getKpi(period),
          dashboardApi.getTopProducts(period),
          dashboardApi.getOrderStatusDistribution(period)
        ]);

        const hasError = results.some(r => r.status === 'rejected');
        if (hasError) setError('Không tải được dữ liệu dashboard');

        if (results[0].status === 'fulfilled') setKpi(results[0].value.data);
        else setKpi(null);

        if (results[1].status === 'fulfilled') setTopProducts(results[1].value.data);
        else setTopProducts([]);

        if (results[2].status === 'fulfilled') setDistribution(results[2].value.data);
        else setDistribution([]);
      } catch (err) {
        setError('Không tải được dữ liệu dashboard');
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, [period]);

  return { kpi, topProducts, distribution, loading, error };
};
