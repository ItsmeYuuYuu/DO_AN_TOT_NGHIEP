import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Camera, PackageCheck, Plus, RefreshCcw, RotateCcw, XCircle } from 'lucide-react';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { useAuth } from '@/features/auth/context/AuthContext';
import { ordersApi, type Order } from '@/features/orders/api/ordersApi';
import {
  returnRequestsApi,
  type ReturnRequest,
} from '@/features/returns/api/returnRequestsApi';
import { getApiErrorMessage } from '@/utils/apiError';
import { formatCurrency, formatDateTime } from '@/utils/formatters';
import { Seo } from '@/components/Seo';

const statusLabels: Record<string, string> = {
  PendingReview: 'Chờ duyệt',
  Approved: 'Đã duyệt, chờ gửi máy',
  AwaitingCustomerConfirmation: 'Chờ bạn xác nhận mức hoàn',
  AssessmentDisputed: 'Đang kiểm tra lại kết quả',
  Rejected: 'Bị từ chối',
  RefundPending: 'Chờ hoàn tiền',
  RefundProcessing: 'Chờ bạn xác nhận đã nhận tiền',
  RefundDisputed: 'Đang đối soát hoàn tiền',
  Completed: 'Hoàn tất',
  Cancelled: 'Đã hủy',
};

const statusClasses: Record<string, string> = {
  PendingReview: 'bg-amber-50 text-amber-700',
  Approved: 'bg-red-50 text-[#c4000b]',
  AwaitingCustomerConfirmation: 'bg-blue-50 text-blue-700',
  AssessmentDisputed: 'bg-orange-50 text-orange-700',
  Rejected: 'bg-red-50 text-red-700',
  RefundPending: 'bg-violet-50 text-violet-700',
  RefundProcessing: 'bg-blue-50 text-blue-700',
  RefundDisputed: 'bg-red-50 text-red-700',
  Completed: 'bg-emerald-50 text-emerald-700',
  Cancelled: 'bg-slate-100 text-slate-600',
};

