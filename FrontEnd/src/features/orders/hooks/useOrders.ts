import { useState, useEffect } from 'react';
import { ordersApi } from '../api/ordersApi';
import type { Order } from '../api/ordersApi';

export const useOrders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await ordersApi.getAll();
      setOrders(res.data);
    } catch {
      setError('Không thể tải danh sách đơn hàng.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, []);

  const updateStatus = async (id: number, status: string) => {
    await ordersApi.updateStatus(id, status);
    setOrders((prev) =>
      prev.map((o) => o.orderid === id ? { ...o, orderstatus: status } : o)
    );
  };

  const bulkUpdateStatus = async (orderIds: number[], status: string) => {
    const res = await ordersApi.bulkUpdateStatus(orderIds, status);
    const { updatedOrderIds } = res.data;
    setOrders((prev) =>
      prev.map((o) => updatedOrderIds.includes(o.orderid) ? { ...o, orderstatus: status } : o)
    );
    return res.data;
  };

  return { orders, loading, error, refetch: fetchOrders, updateStatus, bulkUpdateStatus };
};
