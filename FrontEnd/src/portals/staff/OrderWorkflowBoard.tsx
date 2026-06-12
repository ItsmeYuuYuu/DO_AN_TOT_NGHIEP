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

  const canAssign = user?.rolename === 'Admin' || user?.rolename === 'Manager';
  const currentUserId = Number(user?.userid);

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
  }, [department, canAssign, loadQueue]);

  const stats = useMemo(() => ({
    total: items.length,
    unassigned: items.filter(item => !item.assignment?.assigneduserid).length,
    mine: items.filter(item => item.assignment?.assigneduserid === currentUserId).length,
  }), [items, currentUserId]);

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
  };

  const closeImeiVerification = () => {
    if (workingId !== null) return;
    setVerificationOrder(null);
    setConfirmedImeis(new Set());
    setShippingNote('');
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
      orderAssignmentsApi.markShipped(orderId, Array.from(confirmedImeis), shippingNote));
    setVerificationOrder(null);
    setConfirmedImeis(new Set());
    setShippingNote('');
  };

  const title = department === 'Sales' ? 'Hàng đợi xác nhận đơn' : 'Hàng đợi đóng gói và giao hàng';
  const description = department === 'Sales'
    ? 'Nhận đơn, kiểm tra thanh toán và bàn giao sang bộ phận kho.'
    : 'Chỉ hiển thị các đơn đã được Sales xác nhận và bàn giao.';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">
            {department === 'Sales' ? 'Bộ phận bán hàng' : 'Bộ phận kho'}
          </p>
          <h1 className="mt-1 text-2xl font-black text-slate-900">{title}</h1>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
        <button
          type="button"
          onClick={loadQueue}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50"
        >
          <RefreshCcw size={16} /> Làm mới
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Tổng công việc', value: stats.total, icon: <ClipboardCheck size={20} />, cls: 'text-blue-600 bg-blue-50' },
          { label: 'Chưa có người nhận', value: stats.unassigned, icon: <Clock3 size={20} />, cls: 'text-amber-600 bg-amber-50' },
          { label: 'Tôi đang phụ trách', value: stats.mine, icon: <UserCheck size={20} />, cls: 'text-emerald-600 bg-emerald-50' },
        ].map(stat => (
          <div key={stat.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${stat.cls}`}>{stat.icon}</div>
            <p className="text-3xl font-black text-slate-900">{loading ? '—' : stat.value}</p>
            <p className="text-xs font-semibold text-slate-500">{stat.label}</p>
          </div>
        ))}
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px]">
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
                  <tr key={item.orderid} className="align-top hover:bg-slate-50/70">
                    <td className="px-5 py-4">
                      <p className="font-black text-blue-700">#{String(item.orderid).padStart(5, '0')}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        {item.orderdate ? formatDateTime(item.orderdate) : '—'} · {item.itemcount} sản phẩm
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm font-bold text-slate-800">{item.shippingname ?? 'Khách hàng'}</p>
                      <p className="text-xs text-slate-500">{item.shippingphone ?? '—'}</p>
                      <p className="mt-1 max-w-xs text-xs text-slate-400">{item.shippingaddress ?? 'Chưa có địa chỉ'}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-xs font-black text-slate-700">{item.paymentmethod ?? '—'}</p>
                      <span className={`mt-1 inline-flex rounded-full px-2 py-1 text-[11px] font-bold ${
                        ready ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                      }`}>
                        {paymentLabels[item.paymentstatus ?? ''] ?? item.paymentstatus ?? 'Chưa ghi nhận'}
                      </span>
                      <p className="mt-1 text-[11px] text-slate-400">Đã trả {formatCurrency(item.paidamount)}</p>
                    </td>
                    <td className="px-5 py-4 text-sm font-black text-slate-900">
                      {formatCurrency(item.finalamount)}
                    </td>
                    <td className="px-5 py-4">
                      {assignment?.assigneduserid ? (
                        <div>
                          <p className="text-sm font-bold text-slate-700">{assignment.assigneduser}</p>
                          <p className="text-xs text-slate-400">
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
                            className="max-w-40 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs"
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
                              orderAssignmentsApi.assign(
                                item.orderid,
                                department,
                                selectedEmployees[item.orderid],
                              ))}
                            className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-40"
                          >
                            Giao việc
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">Chưa có người nhận</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex min-w-40 flex-col items-start gap-2">
                        {!assignment?.assigneduserid && !canAssign && (
                          <button
                            type="button"
                            disabled={workingId === item.orderid}
                            onClick={() => runAction(item.orderid, () =>
                              orderAssignmentsApi.claim(item.orderid, department))}
                            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-black text-white hover:bg-emerald-700 disabled:opacity-50"
                          >
                            <UserCheck size={14} /> Nhận công việc
                          </button>
                        )}

                        {department === 'Sales' && canOperate && item.paymentmethod !== 'COD' && !ready && (
                          <button
                            type="button"
                            disabled={workingId === item.orderid}
                            onClick={() => runAction(item.orderid, () => ordersApi.confirmPayment(item.orderid))}
                            className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 hover:bg-blue-100"
                          >
                            <CircleDollarSign size={14} /> Xác nhận thanh toán
                          </button>
                        )}

                        {department === 'Sales' && canOperate && ready && (
                          <button
                            type="button"
                            disabled={workingId === item.orderid}
                            onClick={() => runAction(item.orderid, () =>
                              orderAssignmentsApi.handoffToWarehouse(item.orderid))}
                            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-black text-white hover:bg-blue-700 disabled:opacity-50"
                          >
                            <Truck size={14} /> Bàn giao sang kho
                          </button>
                        )}

                        {department === 'Warehouse' && canOperate && (
                          <button
                            type="button"
                            disabled={workingId === item.orderid}
                            onClick={() => openImeiVerification(item)}
                            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-black text-white hover:bg-blue-700 disabled:opacity-50"
                          >
                            <ScanLine size={14} /> Kiểm tra IMEI & xuất giao
                          </button>
                        )}

                        {assignment?.status === 'Completed' && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
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
                  <td colSpan={6} className="px-6 py-20 text-center text-sm text-slate-400">
                    Hiện không có công việc nào trong hàng đợi.
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center text-sm font-semibold text-slate-400">
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
                <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Đối chiếu thiết bị</p>
                <h2 className="text-xl font-black text-slate-900">
                  Đơn #{String(verificationOrder.orderid).padStart(5, '0')}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeImeiVerification}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
              >
                <X size={20} />
              </button>
            </div>

            <div className="max-h-[70vh] space-y-5 overflow-y-auto p-6">
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                Đối chiếu IMEI trên máy thực tế với từng dòng dưới đây. Hệ thống chỉ cho xuất giao khi đã xác nhận đủ và đúng toàn bộ thiết bị.
              </div>

              <div className="space-y-3">
                {verificationOrder.devices.map(device => {
                  const checked = confirmedImeis.has(device.imei);
                  return (
                    <label
                      key={device.imei}
                      className={`flex cursor-pointer items-center gap-4 rounded-2xl border-2 p-4 transition-colors ${
                        checked ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 hover:border-blue-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleImei(device.imei)}
                        className="h-5 w-5 accent-emerald-600"
                      />
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">
                        <Smartphone size={22} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-black text-slate-900">
                          {device.productname ?? device.variantsku ?? 'Thiết bị'}
                        </p>
                        <p className="font-mono text-sm font-bold text-blue-700">{device.imei}</p>
                        <p className="text-xs text-slate-400">
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
                  className="min-h-24 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-4">
              <p className="text-sm font-bold text-slate-600">
                Đã xác nhận {confirmedImeis.size}/{verificationOrder.devices.length} IMEI
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={closeImeiVerification}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={
                    workingId === verificationOrder.orderid ||
                    verificationOrder.devices.length === 0 ||
                    confirmedImeis.size !== verificationOrder.devices.length
                  }
                  onClick={confirmShipment}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-black text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
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
