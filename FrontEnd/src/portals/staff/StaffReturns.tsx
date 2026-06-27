import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Eye,
  PackageCheck,
  RefreshCcw,
  RotateCcw,
  UserCheck,
  WalletCards,
  XCircle,
} from 'lucide-react';
import apiClient from '@/api/apiClient';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { Skeleton } from '@/components/Skeleton';
import { useAuth } from '@/features/auth/context/AuthContext';
import {
  returnRequestsApi,
  type ReceiveReturnItemPayload,
  type ReturnEmployee,
  type ReturnRequest,
} from '@/features/returns/api/returnRequestsApi';
import { getApiErrorMessage } from '@/utils/apiError';
import { formatCurrency, formatDateTime } from '@/utils/formatters';

interface InventoryItem {
  imei: string;
  variantid?: number;
  status?: string;
  variantSku?: string;
  productName?: string;
}

interface ReceiveFormItem {
  condition: string;
  disposition: 'Restock' | 'Warranty' | 'Damaged';
  replacementimei: string;
  refundamount: string;
}

const statusLabels: Record<string, string> = {
  PendingReview: 'Chờ Sales duyệt',
  Approved: 'Chờ kho tiếp nhận',
  Rejected: 'Từ chối',
  RefundPending: 'Chờ hoàn tiền',
  Completed: 'Hoàn tất',
  Cancelled: 'Khách đã hủy',
};

const statusClasses: Record<string, string> = {
  PendingReview: 'bg-amber-50 text-amber-700',
  Approved: 'bg-indigo-50 text-[#4338ca]',
  Rejected: 'bg-red-50 text-red-700',
  RefundPending: 'bg-violet-50 text-violet-700',
  Completed: 'bg-emerald-50 text-emerald-700',
  Cancelled: 'bg-slate-100 text-slate-600',
};

