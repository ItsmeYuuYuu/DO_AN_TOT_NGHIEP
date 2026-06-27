import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarClock,
  CheckCircle2,
  Clock3,
  MapPin,
  PackageCheck,
  RefreshCcw,
  RotateCcw,
  Truck,
  XCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from '@/features/auth/context/AuthContext';
import { shipmentsApi, type Shipment } from '@/features/shipping/api/shipmentsApi';
import { formatCurrency, formatDateTime } from '@/utils/formatters';
import { getApiErrorMessage } from '@/utils/apiError';

const statusLabels: Record<string, string> = {
  AwaitingPickup: 'Chờ lấy hàng',
  PickedUp: 'Đã lấy hàng',
  InTransit: 'Đang vận chuyển',
  OutForDelivery: 'Đang giao',
  DeliveryFailed: 'Giao thất bại',
  RedeliveryScheduled: 'Chờ giao lại',
  Returning: 'Đang hoàn về',
  ReturnedToWarehouse: 'Đã hoàn kho',
  Delivered: 'Giao thành công',
};

const statusClasses: Record<string, string> = {
  AwaitingPickup: 'bg-slate-100 text-slate-700',
  PickedUp: 'bg-indigo-50 text-[#4338ca]',
  InTransit: 'bg-indigo-50 text-indigo-700',
  OutForDelivery: 'bg-amber-50 text-amber-700',
  DeliveryFailed: 'bg-red-50 text-red-700',
  RedeliveryScheduled: 'bg-orange-50 text-orange-700',
  Returning: 'bg-purple-50 text-purple-700',
  ReturnedToWarehouse: 'bg-slate-200 text-slate-700',
  Delivered: 'bg-emerald-50 text-emerald-700',
};

const transitions: Record<string, string[]> = {
  AwaitingPickup: ['PickedUp'],
  PickedUp: ['InTransit'],
  InTransit: ['OutForDelivery', 'DeliveryFailed', 'Returning'],
  OutForDelivery: ['Delivered', 'DeliveryFailed'],
  DeliveryFailed: ['RedeliveryScheduled', 'Returning'],
  RedeliveryScheduled: ['OutForDelivery'],
  Returning: ['ReturnedToWarehouse'],
};

