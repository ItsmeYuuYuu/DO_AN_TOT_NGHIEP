import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Clock3, CreditCard, Loader2, RefreshCcw, XCircle } from 'lucide-react';
import { Seo } from '@/components/Seo';
import { ordersApi, type PaymentCheckout } from '@/features/orders/api/ordersApi';
import { getApiErrorMessage } from '@/utils/apiError';
import { formatCurrency } from '@/utils/formatters';

const providerLabel: Record<string, string> = {
  MOMO: 'Momo',
  VNPAY: 'VNPay',
  BANK: 'Chuyển khoản ngân hàng',
};

const PaymentSimulationPage: React.FC = () => {
  const { orderId } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const numericOrderId = Number(orderId);
  const [checkout, setCheckout] = useState<PaymentCheckout | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<'success' | 'failed' | 'cancelled' | null>(null);
  const [message, setMessage] = useState('');

  const loadPayment = useCallback(async () => {
    if (!numericOrderId || !token) {
      setMessage('Liên kết thanh toán không hợp lệ.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setMessage('');
    try {
      const response = await ordersApi.getPayment(numericOrderId, token);
      setCheckout(response.data);
    } catch (error: unknown) {
      setMessage(getApiErrorMessage(error, 'Không thể tải thông tin thanh toán.'));
    } finally {
      setLoading(false);
    }
  }, [numericOrderId, token]);

  useEffect(() => {
    loadPayment();
  }, [loadPayment]);

  useEffect(() => {
    if (!checkout?.reservationexpiresat) {
      setRemainingSeconds(0);
      return;
    }

    const updateCountdown = () => {
      const dateStr = checkout.reservationexpiresat!;
      const utcStr = dateStr.endsWith('Z') || dateStr.includes('+') ? dateStr : `${dateStr}Z`;
      const seconds = Math.max(
        0,
        Math.floor((new Date(utcStr).getTime() - Date.now()) / 1000),
      );
      setRemainingSeconds(seconds);
    };

    updateCountdown();
    const timer = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(timer);
  }, [checkout?.reservationexpiresat]);

  useEffect(() => {
    if (!checkout || checkout.paymentstatus === 'Paid' || checkout.paymentstatus === 'DepositPaid') return;

    const interval = window.setInterval(async () => {
      // Parse UTC expiration correctly inside interval
      const dateStr = checkout.reservationexpiresat;
      const isExpired = dateStr 
        ? (dateStr.endsWith('Z') || dateStr.includes('+') ? new Date(dateStr) : new Date(`${dateStr}Z`)).getTime() <= Date.now()
        : false;
        
      if (isExpired) {
        window.clearInterval(interval);
        return;
      }

      try {
        const response = await ordersApi.getPayment(numericOrderId, token);
        const newStatus = response.data.paymentstatus;
        if (newStatus === 'Paid' || newStatus === 'DepositPaid') {
          setCheckout(response.data);
          setResult('success');
          setMessage(
            newStatus === 'Paid'
              ? 'Đơn hàng đã được ghi nhận thanh toán đầy đủ qua ngân hàng (Real-time).'
              : 'Đã ghi nhận tiền cọc qua ngân hàng (Real-time). Nhân viên sẽ tiếp nhận đơn hàng.',
          );
        }
      } catch {
        // Ignore transient network errors during auto-polling
      }
    }, 3000);

    return () => window.clearInterval(interval);
  }, [checkout, numericOrderId, token]);

  const countdown = useMemo(() => {
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }, [remainingSeconds]);

  const submitPayment = async (success: boolean) => {
    if (!numericOrderId || !token) return;
    setSubmitting(true);
    setMessage('');
    try {
      const response = await ordersApi.simulatePayment(numericOrderId, token, success);
      setResult('success');
      setMessage(
        response.data.paymentstatus === 'Paid'
          ? 'Đơn hàng đã được ghi nhận thanh toán đầy đủ.'
          : 'Đã ghi nhận tiền cọc. Nhân viên sẽ tiếp nhận và xử lý đơn hàng.',
      );
      setCheckout(current => current ? {
        ...current,
        paymentstatus: response.data.paymentstatus,
        paidamount: response.data.paidamount,
        requiredpayment: response.data.remainingamount,
        reservationexpiresat: undefined,
      } : current);
    } catch (error: unknown) {
      setResult('failed');
      setMessage(getApiErrorMessage(error, 'Thanh toán thất bại. Vui lòng thử lại.'));
    } finally {
      setSubmitting(false);
    }
  };

  const cancelPayment = async () => {
    if (!numericOrderId || !token || submitting) return;
    if (!window.confirm('Ngừng giao dịch sẽ hủy đơn và trả máy đang giữ về kho. Bạn có chắc chắn?')) return;

    setSubmitting(true);
    setMessage('');
    try {
      await ordersApi.cancelPendingPayment(numericOrderId, token);
      setResult('cancelled');
      setMessage('Giao dịch đã được ngừng. Thiết bị giữ chỗ đã được trả về kho ngay.');
    } catch (error: unknown) {
      setMessage(getApiErrorMessage(error, 'Không thể ngừng giao dịch. Vui lòng tải lại để kiểm tra trạng thái thanh toán.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Seo title="Thanh toán đơn hàng - Cuồng Điện Thoại" description="Trang thanh toán đơn hàng Cuồng Điện Thoại." noIndex />
        <Loader2 size={36} className="animate-spin text-[#e30613]" />
      </div>
    );
  }

  if (!checkout) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <Seo title="Thanh toán đơn hàng - Cuồng Điện Thoại" description="Trang thanh toán đơn hàng Cuồng Điện Thoại." noIndex />
        <XCircle size={56} className="mx-auto mb-4 text-red-500" />
        <h1 className="text-2xl font-black text-slate-900">Không thể thanh toán</h1>
        <p className="mb-6 mt-2 text-slate-500">{message}</p>
        <Link to="/" className="inline-flex rounded-2xl bg-[#e30613] px-5 py-3 font-bold text-white">
          Về trang chủ
        </Link>
      </div>
    );
  }

  const isPaid = checkout.paymentstatus === 'Paid';
  const isDepositPaid = checkout.paymentstatus === 'DepositPaid';
  const expired = checkout.reservationexpiresat ? remainingSeconds <= 0 : false;
  const provider = providerLabel[(checkout.paymentmethod ?? '').toUpperCase()] ?? checkout.paymentmethod ?? 'Thanh toán';
  const showSuccess = isPaid || isDepositPaid || result === 'success';

  return (
    <div className="customer-shell min-h-screen px-4 py-12">
      <Seo title="Thanh toán đơn hàng - Cuồng Điện Thoại" description="Trang thanh toán đơn hàng Cuồng Điện Thoại." noIndex />
      <div className="customer-panel mx-auto max-w-xl overflow-hidden shadow-md">
        {result === 'cancelled' ? (
          <div className="bg-white p-8 text-center">
            <XCircle size={56} className="mx-auto mb-4 text-slate-500" />
            <h2 className="text-2xl font-black text-slate-900">Đã ngừng giao dịch</h2>
            <p className="mt-3 text-sm leading-6 text-slate-500">{message}</p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <Link to="/cart" className="rounded-2xl bg-[#e30613] px-6 py-3 font-black text-white">Quay lại giỏ hàng</Link>
              <Link to="/products" className="rounded-2xl border border-slate-200 px-6 py-3 font-bold text-slate-600">Tiếp tục mua sắm</Link>
            </div>
          </div>
        ) : showSuccess ? (
          // GIAO DIỆN THANH TOÁN THÀNH CÔNG CHUYÊN NGHIỆP
          <>
            <div className="bg-emerald-600 p-8 text-center text-white">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/20 text-white">
                <CheckCircle2 size={36} />
              </div>
              <h2 className="text-2xl font-black">
                {isDepositPaid ? 'Đặt cọc thành công' : 'Thanh toán thành công'}
              </h2>
              <p className="mt-2 text-sm text-white/80">
                Giao dịch của bạn đã được hệ thống ghi nhận thành công!
              </p>
            </div>

            <div className="space-y-6 p-7 bg-white">
              <p className="text-center text-sm text-slate-500 leading-6">
                Cảm ơn quý khách đã hoàn tất thanh toán. Đơn hàng đã được chuyển sang bộ phận vận hành để chuẩn bị đóng gói và giao hàng.
              </p>

              <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-5 space-y-3.5 text-sm">
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500 font-semibold">Mã đơn hàng</span>
                  <span className="font-bold text-slate-800">#{checkout.orderid}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500 font-semibold">Phương thức thanh toán</span>
                  <span className="font-bold text-slate-800">{provider}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500 font-semibold">Số tiền đã thanh toán</span>
                  <span className="font-black text-emerald-600">{formatCurrency(checkout.paidamount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold">Trạng thái đơn hàng</span>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-black text-emerald-700">
                    {isDepositPaid ? 'Đã đặt cọc 30%' : 'Đã thanh toán 100%'}
                  </span>
                </div>
              </div>

              <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center pt-2">
                <Link
                  to="/order-lookup"
                  className="w-full sm:w-auto text-center rounded-2xl bg-[#e30613] px-6 py-3 font-black text-white transition hover:bg-[#c4000b]"
                >
                  Tra cứu đơn hàng
                </Link>
                <Link
                  to="/products"
                  className="w-full sm:w-auto text-center rounded-2xl border border-slate-200 px-6 py-3 font-bold text-slate-600 hover:bg-slate-50"
                >
                  Tiếp tục mua sắm
                </Link>
              </div>
            </div>
          </>
        ) : (
          // GIAO DIỆN CHỜ THANH TOÁN (QUÉT MÃ QR)
          <>
            <div className="bg-gradient-to-r from-[#1f2937] to-[#e30613] p-7 text-white">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-white/70">Thanh toán đơn hàng</p>
                  <h1 className="mt-1 text-2xl font-black">#{checkout.orderid}</h1>
                </div>
                <CreditCard size={38} className="text-white/70" />
              </div>
            </div>

            <div className="space-y-5 p-7 bg-white">
              {checkout.reservationexpiresat && (
                <div className={`flex items-center justify-between rounded-2xl px-4 py-3 ${expired ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>
                  <span className="flex items-center gap-2 font-bold"><Clock3 size={18} /> Thời gian giữ hàng</span>
                  <span className="text-lg font-black tabular-nums">{countdown}</span>
                </div>
              )}

              <div className="space-y-3 text-sm">
                <div className="flex justify-between gap-4"><span className="text-slate-500">Người nhận</span><span className="text-right font-bold text-slate-800">{checkout.shippingname ?? 'Khách hàng'}</span></div>
                <div className="flex justify-between gap-4"><span className="text-slate-500">Phương thức</span><span className="text-right font-bold text-slate-800">{provider}</span></div>
                <div className="flex justify-between gap-4"><span className="text-slate-500">Giá trị hàng hóa</span><span className="font-bold text-slate-800">{formatCurrency(Math.max(0, checkout.finalamount - checkout.shippingfee))}</span></div>
                <div className="flex justify-between gap-4"><span className="text-slate-500">Phí vận chuyển</span><span className="font-bold text-slate-800">{formatCurrency(checkout.shippingfee)}</span></div>
                <div className="flex justify-between gap-4"><span className="text-slate-500">Tổng đơn hàng</span><span className="font-bold text-slate-800">{formatCurrency(checkout.finalamount)}</span></div>
              </div>

              <div className="rounded-2xl border border-red-100 bg-red-50 p-5 text-center">
                <p className="text-sm font-semibold text-[#c4000b]">Số tiền cần thanh toán</p>
                <p className="mt-1 text-3xl font-black text-[#c4000b]">{formatCurrency(checkout.requiredpayment)}</p>
              </div>

              {checkout.qrImageUrl && (
                <div className="rounded-3xl border border-slate-200 bg-white p-5 text-center shadow-sm">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Quét mã thanh toán</p>
                  <img
                    src={checkout.qrImageUrl}
                    alt={`QR thanh toán đơn hàng #${checkout.orderid}`}
                    className="mx-auto mt-4 h-56 w-56 rounded-2xl border border-slate-100 bg-white object-contain p-2"
                  />
                  {checkout.qrContent && (
                    <div className="mx-auto mt-4 max-w-sm rounded-2xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">
                      Nội dung chuyển khoản: <span className="font-black text-[#1f2937]">{checkout.qrContent}</span>
                    </div>
                  )}
                  {checkout.paymentInstructions && (
                    <p className="mt-3 text-sm font-semibold leading-6 text-slate-500">
                      {checkout.paymentInstructions}
                    </p>
                  )}
                </div>
              )}

              {message && (
                <div className="rounded-2xl p-4 text-sm font-semibold bg-red-50 text-red-700">
                  {message}
                </div>
              )}

              <div className="space-y-3">
                {checkout.paymentmethod?.toUpperCase() === 'BANK' ? (
                  <div className="flex flex-col items-center justify-center gap-2.5 rounded-2xl bg-slate-50 py-5 text-center border border-slate-100">
                    <Loader2 className="animate-spin text-[#e30613]" size={22} />
                    <p className="text-xs font-black text-slate-500 uppercase tracking-wider">
                      Đang chờ hệ thống tự động quét giao dịch...
                    </p>
                  </div>
                ) : (
                  !checkout.requiresStaffConfirmation && (
                    <button
                      onClick={() => submitPayment(true)}
                      disabled={submitting || expired}
                      className="w-full rounded-2xl bg-[#e30613] py-3.5 font-black text-white transition-colors hover:bg-[#c4000b] disabled:bg-slate-300"
                    >
                      {submitting ? 'Đang xử lý...' : 'Xác nhận đã thanh toán'}
                    </button>
                  )
                )}
                <button
                  onClick={cancelPayment}
                  disabled={submitting || expired}
                  className="w-full rounded-2xl border border-red-200 py-3 font-black text-red-600 hover:bg-red-50 disabled:text-slate-400"
                >
                  {submitting ? 'Đang ngừng giao dịch...' : 'Ngừng giao dịch'}
                </button>
                {result === 'failed' && !expired && (
                  <button onClick={loadPayment} className="mx-auto flex items-center gap-2 text-sm font-bold text-[#e30613]">
                    <RefreshCcw size={15} /> Tải lại giao dịch
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
      <p className="mt-4 text-center text-xs text-slate-400 font-semibold">
        Hệ thống tự động xác thực giao dịch chuyển khoản an toàn qua VietQR Napas.
      </p>
    </div>
  );
};

export default PaymentSimulationPage;
