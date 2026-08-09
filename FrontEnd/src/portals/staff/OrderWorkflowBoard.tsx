import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  CircleDollarSign,
  ClipboardCheck,
  Clock3,
  PackageCheck,
  RefreshCcw,
  ScanLine,
  Smartphone,
  Truck,
  UserCheck,
  X,
} from 'lucide-react';
import { useAuth } from '@/features/auth/context/AuthContext';
import { ordersApi } from '@/features/orders/api/ordersApi';
import {
  orderAssignmentsApi,
  type AssignmentEmployee,
  type OrderWorkflowItem,
  type WorkflowDepartment,
} from '@/features/orders/api/orderAssignmentsApi';
import { formatCurrency, formatDateTime } from '@/utils/formatters';
import { getApiErrorMessage } from '@/utils/apiError';

interface OrderWorkflowBoardProps {
  department: WorkflowDepartment;
}

const INTERNAL_CARRIER = 'STORE_DELIVERY';

const paymentLabels: Record<string, string> = {
  CODPending: 'COD khi nhận hàng',
  AwaitingDeposit: 'Chờ đặt cọc',
  AwaitingFullPayment: 'Chờ thanh toán',
  DepositPaid: 'Đã đặt cọc',
  Paid: 'Đã thanh toán',
  Expired: 'Đã hết hạn',
};

const departmentCopy = {
  Sales: {
    label: 'Bộ phận bán hàng',
    title: 'Xác nhận đơn & thanh toán',
    description: 'Nhận đơn, kiểm tra thanh toán và bàn giao các đơn hợp lệ sang bộ phận kho.',
    accent: 'from-[#c4000b] to-[#172033]',
  },
  Warehouse: {
    label: 'Bộ phận kho',
    title: 'Đóng gói & xuất giao',
    description: 'Đối chiếu IMEI thực tế, cập nhật vận chuyển và hoàn tất bước xuất kho.',
    accent: 'from-emerald-700 to-[#172033]',
  },
} satisfies Record<WorkflowDepartment, { label: string; title: string; description: string; accent: string }>;

const isPaymentReady = (item: OrderWorkflowItem) =>
  item.paymentmethod === 'COD'
    ? item.paymentstatus === 'CODPending'
    : item.paymentstatus === 'DepositPaid' || item.paymentstatus === 'Paid';