const StaffShipments: React.FC = () => {
  const { user } = useAuth();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [selected, setSelected] = useState<Shipment | null>(null);
  const [filter, setFilter] = useState('');
  const [working, setWorking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await shipmentsApi.getAll(filter || undefined);
      setShipments(response.data);
      setSelected(current =>
        current
          ? response.data.find(item => item.shipmentid === current.shipmentid) ?? null
          : null);
    } catch (requestError: unknown) {
      setError(getApiErrorMessage(requestError, 'Không thể tải danh sách vận chuyển.'));
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const stats = useMemo(() => ({
    total: shipments.length,
    delivering: shipments.filter(item => ['PickedUp', 'InTransit', 'OutForDelivery', 'RedeliveryScheduled'].includes(item.status)).length,
    failed: shipments.filter(item => ['DeliveryFailed', 'Returning'].includes(item.status)).length,
    completed: shipments.filter(item => item.status === 'Delivered').length,
  }), [shipments]);

  const nextStatuses = selected
    ? (transitions[selected.status] ?? []).filter(status =>
        user?.rolename !== 'Warehouse' || status === 'PickedUp' || status === 'ReturnedToWarehouse')
    : [];

  const statCards: Array<{ label: string; value: number; icon: LucideIcon }> = [
    { label: 'Tổng vận đơn', value: stats.total, icon: Truck },
    { label: 'Đang giao', value: stats.delivering, icon: Clock3 },
    { label: 'Cần xử lý', value: stats.failed, icon: XCircle },
    { label: 'Thành công', value: stats.completed, icon: CheckCircle2 },
  ];

  const updateStatus = async (status: string) => {
    if (!selected) return;
    setWorking(true);
    setError('');
    try {
      const response = await shipmentsApi.updateStatus(selected.shipmentid, status, note);
      setSelected(response.data);
      setNote('');
      await load();
    } catch (requestError: unknown) {
      setError(getApiErrorMessage(requestError, 'Không thể cập nhật trạng thái vận chuyển.'));
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="ops-hero flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="ops-hero-title">Theo dõi giao hàng</h1>
        </div>
        <button type="button" onClick={load} className="ops-hero-action">
          <RefreshCcw size={16} /> Làm mới
        </button>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {statCards.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.06)]">
            <Icon size={20} className="mb-3 text-[#4f46e5]" />
            <p className="text-xs font-bold uppercase text-slate-400">{label}</p>
            <p className="mt-1 text-2xl font-black text-slate-900">{value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-[0_10px_28px_rgba(15,23,42,0.06)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
          <h2 className="font-black text-slate-900">Danh sách vận đơn</h2>
          <select value={filter} onChange={event => setFilter(event.target.value)} className="rounded-2xl border border-slate-200 px-3 py-2 text-sm">
            <option value="">Tất cả trạng thái</option>
            {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Vận đơn</th>
                <th className="px-4 py-3">Khách nhận</th>
                <th className="px-4 py-3">Dự kiến</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-400">Đang tải...</td></tr>
              ) : shipments.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-400">Chưa có vận đơn phù hợp.</td></tr>
              ) : shipments.map(item => (
                <tr key={item.shipmentid} className="hover:bg-indigo-50/40">
                  <td className="px-4 py-3">
                    <p className="font-black text-slate-900">{item.trackingcode}</p>
                    <p className="text-xs text-slate-400">{item.carrier} · Đơn #{item.orderid}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-bold text-slate-800">{item.shippingname ?? '—'}</p>
                    <p className="text-xs text-slate-400">{item.shippingphone ?? '—'}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {item.estimateddeliveryat ? formatDateTime(item.estimateddeliveryat) : 'Chưa đặt'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusClasses[item.status] ?? 'bg-slate-100'}`}>
                      {statusLabels[item.status] ?? item.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button type="button" onClick={() => { setSelected(item); setNote(''); }} className="font-bold text-[#4f46e5] hover:underline">
                      Chi tiết
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 p-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-[#4f46e5]">{selected.carrier}</p>
                <h2 className="text-xl font-black text-slate-900">{selected.trackingcode}</h2>
                <p className="mt-1 text-sm text-slate-500">Đơn #{selected.orderid} · {formatCurrency(selected.finalamount)}</p>
              </div>
              <button type="button" onClick={() => setSelected(null)} className="rounded-2xl p-2 text-slate-400 hover:bg-slate-100"><XCircle size={21} /></button>
            </div>

            <div className="grid gap-4 p-6 md:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="flex items-center gap-2 text-xs font-black uppercase text-slate-400"><MapPin size={14} /> Người nhận</p>
                <p className="mt-2 font-bold text-slate-900">{selected.shippingname}</p>
                <p className="text-sm text-slate-600">{selected.shippingphone}</p>
                <p className="mt-1 text-sm text-slate-600">{selected.shippingaddress}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="flex items-center gap-2 text-xs font-black uppercase text-slate-400"><CalendarClock size={14} /> Giao hàng</p>
                <p className="mt-2 text-sm text-slate-700">Phí: <strong>{formatCurrency(selected.shippingfee)}</strong></p>
                <p className="text-sm text-slate-700">Dự kiến: <strong>{selected.estimateddeliveryat ? formatDateTime(selected.estimateddeliveryat) : '—'}</strong></p>
                <p className="text-sm text-slate-700">Số lần giao: <strong>{selected.deliveryattempts}</strong></p>
              </div>
            </div>

            <div className="px-6 pb-6">
              <h3 className="mb-3 font-black text-slate-900">Lịch sử vận chuyển</h3>
              <div className="space-y-3 border-l-2 border-slate-200 pl-5">
                {selected.histories.map(history => (
                  <div key={history.historyid} className="relative rounded-xl border border-slate-200 p-3">
                    <span className="absolute -left-[27px] top-4 h-3 w-3 rounded-full bg-[#4f46e5] ring-4 ring-white" />
                    <p className="font-bold text-slate-800">{statusLabels[history.tostatus] ?? history.tostatus}</p>
                    <p className="text-xs text-slate-400">
                      {history.createdat ? formatDateTime(history.createdat) : '—'} · {history.user ?? 'Hệ thống'}
                    </p>
                    {history.note && <p className="mt-1 text-sm text-slate-600">{history.note}</p>}
                  </div>
                ))}
              </div>
            </div>

            {nextStatuses.length > 0 && (
              <div className="border-t border-slate-200 bg-slate-50 p-6">
                <textarea value={note} onChange={event => setNote(event.target.value)} placeholder="Ghi chú cập nhật trạng thái..." className="mb-3 min-h-20 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#4f46e5]" />
                <div className="flex flex-wrap justify-end gap-2">
                  {nextStatuses.map(status => (
                    <button
                      key={status}
                      type="button"
                      disabled={working}
                      onClick={() => updateStatus(status)}
                      className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black text-white disabled:opacity-50 ${
                        status === 'Delivered' ? 'bg-emerald-600' :
                        status === 'DeliveryFailed' || status === 'Returning' ? 'bg-red-600' :
                        status === 'ReturnedToWarehouse' ? 'bg-purple-600' : 'bg-[#4f46e5]'
                      }`}
                    >
                      {status === 'Delivered' ? <PackageCheck size={16} /> : status.includes('Return') ? <RotateCcw size={16} /> : <Truck size={16} />}
                      {statusLabels[status]}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffShipments;
