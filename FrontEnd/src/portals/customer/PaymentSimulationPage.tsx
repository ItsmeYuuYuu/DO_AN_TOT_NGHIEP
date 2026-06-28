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
  const [result, setResult] = useState<'success' | 'failed' | null>(null);
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
      const seconds = Math.max(
        0,
        Math.floor((new Date(checkout.reservationexpiresat!).getTime() - Date.now()) / 1000),
      );
      setRemainingSeconds(seconds);
    };

    updateCountdown();
    const timer = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(timer);
  }, [checkout?.reservationexpiresat]);

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

  return (
    <div className="customer-shell min-h-screen px-4 py-12">
      <Seo title="Thanh toán đơn hàng - Cuồng Điện Thoại" description="Trang thanh toán đơn hàng Cuồng Điện Thoại." noIndex />
      <div className="customer-panel mx-auto max-w-xl overflow-hidden">
        <div className="bg-gradient-to-r from-[#1f2937] to-[#e30613] p-7 text-white">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-white/70">Thanh toán đơn hàng</p>
              <h1 className="mt-1 text-2xl font-black">#{checkout.orderid}</h1>
            </div>
            <CreditCard size={38} className="text-white/70" />
          </div>
        </div>

        <div className="space-y-5 p-7">
          {!isPaid && !isDepositPaid && checkout.reservationexpiresat && (
            <div className={`flex items-center justify-between rounded-2xl px-4 py-3 ${expired ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>
              <span className="flex items-center gap-2 font-bold"><Clock3 size={18} /> Thời gian giữ hàng</span>
              <span className="font-mono text-lg font-black tabular-nums">{countdown}</span>
            </div>
          )}

          <div className="space-y-3 text-sm">
            <div className="flex justify-between gap-4"><span className="text-slate-500">Người nhận</span><span className="text-right font-bold text-slate-800">{checkout.shippingname ?? 'Khách hàng'}</span></div>
            <div className="flex justify-between gap-4"><span className="text-slate-500">Phương thức</span><span className="text-right font-bold text-slate-800">{provider}</span></div>
            <div className="flex justify-between gap-4"><span className="text-slate-500">Giá trị đơn</span><span className="font-bold text-slate-800">{formatCurrency(checkout.finalamount)}</span></div>
            <div className="flex justify-between gap-4"><span className="text-slate-500">Đã thanh toán</span><span className="font-bold text-emerald-600">{formatCurrency(checkout.paidamount)}</span></div>
          </div>

          <div className="rounded-2xl border border-red-100 bg-red-50 p-5 text-center">
            <p className="text-sm font-semibold text-[#c4000b]">Số tiền cần thanh toán</p>
            <p className="mt-1 text-3xl font-black text-[#c4000b]">{formatCurrency(checkout.requiredpayment)}</p>
          </div>

          {!isPaid && !isDepositPaid && checkout.qrImageUrl && (
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
              {checkout.requiresStaffConfirmation && (
                <p className="mt-3 rounded-2xl bg-amber-50 px-3 py-2 text-xs font-black text-amber-700">
                  Chuyển khoản ngân hàng cần nhân viên Sales xác nhận sau khi đối soát.
                </p>
              )}
            </div>
          )}

          {message && (
            <div className={`rounded-2xl p-4 text-sm font-semibold ${result === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
              {message}
            </div>
          )}

          {result === 'success' || isPaid || isDepositPaid ? (
            <div className="py-2 text-center">
              <CheckCircle2 size={48} className="mx-auto mb-3 text-emerald-500" />
              <Link to="/order-lookup" className="inline-flex rounded-2xl bg-[#e30613] px-5 py-3 font-bold text-white">
                Tra cứu đơn hàng
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {!checkout.requiresStaffConfirmation && (
                <button
                  onClick={() => submitPayment(true)}
                  disabled={submitting || expired}
                  className="w-full rounded-2xl bg-[#e30613] py-3.5 font-black text-white transition-colors hover:bg-[#c4000b] disabled:bg-slate-300"
                >
                  {submitting ? 'Đang xử lý...' : 'Xác nhận đã thanh toán'}
                </button>
              )}
              <button
                onClick={() => submitPayment(false)}
                disabled={submitting || expired}
                className="w-full rounded-2xl border border-slate-200 py-3 font-bold text-slate-600 hover:bg-slate-50"
              >
                Báo giao dịch không thành công
              </button>
              {result === 'failed' && !expired && (
                <button onClick={loadPayment} className="mx-auto flex items-center gap-2 text-sm font-bold text-[#e30613]">
                  <RefreshCcw size={15} /> Tải lại giao dịch
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      <p className="mt-4 text-center text-xs text-slate-400">
        Thanh toán đang chạy ở chế độ sandbox phục vụ demo khóa luận, không phát sinh giao dịch thật.
      </p>
    </div>
  );
};

export default PaymentSimulationPage;