const OrderWorkflowBoard: React.FC<OrderWorkflowBoardProps> = ({ department }) => {
  const { user } = useAuth();
  const [items, setItems] = useState<OrderWorkflowItem[]>([]);
  const [employees, setEmployees] = useState<AssignmentEmployee[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [verificationOrder, setVerificationOrder] = useState<OrderWorkflowItem | null>(null);
  const [confirmedImeis, setConfirmedImeis] = useState<Set<string>>(new Set());
  const [shippingNote, setShippingNote] = useState('');
  const [carrier, setCarrier] = useState('GHN');
  const [shippingFee, setShippingFee] = useState(0);
  const [estimatedDeliveryDate, setEstimatedDeliveryDate] = useState('');

  const canAssign = user?.permissions?.includes('*') || user?.permissions?.includes('orders.assign');
  const currentUserId = Number(user?.userid);
  const copy = departmentCopy[department];

  const loadQueue = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await orderAssignmentsApi.getQueue(department);
      setItems(response.data);
    } catch (requestError: unknown) {
      setError(getApiErrorMessage(requestError, 'Không thể tải hàng đợi công việc.'));
    } finally {
      setLoading(false);
    }
  }, [department]);

  useEffect(() => {
    loadQueue();
    if (canAssign) {
      orderAssignmentsApi.getEmployees(department)
        .then(response => setEmployees(response.data))
        .catch(() => setEmployees([]));
    }
  }, [canAssign, department, loadQueue]);

  const stats = useMemo(() => ({
    total: items.length,
    unassigned: items.filter(item => !item.assignment?.assigneduserid).length,
    mine: items.filter(item => item.assignment?.assigneduserid === currentUserId).length,
    ready: items.filter(isPaymentReady).length,
  }), [currentUserId, items]);

  const runAction = async (orderId: number, action: () => Promise<unknown>) => {
    setWorkingId(orderId);
    setError('');
    try {
      await action();
      await loadQueue();
    } catch (requestError: unknown) {
      setError(getApiErrorMessage(requestError, 'Không thể thực hiện thao tác.'));
    } finally {
      setWorkingId(null);
    }
  };

  const openImeiVerification = (item: OrderWorkflowItem) => {
    setVerificationOrder(item);
    setConfirmedImeis(new Set());
    setShippingNote('');
    setCarrier(item.checkouttype === 'Guest' ? INTERNAL_CARRIER : 'GHN');
    setShippingFee(item.shippingfee);
    setEstimatedDeliveryDate('');
  };

  const closeImeiVerification = () => {
    if (workingId !== null) return;
    setVerificationOrder(null);
    setConfirmedImeis(new Set());
    setShippingNote('');
    setCarrier('GHN');
    setShippingFee(0);
    setEstimatedDeliveryDate('');
  };

  const toggleImei = (imei: string) => {
    setConfirmedImeis(current => {
      const next = new Set(current);
      if (next.has(imei)) next.delete(imei);
      else next.add(imei);
      return next;
    });
  };

  const confirmShipment = async () => {
    if (!verificationOrder) return;
    const orderId = verificationOrder.orderid;
    await runAction(orderId, () =>
      orderAssignmentsApi.markShipped(
        orderId,
        Array.from(confirmedImeis),
        shippingNote,
        carrier,
        shippingFee,
        estimatedDeliveryDate ? `${estimatedDeliveryDate}T17:00:00` : undefined,
      ));
    setVerificationOrder(null);
    setConfirmedImeis(new Set());
    setShippingNote('');
  };

  const isGuestShipment = verificationOrder?.checkouttype === 'Guest';

  return (
    <div className="space-y-5">
      <section className="ops-hero">
        <div className="grid gap-6 p-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <h1 className="ops-hero-title">{copy.title}</h1>
          </div>
          <button
            type="button"
            onClick={loadQueue}
            className="ops-hero-action"
          >
            <RefreshCcw size={16} /> Làm mới
          </button>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: 'Tổng việc', value: stats.total, icon: <ClipboardCheck size={20} />, tone: 'bg-red-50 text-[#c4000b]' },
          { label: 'Chưa nhận', value: stats.unassigned, icon: <Clock3 size={20} />, tone: 'bg-red-50 text-[#c4000b]' },
          { label: 'Tôi phụ trách', value: stats.mine, icon: <UserCheck size={20} />, tone: 'bg-red-50 text-[#c4000b]' },
          { label: 'Sẵn sàng xử lý', value: stats.ready, icon: <PackageCheck size={20} />, tone: 'bg-red-50 text-[#c4000b]' },
        ].map(stat => (
          <div key={stat.label} className="ops-card p-4">
            <div className={`mb-3 flex h-10 w-10 items-center justify-center ${stat.tone}`}>{stat.icon}</div>
            <p className="text-2xl font-black text-[#172033]">{loading ? '...' : stat.value}</p>
            <p className="text-xs font-bold text-slate-400">{stat.label}</p>
          </div>
        ))}
      </div>

      {error && (
        <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {error}
        </div>
      )}

      <div className="ops-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px]">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                {['Đơn hàng', 'Khách nhận', 'Thanh toán', 'Giá trị', 'Phụ trách', 'Thao tác'].map(label => (
                  <th key={label} className="px-5 py-3 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map(item => {
                const assignment = item.assignment;
                const isMine = assignment?.assigneduserid === currentUserId;
                const canOperate = isMine || canAssign;
                const ready = isPaymentReady(item);

                return (
                  <tr key={item.orderid} className="align-top transition hover:bg-red-50/40">
                    <td className="px-5 py-4">
                      <p className="text-sm font-black text-[#c4000b]">#{String(item.orderid).padStart(5, '0')}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-400">
                        {item.orderdate ? formatDateTime(item.orderdate) : '—'} · {item.itemcount} sản phẩm
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm font-black text-[#172033]">{item.shippingname ?? 'Khách hàng'}</p>
                      <p className="text-xs font-semibold text-slate-500">{item.shippingphone ?? '—'}</p>
                      <p className="mt-1 max-w-xs text-xs text-slate-400">{item.shippingaddress ?? 'Chưa có địa chỉ'}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-xs font-black text-[#172033]">{item.paymentmethod ?? '—'}</p>
                      <span className={`mt-1 inline-flex px-2 py-1 text-[11px] font-black ${
                        ready ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                      }`}>
                        {paymentLabels[item.paymentstatus ?? ''] ?? item.paymentstatus ?? 'Chưa ghi nhận'}
                      </span>
                      <p className="mt-1 text-[11px] font-semibold text-slate-400">Đã trả {formatCurrency(item.paidamount)}</p>
                    </td>
                    <td className="px-5 py-4 text-sm font-black text-[#172033]">
                      {formatCurrency(item.finalamount)}
                    </td>
                    <td className="px-5 py-4">
                      {assignment?.assigneduserid ? (
                        <div>
                          <p className="text-sm font-black text-[#172033]">{assignment.assigneduser}</p>
                          <p className="text-xs font-semibold text-slate-400">
                            {isMine ? 'Bạn đang phụ trách' : 'Đã có người nhận'}
                          </p>
                        </div>
                      ) : canAssign ? (
                        <div className="flex gap-2">
                          <select
                            value={selectedEmployees[item.orderid] ?? ''}
                            onChange={event => setSelectedEmployees(current => ({
                              ...current,
                              [item.orderid]: Number(event.target.value),
                            }))}
                            className="max-w-44 rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-xs font-bold text-[#172033]"
                          >
                            <option value="">Chọn nhân viên</option>
                            {employees.map(employee => (
                              <option key={employee.userid} value={employee.userid}>{employee.fullname}</option>
                            ))}
                          </select>
                          <button
                            type="button"
                            disabled={!selectedEmployees[item.orderid] || workingId === item.orderid}
                            onClick={() => runAction(item.orderid, () =>
                              orderAssignmentsApi.assign(item.orderid, department, selectedEmployees[item.orderid]))}
                            className="rounded-xl bg-[#e30613] px-3 py-1.5 text-xs font-black text-white hover:bg-[#c4000b] disabled:opacity-40"
                          >
                            Giao việc
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs font-semibold text-slate-400">Chưa có người nhận</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex min-w-44 flex-col items-start gap-2">
                        {!assignment?.assigneduserid && !canAssign && (
                          <button
                            type="button"
                            disabled={workingId === item.orderid}
                            onClick={() => runAction(item.orderid, () => orderAssignmentsApi.claim(item.orderid, department))}
                            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white hover:bg-emerald-700 disabled:opacity-50"
                          >
                            <UserCheck size={14} /> Nhận việc
                          </button>
                        )}

                        {department === 'Sales' && canOperate && item.paymentmethod !== 'COD' && !ready && (
                          <button
                            type="button"
                            disabled={workingId === item.orderid}
                            onClick={() => runAction(item.orderid, () => ordersApi.confirmPayment(item.orderid))}
                            className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-black text-[#c4000b] hover:bg-red-100"
                          >
                            <CircleDollarSign size={14} /> Xác nhận thanh toán
                          </button>
                        )}

                        {department === 'Sales' && canOperate && ready && (
                          <button
                            type="button"
                            disabled={workingId === item.orderid}
                            onClick={() => runAction(item.orderid, () => orderAssignmentsApi.handoffToWarehouse(item.orderid))}
                            className="inline-flex items-center gap-2 rounded-xl bg-[#e30613] px-3 py-2 text-xs font-black text-white hover:bg-[#c4000b] disabled:opacity-50"
                          >
                            <Truck size={14} /> Bàn giao sang kho
                          </button>
                        )}

                        {department === 'Warehouse' && canOperate && (
                          <button
                            type="button"
                            disabled={workingId === item.orderid}
                            onClick={() => openImeiVerification(item)}
                            className="inline-flex items-center gap-2 rounded-xl bg-[#e30613] px-3 py-2 text-xs font-black text-white hover:bg-[#c4000b] disabled:opacity-50"
                          >
                            <ScanLine size={14} /> Kiểm tra IMEI
                          </button>
                        )}

                        {assignment?.status === 'Completed' && (
                          <span className="inline-flex items-center gap-1 text-xs font-black text-emerald-600">
                            <CheckCircle2 size={14} /> Đã hoàn tất
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center text-sm font-semibold text-slate-400">
                    Hiện không có công việc nào trong hàng đợi.
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center text-sm font-bold text-slate-400">
                    Đang tải hàng đợi...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {verificationOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#172033]/45 p-4 backdrop-blur-[2px]">
          <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-[28px] border border-white/70 bg-white shadow-[0_28px_90px_rgba(15,23,42,0.24)]">
            <div className="flex items-center justify-between px-7 py-5">
              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#fff1f2] text-[#e30613]">
                  <ScanLine size={22} />
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#c4000b]">Đối chiếu thiết bị</p>
                  <h2 className="mt-0.5 text-xl font-black text-[#172033]">
                  Đơn #{String(verificationOrder.orderid).padStart(5, '0')}
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={closeImeiVerification}
                aria-label="Đóng"
                className="flex h-10 w-10 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-[#172033]"
              >
                <X size={20} />
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto border-y border-slate-100 bg-[#f8fafc] px-7 py-6">
              <div className="flex gap-3 rounded-2xl border border-red-100 bg-[#fff7f7] p-4 text-sm font-semibold leading-6 text-slate-600">
                <ScanLine size={19} className="mt-0.5 shrink-0 text-[#e30613]" />
                Đối chiếu IMEI trên máy thực tế với từng dòng bên dưới. Hệ thống chỉ cho xuất giao khi đã xác nhận đủ toàn bộ thiết bị.
              </div>

              <div className="space-y-3">
                {verificationOrder.devices.map(device => {
                  const checked = confirmedImeis.has(device.imei);
                  return (
                    <label
                      key={device.imei}
                      className={`flex cursor-pointer items-center gap-4 rounded-2xl border p-4 shadow-sm transition-all ${
                        checked
                          ? 'border-emerald-300 bg-emerald-50/80'
                          : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-red-200 hover:shadow-md'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleImei(device.imei)}
                        className="h-5 w-5 accent-emerald-600"
                      />
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-red-100 bg-[#fff7f7] text-[#e30613]">
                        <Smartphone size={22} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-black text-[#172033]">
                          {device.productname ?? device.variantsku ?? 'Thiết bị'}
                        </p>
                        <p className="mt-0.5 text-sm font-bold tracking-wide text-[#c4000b]">{device.imei}</p>
                        <p className="mt-1 text-xs font-semibold text-slate-400">
                          {device.variantsku ?? 'Không có SKU'} · Kho: {device.inventorystatus ?? '—'}
                        </p>
                      </div>
                      {checked && <CheckCircle2 size={22} className="text-emerald-500" />}
                    </label>
                  );
                })}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">Ghi chú đóng gói</label>
                <textarea
                  value={shippingNote}
                  onChange={event => setShippingNote(event.target.value)}
                  placeholder="Ví dụ: Đã kiểm tra ngoại hình, niêm phong và phụ kiện..."
                  className="min-h-24 w-full resize-y rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm font-semibold text-[#172033] outline-none transition focus:border-[#e30613] focus:bg-white focus:ring-4 focus:ring-red-50"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <label className="rounded-2xl border border-slate-200 bg-white p-4 text-xs font-bold uppercase tracking-wide text-slate-500 shadow-sm">
                  Đơn vị vận chuyển
                  <select
                    value={carrier}
                    onChange={event => setCarrier(event.target.value)}
                    disabled={isGuestShipment}
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold normal-case text-[#172033] outline-none focus:border-[#e30613] disabled:cursor-not-allowed disabled:text-slate-500"
                  >
                    <option value={INTERNAL_CARRIER}>Cửa hàng giao nội thành TP.HCM</option>
                    {!isGuestShipment && <option value="GHN">GHN</option>}
                    {!isGuestShipment && <option value="GHTK">GHTK</option>}
                    {!isGuestShipment && <option value="VIETTELPOST">Viettel Post</option>}
                    {!isGuestShipment && <option value="J&T">J&T</option>}
                  </select>
                </label>
                <label className="rounded-2xl border border-slate-200 bg-white p-4 text-xs font-bold uppercase tracking-wide text-slate-500 shadow-sm">
                  Phí vận chuyển
                  <span className="mt-2 flex min-h-12 items-center rounded-xl bg-[#fff7f7] px-3 text-base font-black normal-case text-[#c4000b]">
                    {shippingFee === 0 ? 'Miễn phí' : formatCurrency(shippingFee)}
                  </span>
                </label>
                <label className="rounded-2xl border border-slate-200 bg-white p-4 text-xs font-bold uppercase tracking-wide text-slate-500 shadow-sm">
                  Ngày giao dự kiến
                  <input type="date" value={estimatedDeliveryDate} onChange={event => setEstimatedDeliveryDate(event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold normal-case text-[#172033] outline-none focus:border-[#e30613]" />
                </label>
              </div>
            </div>

            <div className="flex flex-col gap-4 bg-white px-7 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-black text-[#172033]">
                  Đã xác nhận {confirmedImeis.size}/{verificationOrder.devices.length} IMEI
                </p>
                <div className="mt-2 h-1.5 w-44 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${verificationOrder.devices.length === 0 ? 0 : (confirmedImeis.size / verificationOrder.devices.length) * 100}%` }}
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={closeImeiVerification}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-600 transition hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={
                    workingId === verificationOrder.orderid ||
                    verificationOrder.devices.length === 0 ||
                    confirmedImeis.size !== verificationOrder.devices.length ||
                    !carrier ||
                    shippingFee < 0
                  }
                  onClick={confirmShipment}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#e30613] px-5 py-3 text-sm font-black text-white shadow-[0_10px_24px_rgba(227,6,19,0.2)] transition hover:bg-[#c4000b] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
                >
                  <PackageCheck size={17} />
                  {workingId === verificationOrder.orderid ? 'Đang xuất kho...' : 'Xác nhận xuất giao'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderWorkflowBoard;