const CustomerReturns: React.FC = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<ReturnRequest[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [orderId, setOrderId] = useState('');
  const [requestType, setRequestType] = useState<'Return' | 'Exchange'>('Return');
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [reasonCategory, setReasonCategory] = useState('ChangeOfMind');
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountNumberConfirm, setAccountNumberConfirm] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [refundMethod, setRefundMethod] = useState<'CASH' | 'BANK'>('CASH');
  const [refundDestinationConfirmed, setRefundDestinationConfirmed] = useState(false);
  const [disputeNotes, setDisputeNotes] = useState<Record<number, string>>({});

  const loadData = useCallback(async () => {
    if (!user?.userid) return;
    setLoading(true);
    setError('');
    try {
      const [requestResponse, orderResponse] = await Promise.all([
        returnRequestsApi.getMine(),
        ordersApi.getByUser(Number(user.userid)),
      ]);
      setRequests(requestResponse.data);
      setOrders(orderResponse.data);
    } catch (requestError: unknown) {
      setError(getApiErrorMessage(requestError, 'Không thể tải dữ liệu đổi trả.'));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const eligibleOrders = useMemo(() => orders.filter(order => {
    const deliveredAt = order.shipment?.deliveredat ?? order.orderdate;
    if (order.orderstatus !== 'Completed' || !deliveredAt) return false;
    return new Date(deliveredAt).getTime() >= Date.now() - 30 * 24 * 60 * 60 * 1000;
  }), [orders]);

  const selectedOrder = eligibleOrders.find(order => order.orderid === Number(orderId));

  const openCreate = () => {
    setOrderId('');
    setRequestType('Return');
    setSelectedItems([]);
    setReasonCategory('ChangeOfMind');
    setReason('');
    setDescription('');
    setFiles([]);
    setBankName('');
    setAccountNumber('');
    setAccountNumberConfirm('');
    setAccountHolder('');
    setRefundMethod('CASH');
    setRefundDestinationConfirmed(false);
    setCreateOpen(true);
  };

  const toggleItem = (itemId: number) => {
    setSelectedItems(current =>
      current.includes(itemId)
        ? current.filter(id => id !== itemId)
        : [...current, itemId],
    );
  };

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!orderId || selectedItems.length === 0) return;
    setWorking(true);
    setError('');
    try {
      const imageurls = files.length
        ? (await returnRequestsApi.uploadImages(files)).data.map(item => item.url)
        : [];
      await returnRequestsApi.create({
        orderid: Number(orderId),
        requesttype: requestType,
        reasoncategory: reasonCategory,
        reason: reason.trim(),
        description: description.trim() || undefined,
        orderitemids: selectedItems,
        imageurls,
        refunddestination: requestType === 'Return'
          ? refundMethod === 'BANK'
            ? {
                method: 'BANK',
                bankname: bankName.trim(),
                accountnumber: accountNumber.trim(),
                accountholder: accountHolder.trim(),
                confirmed: refundDestinationConfirmed,
              }
            : { method: 'CASH', confirmed: refundDestinationConfirmed }
          : undefined,
      });
      setCreateOpen(false);
      await loadData();
    } catch (requestError: unknown) {
      setError(getApiErrorMessage(requestError, 'Không thể tạo yêu cầu đổi trả.'));
    } finally {
      setWorking(false);
    }
  };

  const handleAssessment = async (id: number, accepted: boolean) => {
    const note = disputeNotes[id]?.trim();
    if (!accepted && !note) return;
    setWorking(true);
    setError('');
    try {
      await returnRequestsApi.confirmAssessment(id, accepted, note || undefined);
      await loadData();
    } catch (requestError: unknown) {
      setError(getApiErrorMessage(requestError, 'Không thể xác nhận kết quả kiểm định.'));
    } finally {
      setWorking(false);
    }
  };

  const handleCancel = async (id: number) => {
    setWorking(true);
    setError('');
    try {
      await returnRequestsApi.cancel(id);
      await loadData();
    } catch (requestError: unknown) {
      setError(getApiErrorMessage(requestError, 'Không thể hủy yêu cầu.'));
    } finally {
      setWorking(false);
    }
  };

  const handleConfirmRefund = async (id: number) => {
    setWorking(true);
    setError('');
    try {
      await returnRequestsApi.confirmRefundReceipt(id);
      await loadData();
    } catch (requestError: unknown) {
      setError(getApiErrorMessage(requestError, 'Không thể xác nhận đã nhận tiền.'));
    } finally {
      setWorking(false);
    }
  };

  const handleDisputeRefund = async (id: number) => {
    const note = disputeNotes[id]?.trim();
    if (!note) return;
    setWorking(true);
    setError('');
    try {
      await returnRequestsApi.disputeRefund(id, note);
      await loadData();
    } catch (requestError: unknown) {
      setError(getApiErrorMessage(requestError, 'Không thể gửi thông báo chưa nhận tiền.'));
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <Seo title="Đổi trả và hoàn tiền - Cuồng Điện Thoại" description="Trang yêu cầu đổi trả và hoàn tiền của khách hàng Cuồng Điện Thoại." noIndex />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Đổi trả & hoàn tiền</h1>
          <p className="mt-1 text-sm text-slate-500">
            Gửi yêu cầu trong vòng 30 ngày đối với đơn đã hoàn thành và theo dõi từng bước xử lý.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={loadData}>
            <RefreshCcw size={16} className="mr-2" /> Làm mới
          </Button>
          <Button onClick={openCreate}>
            <Plus size={16} className="mr-2" /> Tạo yêu cầu
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="h-40 animate-pulse rounded-2xl bg-slate-100" />
      ) : requests.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center">
          <RotateCcw size={42} className="mx-auto text-slate-300" />
          <p className="mt-3 font-bold text-slate-600">Bạn chưa có yêu cầu đổi trả nào.</p>
          <p className="mt-1 text-sm text-slate-400">Chỉ các sản phẩm đã giao thành công mới xuất hiện trong form.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map(request => (
            <article key={request.returnrequestid} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Yêu cầu #{request.returnrequestid} · Đơn #{request.orderid}
                  </p>
                  <h2 className="mt-1 font-black text-slate-900">
                    {request.requesttype === 'Return' ? 'Trả hàng' : 'Đổi máy'}: {request.reason}
                  </h2>
                  <p className="mt-1 text-xs text-slate-400">
                    {request.requestedat ? formatDateTime(request.requestedat) : 'Chưa có thời gian'}
                  </p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusClasses[request.status] ?? 'bg-slate-100'}`}>
                  {statusLabels[request.status] ?? request.status}
                </span>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {request.items.map(item => (
                  <div key={item.returnitemid} className="rounded-2xl bg-slate-50 p-3 text-sm">
                    <p className="font-bold text-slate-800">{item.productname ?? item.sku ?? 'Sản phẩm'}</p>
                    <p className="mt-1 text-xs text-slate-500">IMEI: {item.imei}</p>
                    {item.replacementimei && (
                      <p className="mt-1 text-xs font-semibold text-emerald-600">
                        IMEI thay thế: {item.replacementimei}
                      </p>
                    )}
                    {item.disposition && <p className="mt-1 text-xs text-slate-500">Phân loại: {item.disposition}</p>}
                  </div>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                <div className="text-sm text-slate-500">
                  {request.requesttype === 'Return' && (
                    <>Hoàn dự kiến: <b className="text-slate-800">{formatCurrency(request.requestedrefundamount)}</b></>
                  )}
                  {request.approvedrefundamount != null && (
                    <span className="ml-3 text-blue-700">
                      Sau kiểm định: {formatCurrency(request.approvedrefundamount)}
                    </span>
                  )}
                  {request.refundamount != null && (
                    <span className="ml-3 text-emerald-600">Đã hoàn: {formatCurrency(request.refundamount)}</span>
                  )}
                </div>
                {request.status === 'PendingReview' && (
                  <Button
                    size="sm"
                    variant="danger"
                    disabled={working}
                    onClick={() => handleCancel(request.returnrequestid)}
                  >
                    <XCircle size={14} className="mr-1.5" /> Hủy yêu cầu
                  </Button>
                )}
              </div>
              {request.reviewnote && (
                <p className="mt-3 rounded-full bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  Phản hồi: {request.reviewnote}
                </p>
              )}
              {request.status === 'AwaitingCustomerConfirmation' && (
                <div className="mt-4 space-y-3 rounded-2xl border border-blue-200 bg-blue-50/50 p-4">
                  <div>
                    <p className="font-black text-blue-900">Xác nhận kết quả kiểm định</p>
                    <p className="mt-1 text-xs leading-5 text-blue-700">
                      Kho đã kiểm tra thiết bị. Tiền hoàn chỉ được xử lý sau khi bạn đồng ý mức dưới đây.
                    </p>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-3">
                    <div className="rounded-xl bg-white p-3 text-sm">
                      <span className="block text-xs text-slate-400">Đã thanh toán</span>
                      <b>{formatCurrency(request.items.reduce((sum, item) => sum + item.originalpaidamount, 0))}</b>
                    </div>
                    <div className="rounded-xl bg-white p-3 text-sm">
                      <span className="block text-xs text-slate-400">Khấu hao</span>
                      <b className="text-red-600">-{formatCurrency(request.refundcalculation?.totaldeductionamount ?? 0)}</b>
                    </div>
                    <div className="rounded-xl bg-white p-3 text-sm">
                      <span className="block text-xs text-slate-400">Sẽ hoàn</span>
                      <b className="text-emerald-600">{formatCurrency(request.approvedrefundamount ?? 0)}</b>
                    </div>
                  </div>
                  {request.refundcalculation?.items.map(item => (
                    <div key={item.orderitemid} className="rounded-xl bg-white p-3 text-xs leading-5 text-slate-600">
                      <b className="text-slate-800">IMEI {item.imei}</b>
                      <p>
                        Phân loại {item.inspectiongrade} · khấu hao {item.totaldeductionrate}%
                        {' '}({formatCurrency(item.deductionamount)})
                      </p>
                    </div>
                  ))}
                  <textarea
                    rows={2}
                    value={disputeNotes[request.returnrequestid] ?? ''}
                    onChange={event => setDisputeNotes(current => ({
                      ...current,
                      [request.returnrequestid]: event.target.value,
                    }))}
                    placeholder="Nếu không đồng ý, nhập lý do để Manager yêu cầu kiểm định lại"
                    className="w-full rounded-2xl border border-blue-200 px-3 py-2 text-sm"
                  />
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Button
                      variant="danger"
                      disabled={working || !disputeNotes[request.returnrequestid]?.trim()}
                      onClick={() => handleAssessment(request.returnrequestid, false)}
                    >
                      Không đồng ý
                    </Button>
                    <Button disabled={working} onClick={() => handleAssessment(request.returnrequestid, true)}>
                      Đồng ý mức hoàn
                    </Button>
                  </div>
                </div>
              )}
              {request.status === 'RefundProcessing' && (
                <div className="mt-4 space-y-3 rounded-2xl border border-blue-200 bg-blue-50/50 p-4">
                  <div>
                    <p className="font-black text-blue-900">Cửa hàng đã khai báo giao dịch hoàn tiền</p>
                    <p className="mt-1 text-xs leading-5 text-blue-700">
                      Chỉ xác nhận khi tiền đã thực sự vào tài khoản hoặc bạn đã nhận đủ tiền mặt.
                    </p>
                  </div>
                  {request.refundtransactions.filter(item => item.status === 'Processing').map(transaction => (
                    <div key={transaction.refundtransactionid} className="rounded-xl bg-white p-3 text-sm">
                      <b>{formatCurrency(transaction.amount)}</b>
                      <p className="mt-1 text-xs text-slate-500">
                        {transaction.provider} · {transaction.transactionref ?? 'Không có mã giao dịch'}
                      </p>
                    </div>
                  ))}
                  <textarea
                    rows={2}
                    value={disputeNotes[request.returnrequestid] ?? ''}
                    onChange={event => setDisputeNotes(current => ({
                      ...current,
                      [request.returnrequestid]: event.target.value,
                    }))}
                    placeholder="Nếu chưa nhận, mô tả thời điểm kiểm tra và thông tin cần đối soát"
                    className="w-full rounded-2xl border border-blue-200 px-3 py-2 text-sm"
                  />
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Button
                      variant="danger"
                      disabled={working || !disputeNotes[request.returnrequestid]?.trim()}
                      onClick={() => handleDisputeRefund(request.returnrequestid)}
                    >
                      Tôi chưa nhận được tiền
                    </Button>
                    <Button disabled={working} onClick={() => handleConfirmRefund(request.returnrequestid)}>
                      Tôi đã nhận đủ tiền
                    </Button>
                  </div>
                </div>
              )}
              {request.histories.length > 0 && (
                <details className="mt-4 rounded-2xl border border-slate-200 p-4">
                  <summary className="cursor-pointer text-sm font-black text-slate-800">
                    Lịch sử xử lý ({request.histories.length})
                  </summary>
                  <div className="mt-3 space-y-3 border-l-2 border-slate-100 pl-4">
                    {request.histories.map(history => (
                      <div key={history.historyid}>
                        <p className="text-sm font-bold text-slate-700">
                          {statusLabels[history.tostatus] ?? history.tostatus}
                        </p>
                        <p className="text-xs text-slate-400">
                          {history.createdat ? formatDateTime(history.createdat) : 'Chưa có thời gian'}
                        </p>
                        {history.note && <p className="mt-1 text-sm text-slate-500">{history.note}</p>}
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </article>
          ))}
        </div>
      )}

      <Modal isOpen={createOpen} onClose={() => !working && setCreateOpen(false)} title="Tạo yêu cầu đổi trả" size="lg">
        <form onSubmit={handleCreate} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="return-order" className="mb-1.5 block text-sm font-bold text-slate-700">Đơn hàng</label>
              <select
                id="return-order"
                required
                value={orderId}
                onChange={event => {
                  setOrderId(event.target.value);
                  setSelectedItems([]);
                  const nextOrder = eligibleOrders.find(order => order.orderid === Number(event.target.value));
                  setRefundMethod(nextOrder?.paymentmethod === 'BANK' ? 'BANK' : 'CASH');
                  setRefundDestinationConfirmed(false);
                }}
                className="w-full rounded-2xl border border-slate-200 px-3 py-3 text-sm"
              >
                <option value="">Chọn đơn trong 30 ngày</option>
                {eligibleOrders.map(order => (
                  <option key={order.orderid} value={order.orderid}>
                    Đơn #{order.orderid} · {formatCurrency(order.finalamount ?? 0)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="return-type" className="mb-1.5 block text-sm font-bold text-slate-700">Hình thức</label>
              <select
                id="return-type"
                value={requestType}
                onChange={event => setRequestType(event.target.value as 'Return' | 'Exchange')}
                className="w-full rounded-2xl border border-slate-200 px-3 py-3 text-sm"
              >
                <option value="Return">Trả hàng và hoàn tiền</option>
                <option value="Exchange">Đổi sang máy cùng cấu hình</option>
              </select>
            </div>
          </div>

          {selectedOrder && (
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">Sản phẩm cần xử lý</label>
              <div className="space-y-2">
                {(selectedOrder.orderitems ?? []).map(item => (
                  <label key={item.orderitemid} className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 p-3 hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(item.orderitemid)}
                      onChange={() => toggleItem(item.orderitemid)}
                      className="h-4 w-4"
                    />
                    <PackageCheck size={18} className="text-[#e30613]" />
                    <span className="flex-1">
                      <span className="block text-sm font-bold text-slate-800">{item.productname ?? item.variantsku ?? 'Sản phẩm'}</span>
                      <span className="text-xs text-slate-500">IMEI: {item.imei}</span>
                    </span>
                    <b className="text-sm">{formatCurrency(item.sellingprice)}</b>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div>
            <label htmlFor="return-reason-category" className="mb-1.5 block text-sm font-bold text-slate-700">
              Nhóm lý do
            </label>
            <select
              id="return-reason-category"
              required
              value={reasonCategory}
              onChange={event => setReasonCategory(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
            >
              <option value="ChangeOfMind">Thay đổi nhu cầu / không còn muốn sử dụng</option>
              <option value="ManufacturerDefect">Nghi ngờ lỗi nhà sản xuất</option>
              <option value="StoreFault">Sản phẩm không đúng cam kết của cửa hàng</option>
              <option value="CarrierDamage">Hư hỏng trong quá trình vận chuyển</option>
              <option value="CustomerDamage">Sự cố do quá trình sử dụng</option>
              <option value="Other">Lý do khác</option>
            </select>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              Đổi ý: Còn nguyên seal trong 7 ngày hoàn 100%; Đã bóc seal: khấu hao 10% trong 7 ngày, 15% (ngày 8–15) và 20% (ngày 16–30).
              Lỗi thuộc nhà sản xuất, cửa hàng hoặc vận chuyển được xác nhận sẽ hoàn 100% không khấu hao.
            </p>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-bold text-slate-700">Mô tả lý do</label>
            <input
              required
              value={reason}
              onChange={event => setReason(event.target.value)}
              placeholder="Ví dụ: sản phẩm lỗi, không đúng mô tả..."
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-bold text-slate-700">Mô tả tình trạng</label>
            <textarea
              rows={4}
              value={description}
              onChange={event => setDescription(event.target.value)}
              placeholder="Tình trạng máy, phụ kiện và hộp khi gửi lại..."
              className="w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm"
            />
          </div>
          {requestType === 'Return' && selectedOrder && (
            <div className="space-y-3 rounded-2xl border border-blue-200 bg-blue-50/50 p-4">
              <div>
                <p className="text-sm font-black text-blue-900">Phương thức nhận tiền hoàn</p>
                <p className="mt-1 text-xs text-blue-700">
                  Tiền sẽ được chuyển lại sau khi kho kiểm tra và chấp nhận sản phẩm.
                </p>
              </div>
              <select
                value={refundMethod}
                disabled={selectedOrder.paymentmethod === 'BANK'}
                onChange={event => {
                  setRefundMethod(event.target.value as 'CASH' | 'BANK');
                  setRefundDestinationConfirmed(false);
                }}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
              >
                {selectedOrder.paymentmethod !== 'BANK' && <option value="CASH">Nhận tiền mặt tại cửa hàng</option>}
                <option value="BANK">Nhận qua tài khoản ngân hàng</option>
              </select>
              {refundMethod === 'BANK' && (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input required value={bankName} onChange={event => setBankName(event.target.value)} placeholder="Tên ngân hàng" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" />
                    <input required inputMode="numeric" value={accountNumber} onChange={event => setAccountNumber(event.target.value.replace(/\D/g, ''))} placeholder="Số tài khoản" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" />
                  </div>
                  <input
                    required
                    inputMode="numeric"
                    value={accountNumberConfirm}
                    onChange={event => setAccountNumberConfirm(event.target.value.replace(/\D/g, ''))}
                    placeholder="Nhập lại số tài khoản"
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                  />
                  {accountNumberConfirm && accountNumberConfirm !== accountNumber && (
                    <p className="text-xs font-semibold text-red-600">Hai số tài khoản chưa trùng khớp.</p>
                  )}
                  <input required value={accountHolder} onChange={event => setAccountHolder(event.target.value)} placeholder="Tên chủ tài khoản" className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm uppercase" />
                  <p className="text-xs leading-5 text-blue-700">
                    Hãy kiểm tra kỹ. Sau khi yêu cầu được duyệt, thông tin này sẽ được dùng để chuyển tiền và mọi thay đổi đều phải được ghi nhận.
                  </p>
                </>
              )}
              <label className="flex items-start gap-2 rounded-xl bg-white p-3 text-xs leading-5 text-slate-600">
                <input
                  required
                  type="checkbox"
                  checked={refundDestinationConfirmed}
                  onChange={event => setRefundDestinationConfirmed(event.target.checked)}
                  className="mt-1 h-4 w-4"
                />
                Tôi đã kiểm tra và xác nhận thông tin nhận tiền hoàn là chính xác.
              </label>
            </div>
          )}
          <div>
            <label className="mb-1.5 block text-sm font-bold text-slate-700">Ảnh thiết bị (tối đa 6)</label>
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 p-5 text-sm font-semibold text-slate-500 hover:border-red-300 hover:bg-red-50">
              <Camera size={20} /> Chọn ảnh từ máy
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
                onChange={event => setFiles(Array.from(event.target.files ?? []).slice(0, 6))}
              />
            </label>
            {files.length > 0 && <p className="mt-2 text-xs text-slate-500">Đã chọn {files.length} ảnh.</p>}
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>Hủy</Button>
            <Button
              type="submit"
              isLoading={working}
              disabled={
                !orderId ||
                selectedItems.length === 0 ||
                !reason.trim() ||
                (requestType === 'Return' && (
                  !refundDestinationConfirmed ||
                  (refundMethod === 'BANK' && accountNumber !== accountNumberConfirm)
                ))
              }
            >
              Gửi yêu cầu
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default CustomerReturns;
