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
    accent: 'from-[#4338ca] to-[#172033]',
  },
  Warehouse: {
    label: 'Bộ phận kho',
    title: 'Đóng gói & xuất giao',
    description: 'Đối chiếu IMEI thực tế, cập nhật vận chuyển và hoàn tất bước xuất kho.',
    accent: 'from-emerald-700 to-[#172033]',
  },
} satisfies Record<WorkflowDepartment, { label: string; title: string; description: string; accent: string }>;

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
  const [shippingFee, setShippingFee] = useState(30000);
  const [estimatedDeliveryDate, setEstimatedDeliveryDate] = useState('');

  const canAssign = user?.rolename === 'Admin' || user?.rolename === 'Manager';
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
    ready: items.filter(item => item.paymentstatus === 'Paid' || item.paymentstatus === 'DepositPaid' || item.paymentstatus === 'CODPending').length,
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

  const isPaymentReady = (item: OrderWorkflowItem) =>
    item.paymentmethod === 'COD'
      ? item.checkouttype === 'Registered' && item.paymentstatus === 'CODPending'
      : item.paymentstatus === 'DepositPaid' || item.paymentstatus === 'Paid';

  const openImeiVerification = (item: OrderWorkflowItem) => {
    setVerificationOrder(item);
    setConfirmedImeis(new Set());
    setShippingNote('');
    setCarrier('GHN');
    setShippingFee(30000);
    setEstimatedDeliveryDate('');
  };

  const closeImeiVerification = () => {
    if (workingId !== null) return;
    setVerificationOrder(null);
    setConfirmedImeis(new Set());
    setShippingNote('');
    setCarrier('GHN');
    setShippingFee(30000);
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

  return (
    <div className="space-y-5">
      <section className={`overflow-hidden rounded-3xl bg-gradient-to-br ${copy.accent} text-white shadow-[0_10px_28px_rgba(15,23,42,0.06)]`}>
        <div className="grid gap-6 p-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-white/65">{copy.label}</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight">{copy.title}</h1>
            <p className="mt-2 max-w-2xl text-sm font-medium text-white/75">{copy.description}</p>
          </div>
          <button
            type="button"
            onClick={loadQueue}
            className="inline-flex items-center justify-center gap-2 border border-white/20 bg-white/10 px-4 py-2 text-sm font-black text-white backdrop-blur hover:bg-white/20"
          >
            <RefreshCcw size={16} /> Làm mới
          </button>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: 'Tổng việc', value: stats.total, icon: <ClipboardCheck size={20} />, tone: 'bg-indigo-50 text-[#4338ca]' },
          { label: 'Chưa nhận', value: stats.unassigned, icon: <Clock3 size={20} />, tone: 'bg-amber-50 text-amber-700' },
          { label: 'Tôi phụ trách', value: stats.mine, icon: <UserCheck size={20} />, tone: 'bg-emerald-50 text-emerald-700' },
          { label: 'Sẵn sàng xử lý', value: stats.ready, icon: <PackageCheck size={20} />, tone: 'bg-violet-50 text-violet-700' },
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
                  <tr key={item.orderid} className="align-top transition hover:bg-indigo-50/40">
                    <td className="px-5 py-4">
                      <p className="font-mono text-sm font-black text-[#4338ca]">#{String(item.orderid).padStart(5, '0')}</p>
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
                            className="max-w-44 border border-slate-200 bg-white px-2 py-1.5 text-xs font-bold text-[#172033]"
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
                            className="bg-[#172033] px-3 py-1.5 text-xs font-black text-white disabled:opacity-40"
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
                            className="inline-flex items-center gap-2 bg-emerald-600 px-3 py-2 text-xs font-black text-white hover:bg-emerald-700 disabled:opacity-50"
                          >
                            <UserCheck size={14} /> Nhận việc
                          </button>
                        )}

                        {department === 'Sales' && canOperate && item.paymentmethod !== 'COD' && !ready && (
                          <button
                            type="button"
                            disabled={workingId === item.orderid}
                            onClick={() => runAction(item.orderid, () => ordersApi.confirmPayment(item.orderid))}
                            className="inline-flex items-center gap-2 border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-black text-[#4338ca] hover:bg-indigo-100"
                          >
                            <CircleDollarSign size={14} /> Xác nhận thanh toán
                          </button>
                        )}

                        {department === 'Sales' && canOperate && ready && (
                          <button
                            type="button"
                            disabled={workingId === item.orderid}
                            onClick={() => runAction(item.orderid, () => orderAssignmentsApi.handoffToWarehouse(item.orderid))}
                            className="inline-flex items-center gap-2 bg-[#4f46e5] px-3 py-2 text-xs font-black text-white hover:bg-[#4338ca] disabled:opacity-50"
                          >
                            <Truck size={14} /> Bàn giao sang kho
                          </button>
                        )}

                        {department === 'Warehouse' && canOperate && (
                          <button
                            type="button"
                            disabled={workingId === item.orderid}
                            onClick={() => openImeiVerification(item)}
                            className="inline-flex items-center gap-2 bg-[#4f46e5] px-3 py-2 text-xs font-black text-white hover:bg-[#4338ca] disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-[#4f46e5]">Đối chiếu thiết bị</p>
                <h2 className="text-xl font-black text-[#172033]">
                  Đơn #{String(verificationOrder.orderid).padStart(5, '0')}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeImeiVerification}
                className="p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
              >
                <X size={20} />
              </button>
            </div>

            <div className="max-h-[70vh] space-y-5 overflow-y-auto p-6">
              <div className="border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
                Đối chiếu IMEI trên máy thực tế với từng dòng bên dưới. Hệ thống chỉ cho xuất giao khi đã xác nhận đủ toàn bộ thiết bị.
              </div>

              <div className="space-y-3">
                {verificationOrder.devices.map(device => {
                  const checked = confirmedImeis.has(device.imei);
                  return (
                    <label
                      key={device.imei}
                      className={`flex cursor-pointer items-center gap-4 border-2 p-4 transition-colors ${
                        checked ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 hover:border-indigo-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleImei(device.imei)}
                        className="h-5 w-5 accent-emerald-600"
                      />
                      <div className="flex h-11 w-11 items-center justify-center bg-white text-[#4f46e5] shadow-[0_10px_28px_rgba(15,23,42,0.06)]">
                        <Smartphone size={22} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-black text-[#172033]">
                          {device.productname ?? device.variantsku ?? 'Thiết bị'}
                        </p>
                        <p className="font-mono text-sm font-black text-[#4338ca]">{device.imei}</p>
                        <p className="text-xs font-semibold text-slate-400">
                          {device.variantsku ?? 'Không có SKU'} · Kho: {device.inventorystatus ?? '—'}
                        </p>
                      </div>
                      {checked && <CheckCircle2 size={22} className="text-emerald-500" />}
                    </label>
                  );
                })}
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-black uppercase text-slate-500">Ghi chú đóng gói</label>
                <textarea
                  value={shippingNote}
                  onChange={event => setShippingNote(event.target.value)}
                  placeholder="Ví dụ: Đã kiểm tra ngoại hình, niêm phong và phụ kiện..."
                  className="min-h-24 w-full border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-[#4f46e5]"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <label className="text-xs font-black uppercase text-slate-500">
                  Đơn vị vận chuyển
                  <select value={carrier} onChange={event => setCarrier(event.target.value)} className="mt-1.5 w-full border border-slate-200 bg-white px-3 py-3 text-sm font-bold normal-case text-[#172033]">
                    <option value="GHN">GHN</option>
                    <option value="GHTK">GHTK</option>
                    <option value="VIETTELPOST">Viettel Post</option>
                    <option value="J&T">J&T</option>
                  </select>
                </label>
                <label className="text-xs font-black uppercase text-slate-500">
                  Phí vận chuyển
                  <input type="number" min={0} value={shippingFee} onChange={event => setShippingFee(Number(event.target.value))} className="mt-1.5 w-full border border-slate-200 px-3 py-3 text-sm font-bold normal-case text-[#172033]" />
                </label>
                <label className="text-xs font-black uppercase text-slate-500">
                  Ngày giao dự kiến
                  <input type="date" value={estimatedDeliveryDate} onChange={event => setEstimatedDeliveryDate(event.target.value)} className="mt-1.5 w-full border border-slate-200 px-3 py-3 text-sm font-bold normal-case text-[#172033]" />
                </label>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-4">
              <p className="text-sm font-black text-slate-600">
                Đã xác nhận {confirmedImeis.size}/{verificationOrder.devices.length} IMEI
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={closeImeiVerification}
                  className="border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-600"
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
                  className="inline-flex items-center gap-2 bg-[#4f46e5] px-5 py-2.5 text-sm font-black text-white hover:bg-[#4338ca] disabled:cursor-not-allowed disabled:bg-slate-300"
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
