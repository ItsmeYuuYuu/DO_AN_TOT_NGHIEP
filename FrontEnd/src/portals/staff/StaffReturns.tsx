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
  inspectiongrade: 'NewSeal' | 'Grade99' | 'Grade98' | 'Damaged';
  faultresponsibility: 'Manufacturer' | 'Store' | 'Carrier' | 'Customer' | 'NoFault';
  missingbox: 'true' | 'false';
  missingaccessorycount: string;
  replacementimei: string;
}

const statusLabels: Record<string, string> = {
  PendingReview: 'Chờ Sales duyệt',
  Approved: 'Chờ kho tiếp nhận',
  AwaitingCustomerConfirmation: 'Chờ khách xác nhận mức hoàn',
  AssessmentDisputed: 'Khách yêu cầu kiểm định lại',
  Rejected: 'Từ chối',
  RefundPending: 'Chờ hoàn tiền',
  RefundProcessing: 'Chờ khách xác nhận',
  RefundDisputed: 'Khách báo chưa nhận tiền',
  Completed: 'Hoàn tất',
  Cancelled: 'Khách đã hủy',
};

const statusClasses: Record<string, string> = {
  PendingReview: 'bg-amber-50 text-amber-700',
  Approved: 'bg-emerald-50 text-emerald-700',
  AwaitingCustomerConfirmation: 'bg-blue-50 text-blue-700',
  AssessmentDisputed: 'bg-orange-50 text-orange-700',
  Rejected: 'bg-red-50 text-red-700',
  RefundPending: 'bg-amber-50 text-amber-700',
  RefundProcessing: 'bg-blue-50 text-blue-700',
  RefundDisputed: 'bg-red-50 text-red-700',
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
  const [reconcileNote, setReconcileNote] = useState('');
  const [overrideAmount, setOverrideAmount] = useState('');

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
    refund: requests.filter(item =>
      ['AwaitingCustomerConfirmation', 'AssessmentDisputed', 'RefundPending', 'RefundProcessing', 'RefundDisputed'].includes(item.status)).length,
  }), [requests]);

  const openDetail = (request: ReturnRequest) => {
    setSelected(request);
    setReviewNote(request.reviewnote ?? '');
    setResolution(request.resolution ?? '');
    setReceiveNote('');
    setRefundAmount(Math.max(
      0,
      (request.approvedrefundamount ?? request.requestedrefundamount) - (request.refundamount ?? 0),
    ).toString());
    setRefundProvider(request.refunddestination?.method === 'BANK' ? 'Bank' : 'Cash');
    setRefundReference('');
    setRefundNote('');
    setReconcileNote('');
    setOverrideAmount((request.approvedrefundamount ?? request.requestedrefundamount).toString());
    setReceiveItems(Object.fromEntries(request.items.map(item => [
      item.returnitemid,
      {
        condition: item.condition ?? '',
        disposition: (item.disposition as ReceiveFormItem['disposition']) ?? 'Restock',
        inspectiongrade: item.inspectiongrade ?? 'Grade99',
        faultresponsibility: item.faultresponsibility ?? 'NoFault',
        missingbox: 'false',
        missingaccessorycount: '0',
        replacementimei: item.replacementimei ?? '',
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
        inspectiongrade: form.inspectiongrade,
        faultresponsibility: form.faultresponsibility,
        missingbox: form.missingbox === 'true',
        missingaccessorycount: Number(form.missingaccessorycount),
        replacementimei: form.replacementimei.trim() || undefined,
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

  const handleResolveDispute = async (outcome: 'CONFIRMED' | 'FAILED') => {
    if (!selected || !reconcileNote.trim()) return;
    await runAction(() => returnRequestsApi.resolveRefundDispute(
      selected.returnrequestid,
      outcome,
      reconcileNote.trim(),
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
          ['Tổng yêu cầu', stats.total, RotateCcw, 'text-[#c4000b]'],
          ['Chờ duyệt', stats.waiting, UserCheck, 'text-[#c4000b]'],
          ['Chờ kho', stats.warehouse, PackageCheck, 'text-[#c4000b]'],
          ['Chờ hoàn tiền', stats.refund, WalletCards, 'text-[#c4000b]'],
        ].map(([label, value, Icon, color]) => {
          const CardIcon = Icon as typeof RotateCcw;
          return (
            <div key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.06)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-400">{label as string}</p>
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
                <tr key={request.returnrequestid} className="hover:bg-red-50/40">
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
                      <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-4 ring-white" />
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
                        <div className="grid gap-2 sm:grid-cols-2">
                          <select
                            required
                            value={form?.inspectiongrade ?? 'Grade99'}
                            onChange={event => updateReceiveItem(item.returnitemid, 'inspectiongrade', event.target.value)}
                            className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                          >
                            <option value="NewSeal">Còn nguyên seal</option>
                            <option value="Grade99">Máy 99%</option>
                            <option value="Grade98">Máy 98%</option>
                            <option value="Damaged">Hư hỏng</option>
                          </select>
                          <select
                            required
                            value={form?.faultresponsibility ?? 'NoFault'}
                            onChange={event => updateReceiveItem(item.returnitemid, 'faultresponsibility', event.target.value)}
                            className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                          >
                            <option value="NoFault">Không lỗi / khách đổi ý</option>
                            <option value="Manufacturer">Lỗi nhà sản xuất</option>
                            <option value="Store">Lỗi cửa hàng</option>
                            <option value="Carrier">Lỗi vận chuyển</option>
                            <option value="Customer">Lỗi do khách sử dụng</option>
                          </select>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <select
                            value={form?.missingbox ?? 'false'}
                            onChange={event => updateReceiveItem(item.returnitemid, 'missingbox', event.target.value)}
                            className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                          >
                            <option value="false">Đủ vỏ hộp</option>
                            <option value="true">Thiếu vỏ hộp</option>
                          </select>
                          <input
                            type="number"
                            min="0"
                            max="10"
                            value={form?.missingaccessorycount ?? '0'}
                            onChange={event => updateReceiveItem(item.returnitemid, 'missingaccessorycount', event.target.value)}
                            placeholder="Số phụ kiện bị thiếu"
                            className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                          />
                        </div>
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
                          <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs leading-5 text-blue-800">
                            Giá trị thực trả: <b>{formatCurrency(item.originalpaidamount || item.refundamount)}</b>.
                            Hệ thống sẽ tự tính khấu hao sau khi xác nhận kiểm định; nhân viên không được nhập tiền thủ công.
                          </div>
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

              {selected.status === 'AwaitingCustomerConfirmation' && (
                <div className="space-y-2 rounded-xl border border-blue-200 bg-blue-50/50 p-4 text-sm">
                  <h3 className="font-black text-blue-900">Đang chờ khách xác nhận kết quả kiểm định</h3>
                  <p className="text-blue-700">
                    Mức hoàn chính thức: <b>{formatCurrency(selected.approvedrefundamount ?? 0)}</b>
                    {' '}· Khấu hao: <b>{formatCurrency(selected.refundcalculation?.totaldeductionamount ?? 0)}</b>
                  </p>
                  <p className="text-xs text-blue-600">IMEI chưa được nhập lại kho bán hàng cho đến khi khách đồng ý.</p>
                </div>
              )}

              {selected.status === 'AssessmentDisputed' && canAssign && (
                <div className="space-y-3 rounded-xl border border-orange-200 bg-orange-50/50 p-4">
                  <h3 className="font-black text-orange-900">Khách yêu cầu kiểm định lại</h3>
                  <textarea
                    required
                    rows={3}
                    value={reconcileNote}
                    onChange={event => setReconcileNote(event.target.value)}
                    placeholder="Kết luận của Manager và nội dung yêu cầu kho kiểm định lại"
                    className="w-full rounded-2xl border border-orange-200 px-3 py-2 text-sm"
                  />
                  <input
                    type="number"
                    min="0"
                    max={selected.items.reduce((sum, item) => sum + item.originalpaidamount, 0)}
                    value={overrideAmount}
                    onChange={event => setOverrideAmount(event.target.value)}
                    placeholder="Mức hoàn ngoại lệ"
                    className="w-full rounded-2xl border border-orange-200 px-3 py-2 text-sm font-bold"
                  />
                  <p className="text-xs text-orange-700">
                    Điều chỉnh ngoại lệ bắt buộc có lý do và sẽ được ghi vào lịch sử/Audit Log.
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Button
                      disabled={!reconcileNote.trim()}
                      isLoading={working}
                      onClick={() => runAction(() => returnRequestsApi.reinspect(selected.returnrequestid, reconcileNote.trim()))}
                    >
                      Kiểm định lại
                    </Button>
                    <Button
                      disabled={!reconcileNote.trim() || overrideAmount === ''}
                      isLoading={working}
                      onClick={() => runAction(() => returnRequestsApi.overrideAssessment(
                        selected.returnrequestid,
                        Number(overrideAmount),
                        reconcileNote.trim(),
                      ))}
                    >
                      Duyệt mức ngoại lệ
                    </Button>
                  </div>
                </div>
              )}

              {selected.status === 'RefundPending' && canReview &&
               (user?.rolename !== 'Sales' || selected.assigneduserid === currentUserId) && (
                <form onSubmit={handleRefund} className="space-y-3 rounded-xl border border-red-100 bg-red-50/40 p-4">
                  <h3 className="font-black text-[#7f1d1d]">Ghi nhận đã thực hiện hoàn tiền</h3>
                  {selected.refunddestination?.method === 'BANK' && (
                    <div className="rounded-2xl border border-blue-100 bg-white p-3 text-sm">
                      <p className="font-bold text-blue-900">Chuyển khoản hoàn tiền đến</p>
                      <p className="mt-1">{selected.refunddestination.bankname} · {selected.refunddestination.accountnumber}</p>
                      <p className="font-semibold uppercase">{selected.refunddestination.accountholder}</p>
                    </div>
                  )}
                  <div className="rounded-2xl bg-white p-3 text-sm">
                    Còn phải hoàn: <b>{formatCurrency(
                      (selected.approvedrefundamount ?? selected.requestedrefundamount) - (selected.refundamount ?? 0),
                    )}</b>
                  </div>
                  <input
                    required
                    type="number"
                    min="1"
                    value={refundAmount}
                    readOnly
                    aria-label="Số tiền phải hoàn toàn bộ"
                    className="w-full cursor-not-allowed rounded-2xl border border-slate-200 bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700"
                  />
                  <p className="text-xs text-[#9f1239]">
                    Số tiền được lấy tự động từ kết quả kiểm tra; không hỗ trợ hoàn từng phần.
                  </p>
                  <select
                    value={refundProvider}
                    disabled
                    className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                  >
                    <option value="Bank">Ngân hàng</option>
                    <option value="Cash">Tiền mặt</option>
                  </select>
                  <input
                    required={selected.refunddestination?.method === 'BANK'}
                    value={refundReference}
                    onChange={event => setRefundReference(event.target.value)}
                    placeholder={selected.refunddestination?.method === 'BANK'
                      ? 'Mã giao dịch ngân hàng (bắt buộc)'
                      : 'Mã biên nhận (tùy chọn)'}
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
                    <WalletCards size={16} className="mr-2" /> Xác nhận đã thực hiện chuyển tiền
                  </Button>
                  <p className="text-xs leading-5 text-[#9f1239]">
                    Sau bước này yêu cầu sẽ chờ khách xác nhận đã nhận tiền, chưa được tính là hoàn tất.
                  </p>
                </form>
              )}

              {selected.status === 'RefundDisputed' && canReview &&
               (user?.rolename !== 'Sales' || selected.assigneduserid === currentUserId) && (
                <div className="space-y-3 rounded-xl border border-red-200 bg-red-50/50 p-4">
                  <h3 className="font-black text-red-900">Đối soát khiếu nại hoàn tiền</h3>
                  <p className="text-xs leading-5 text-red-700">
                    Kiểm tra mã giao dịch trên tài khoản ngân hàng cửa hàng trước khi kết luận.
                  </p>
                  <textarea
                    required
                    rows={3}
                    value={reconcileNote}
                    onChange={event => setReconcileNote(event.target.value)}
                    placeholder="Kết quả đối soát với ngân hàng (bắt buộc)"
                    className="w-full rounded-2xl border border-red-200 px-3 py-2 text-sm"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="danger"
                      disabled={!reconcileNote.trim()}
                      isLoading={working}
                      onClick={() => handleResolveDispute('FAILED')}
                    >
                      Giao dịch thất bại
                    </Button>
                    <Button
                      disabled={!reconcileNote.trim()}
                      isLoading={working}
                      onClick={() => handleResolveDispute('CONFIRMED')}
                    >
                      Đã ghi có
                    </Button>
                  </div>
                </div>
              )}

              {selected.refundtransactions.length > 0 && (
                <div className="rounded-xl border border-slate-200 p-4 text-sm">
                  <h3 className="font-black text-slate-800">Giao dịch hoàn tiền</h3>
                  <div className="mt-3 space-y-2">
                    {selected.refundtransactions.map(transaction => (
                      <div key={transaction.refundtransactionid} className="rounded-xl bg-slate-50 p-3">
                        <div className="flex justify-between gap-3">
                          <b>{formatCurrency(transaction.amount)}</b>
                          <span className="font-semibold text-slate-600">{transaction.status}</span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          {transaction.provider} · {transaction.transactionref ?? 'Không có mã giao dịch'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-xl bg-slate-50 p-4 text-sm">
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Yêu cầu hoàn</span>
                  <b>{formatCurrency(selected.requestedrefundamount)}</b>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Khấu hao sau kiểm định</span>
                  <b className="text-red-600">-{formatCurrency(selected.refundcalculation?.totaldeductionamount ?? 0)}</b>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Được duyệt hoàn</span>
                  <b className="text-blue-700">{formatCurrency(selected.approvedrefundamount ?? selected.requestedrefundamount)}</b>
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