const StaffReturns: React.FC = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<ReturnRequest[]>([]);
  const [employees, setEmployees] = useState<ReturnEmployee[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [selected, setSelected] = useState<ReturnRequest | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [reviewNote, setReviewNote] = useState('');
  const [resolution, setResolution] = useState('');
  const [receiveNote, setReceiveNote] = useState('');
  const [receiveItems, setReceiveItems] = useState<Record<number, ReceiveFormItem>>({});
  const [refundAmount, setRefundAmount] = useState('');
  const [refundProvider, setRefundProvider] = useState('VNPay');
  const [refundReference, setRefundReference] = useState('');
  const [refundNote, setRefundNote] = useState('');

  const canAssign = user?.rolename === 'Admin' || user?.rolename === 'Manager';
  const canReview = canAssign || user?.rolename === 'Sales';
  const canReceive = canAssign || user?.rolename === 'Warehouse';
  const currentUserId = Number(user?.userid);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await returnRequestsApi.getAll(statusFilter || undefined);
      setRequests(response.data);
      setSelected(current =>
        current
          ? response.data.find(item => item.returnrequestid === current.returnrequestid) ?? null
          : null,
      );
    } catch (requestError: unknown) {
      setError(getApiErrorMessage(requestError, 'Không thể tải hàng đợi đổi trả.'));
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  useEffect(() => {
    if (canAssign) {
      returnRequestsApi.getEmployees()
        .then(response => setEmployees(response.data))
        .catch(() => setEmployees([]));
    }
    if (canReceive) {
      apiClient.get<InventoryItem[]>('/Inventory')
        .then(response => setInventory(response.data))
        .catch(() => setInventory([]));
    }
  }, [canAssign, canReceive]);

  useEffect(() => {
    if (!selected || !canReceive) return;
    apiClient.get<InventoryItem[]>('/Inventory')
      .then(response => setInventory(response.data))
      .catch(() => setInventory([]));
  }, [selected, canReceive]);

  const stats = useMemo(() => ({
    total: requests.length,
    waiting: requests.filter(item => item.status === 'PendingReview').length,
    warehouse: requests.filter(item => item.status === 'Approved').length,
    refund: requests.filter(item => item.status === 'RefundPending').length,
  }), [requests]);

  const openDetail = (request: ReturnRequest) => {
    setSelected(request);
    setReviewNote(request.reviewnote ?? '');
    setResolution(request.resolution ?? '');
    setReceiveNote('');
    setRefundAmount(Math.max(
      0,
      request.requestedrefundamount - (request.refundamount ?? 0),
    ).toString());
    setRefundProvider('VNPay');
    setRefundReference('');
    setRefundNote('');
    setReceiveItems(Object.fromEntries(request.items.map(item => [
      item.returnitemid,
      {
        condition: item.condition ?? '',
        disposition: (item.disposition as ReceiveFormItem['disposition']) ?? 'Restock',
        replacementimei: item.replacementimei ?? '',
        refundamount: item.refundamount.toString(),
      },
    ])));
  };

  const runAction = async (action: () => Promise<{ data: ReturnRequest }>) => {
    setWorking(true);
    setError('');
    try {
      const response = await action();
      openDetail(response.data);
      await loadRequests();
    } catch (requestError: unknown) {
      setError(getApiErrorMessage(requestError, 'Không thể cập nhật yêu cầu đổi trả.'));
    } finally {
      setWorking(false);
    }
  };

  const handleReceive = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    const items: ReceiveReturnItemPayload[] = selected.items.map(item => {
      const form = receiveItems[item.returnitemid];
      return {
        returnitemid: item.returnitemid,
        condition: form.condition.trim(),
        disposition: form.disposition,
        replacementimei: form.replacementimei.trim() || undefined,
        refundamount: selected.requesttype === 'Return'
          ? Number(form.refundamount)
          : undefined,
      };
    });
    await runAction(() => returnRequestsApi.receive(
      selected.returnrequestid,
      items,
      resolution.trim() || undefined,
      receiveNote.trim() || undefined,
    ));
  };

  const handleRefund = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    await runAction(() => returnRequestsApi.refund(
      selected.returnrequestid,
      Number(refundAmount),
      refundProvider,
      refundReference.trim() || undefined,
      refundNote.trim() || undefined,
    ));
  };

  const updateReceiveItem = (
    id: number,
    field: keyof ReceiveFormItem,
    value: string,
  ) => {
    setReceiveItems(current => ({
      ...current,
      [id]: { ...current[id], [field]: value },
    }));
  };

  return (
    <div className="space-y-6">
      <div className="ops-hero flex flex-wrap items-center justify-between gap-4 p-6">
        <div>
          <h1 className="ops-hero-title">Đổi trả & hoàn tiền</h1>
        </div>
        <Button variant="secondary" onClick={loadRequests} className="border-red-100 bg-white text-[#c4000b] hover:bg-red-50">
          <RefreshCcw size={16} className="mr-2" /> Làm mới
        </Button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Tổng yêu cầu', stats.total, RotateCcw, 'text-slate-700'],
          ['Chờ duyệt', stats.waiting, UserCheck, 'text-amber-600'],
          ['Chờ kho', stats.warehouse, PackageCheck, 'text-[#4f46e5]'],
          ['Chờ hoàn tiền', stats.refund, WalletCards, 'text-violet-600'],
        ].map(([label, value, Icon, color]) => {
          const CardIcon = Icon as typeof RotateCcw;
          return (
            <div key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.06)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label as string}</p>
                  <p className="mt-1 text-2xl font-black text-slate-900">{value as number}</p>
                </div>
                <CardIcon size={24} className={color as string} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_28px_rgba(15,23,42,0.06)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
          <h2 className="font-black text-slate-800">Hàng đợi xử lý</h2>
          <select
            value={statusFilter}
            onChange={event => setStatusFilter(event.target.value)}
            className="rounded-2xl border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="">Tất cả trạng thái</option>
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Phiếu / đơn</th>
                <th className="px-4 py-3">Khách hàng</th>
                <th className="px-4 py-3">Loại</th>
                <th className="px-4 py-3">IMEI</th>
                <th className="px-4 py-3">Phụ trách</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={7} className="p-4"><Skeleton className="h-12 w-full" /></td></tr>
              ) : requests.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-400">Không có yêu cầu phù hợp.</td></tr>
              ) : requests.map(request => (
                <tr key={request.returnrequestid} className="hover:bg-indigo-50/40">
                  <td className="px-4 py-3">
                    <p className="font-black text-slate-800">#{request.returnrequestid}</p>
                    <p className="text-xs text-slate-400">Đơn #{request.orderid}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-bold text-slate-700">{request.customername}</p>
                    <p className="text-xs text-slate-400">{request.customerphone}</p>
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold">
                    {request.requesttype === 'Return' ? 'Trả hàng' : 'Đổi máy'}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {request.items.map(item => item.imei).join(', ')}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500">{request.assigneduser ?? 'Chưa có'}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusClasses[request.status] ?? 'bg-slate-100'}`}>
                      {statusLabels[request.status] ?? request.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" variant="ghost" onClick={() => openDetail(request)}>
                      <Eye size={14} className="mr-1.5" /> Chi tiết
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={selected !== null}
        onClose={() => !working && setSelected(null)}
        title={selected ? `Yêu cầu đổi trả #${selected.returnrequestid}` : 'Chi tiết'}
        size="xl"
      >
        {selected && (
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-5">
              <div className="rounded-xl bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase text-slate-400">Đơn #{selected.orderid}</p>
                    <p className="mt-1 font-black text-slate-900">{selected.customername}</p>
                    <p className="text-sm text-slate-500">{selected.reason}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusClasses[selected.status] ?? 'bg-slate-100'}`}>
                    {statusLabels[selected.status] ?? selected.status}
                  </span>
                </div>
                {selected.description && <p className="mt-3 text-sm text-slate-600">{selected.description}</p>}
              </div>

              <div className="space-y-3">
                {selected.items.map(item => (
                  <div key={item.returnitemid} className="rounded-xl border border-slate-200 p-4">
                    <p className="font-black text-slate-800">{item.productname ?? item.sku ?? 'Sản phẩm'}</p>
                    <p className="mt-1 text-xs text-slate-500">IMEI bán ra: {item.imei}</p>
                    {item.replacementimei && <p className="text-xs font-bold text-emerald-600">IMEI thay thế: {item.replacementimei}</p>}
                    {item.condition && <p className="mt-2 text-sm text-slate-600">Tình trạng: {item.condition}</p>}
                    {item.disposition && <p className="text-sm text-slate-600">Phân loại: {item.disposition}</p>}
                  </div>
                ))}
              </div>

              {selected.imageurls.length > 0 && (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {selected.imageurls.map(url => (
                    <a key={url} href={url} target="_blank" rel="noreferrer">
                      <img src={url} alt="Ảnh đổi trả" className="h-28 w-full rounded-xl border border-slate-200 object-cover" />
                    </a>
                  ))}
                </div>
              )}

              <div>
                <h3 className="mb-3 text-sm font-black text-slate-800">Lịch sử xử lý</h3>
                <div className="space-y-3 border-l-2 border-slate-100 pl-4">
                  {selected.histories.map(history => (
                    <div key={history.historyid} className="relative">
                      <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-indigo-500 ring-4 ring-white" />
                      <p className="text-sm font-bold text-slate-700">{statusLabels[history.tostatus] ?? history.tostatus}</p>
                      <p className="text-xs text-slate-400">
                        {history.userfullname ?? 'Hệ thống'} · {history.createdat ? formatDateTime(history.createdat) : 'Chưa có thời gian'}
                      </p>
                      {history.note && <p className="mt-1 text-sm text-slate-500">{history.note}</p>}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {!selected.assigneduserid && user?.rolename === 'Sales' && (
                <Button fullWidth isLoading={working} onClick={() => runAction(() => returnRequestsApi.claim(selected.returnrequestid))}>
                  <UserCheck size={16} className="mr-2" /> Nhận xử lý
                </Button>
              )}

              {canAssign && !['Rejected', 'Cancelled', 'Completed'].includes(selected.status) && (
                <div className="rounded-xl border border-slate-200 p-4">
                  <label className="mb-2 block text-sm font-black text-slate-800">Phân công Sales</label>
                  <select
                    value={selected.assigneduserid ?? ''}
                    onChange={event => {
                      const id = Number(event.target.value);
                      if (id) runAction(() => returnRequestsApi.assign(selected.returnrequestid, id));
                    }}
                    className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                  >
                    <option value="">Chọn nhân viên</option>
                    {employees.map(employee => (
                      <option key={employee.userid} value={employee.userid}>{employee.fullname}</option>
                    ))}
                  </select>
                </div>
              )}

              {selected.status === 'PendingReview' && canReview &&
               (user?.rolename !== 'Sales' || selected.assigneduserid === currentUserId) && (
                <div className="space-y-3 rounded-xl border border-slate-200 p-4">
                  <h3 className="font-black text-slate-800">Duyệt yêu cầu</h3>
                  <textarea
                    rows={3}
                    value={reviewNote}
                    onChange={event => setReviewNote(event.target.value)}
                    placeholder="Ghi chú duyệt hoặc lý do từ chối"
                    className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="danger" isLoading={working} onClick={() => runAction(() =>
                      returnRequestsApi.review(selected.returnrequestid, false, reviewNote.trim()))}>
                      <XCircle size={15} className="mr-1.5" /> Từ chối
                    </Button>
                    <Button isLoading={working} onClick={() => runAction(() =>
                      returnRequestsApi.review(selected.returnrequestid, true, reviewNote.trim() || undefined))}>
                      <CheckCircle2 size={15} className="mr-1.5" /> Duyệt
                    </Button>
                  </div>
                </div>
              )}

              {selected.status === 'Approved' && canReceive && (
                <form onSubmit={handleReceive} className="space-y-4 rounded-xl border border-slate-200 p-4">
                  <h3 className="font-black text-slate-800">Kho tiếp nhận và kiểm tra</h3>
                  {selected.items.map(item => {
                    const form = receiveItems[item.returnitemid];
                    const replacements = inventory.filter(inventoryItem =>
                      inventoryItem.status === 'InStock' &&
                      inventoryItem.variantid === item.variantid,
                    );
                    return (
                      <div key={item.returnitemid} className="space-y-2 rounded-xl bg-slate-50 p-3">
                        <p className="text-xs font-black text-slate-700">IMEI {item.imei}</p>
                        <textarea
                          required
                          rows={2}
                          value={form?.condition ?? ''}
                          onChange={event => updateReceiveItem(item.returnitemid, 'condition', event.target.value)}
                          placeholder="Tình trạng thực tế khi nhận máy"
                          className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                        />
                        <select
                          value={form?.disposition ?? 'Restock'}
                          onChange={event => updateReceiveItem(item.returnitemid, 'disposition', event.target.value)}
                          className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                        >
                          <option value="Restock">Nhập lại kho</option>
                          <option value="Warranty">Chuyển bảo hành</option>
                          <option value="Damaged">Hàng lỗi / hư hỏng</option>
                        </select>
                        {selected.requesttype === 'Exchange' ? (
                          <select
                            required
                            value={form?.replacementimei ?? ''}
                            onChange={event => updateReceiveItem(item.returnitemid, 'replacementimei', event.target.value)}
                            className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                          >
                            <option value="">Chọn IMEI thay thế cùng biến thể</option>
                            {replacements.map(inventoryItem => (
                              <option key={inventoryItem.imei} value={inventoryItem.imei}>
                                {inventoryItem.imei} · {inventoryItem.variantSku}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="number"
                            min="0"
                            value={form?.refundamount ?? ''}
                            onChange={event => updateReceiveItem(item.returnitemid, 'refundamount', event.target.value)}
                            placeholder="Số tiền hoàn cho IMEI"
                            className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                          />
                        )}
                      </div>
                    );
                  })}
                  <textarea
                    rows={2}
                    value={resolution}
                    onChange={event => setResolution(event.target.value)}
                    placeholder="Kết luận kiểm tra"
                    className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                  />
                  <textarea
                    rows={2}
                    value={receiveNote}
                    onChange={event => setReceiveNote(event.target.value)}
                    placeholder="Ghi chú nội bộ"
                    className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                  />
                  <Button type="submit" fullWidth isLoading={working}>
                    <PackageCheck size={16} className="mr-2" /> Xác nhận đã nhận máy
                  </Button>
                </form>
              )}

              {selected.status === 'RefundPending' && canReview &&
               (user?.rolename !== 'Sales' || selected.assigneduserid === currentUserId) && (
                <form onSubmit={handleRefund} className="space-y-3 rounded-xl border border-violet-200 bg-violet-50/40 p-4">
                  <h3 className="font-black text-violet-900">Ghi nhận hoàn tiền</h3>
                  <div className="rounded-2xl bg-white p-3 text-sm">
                    Còn phải hoàn: <b>{formatCurrency(
                      selected.requestedrefundamount - (selected.refundamount ?? 0),
                    )}</b>
                  </div>
                  <input
                    required
                    type="number"
                    min="1"
                    value={refundAmount}
                    onChange={event => setRefundAmount(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                  />
                  <select
                    value={refundProvider}
                    onChange={event => setRefundProvider(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                  >
                    <option value="VNPay">VNPay</option>
                    <option value="Momo">Momo</option>
                    <option value="Bank">Ngân hàng</option>
                    <option value="Cash">Tiền mặt</option>
                  </select>
                  <input
                    value={refundReference}
                    onChange={event => setRefundReference(event.target.value)}
                    placeholder="Mã giao dịch (tùy chọn)"
                    className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                  />
                  <textarea
                    rows={2}
                    value={refundNote}
                    onChange={event => setRefundNote(event.target.value)}
                    placeholder="Ghi chú hoàn tiền"
                    className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                  />
                  <Button type="submit" fullWidth isLoading={working}>
                    <WalletCards size={16} className="mr-2" /> Xác nhận hoàn tiền
                  </Button>
                </form>
              )}

              <div className="rounded-xl bg-slate-50 p-4 text-sm">
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Yêu cầu hoàn</span>
                  <b>{formatCurrency(selected.requestedrefundamount)}</b>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Đã hoàn</span>
                  <b className="text-emerald-600">{formatCurrency(selected.refundamount ?? 0)}</b>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Tạo lúc</span>
                  <b>{selected.requestedat ? formatDateTime(selected.requestedat) : 'Chưa có thời gian'}</b>
                </div>
                {selected.resolution && (
                  <div className="mt-3 border-t border-slate-200 pt-3">
                    <p className="text-xs font-bold uppercase text-slate-400">Kết luận</p>
                    <p className="mt-1 text-slate-700">{selected.resolution}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default StaffReturns;
