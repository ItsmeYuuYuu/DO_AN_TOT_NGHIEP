import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Clock3, CreditCard, Loader2, RefreshCcw, XCircle } from 'lucide-react';
import { ordersApi, type PaymentCheckout } from '@/features/orders/api/ordersApi';
import { formatCurrency } from '@/utils/formatters';
import { getApiErrorMessage } from '@/utils/apiError';

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
          ? 'Đơn hàng đã được thanh toán đầy đủ.'
          : 'Đã ghi nhận tiền cọc. Đơn hàng có thể được nhân viên tiếp nhận xử lý.',
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
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 size={36} className="animate-spin text-blue-600" />
      </div>
    );
  }

  if (!checkout) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <XCircle size={56} className="mx-auto text-red-500 mb-4" />
        <h1 className="text-2xl font-black text-slate-900">Không thể thanh toán</h1>
        <p className="text-slate-500 mt-2 mb-6">{message}</p>
        <Link to="/" className="inline-flex px-5 py-3 rounded-xl bg-blue-600 text-white font-bold">
          Về trang chủ
        </Link>
      </div>
    );
  }

  const isPaid = checkout.paymentstatus === 'Paid';
  const isDepositPaid = checkout.paymentstatus === 'DepositPaid';
  const expired = checkout.reservationexpiresat ? remainingSeconds <= 0 : false;

  return (
    <div className="max-w-xl mx-auto px-4 py-12">
      <div className="bg-white border border-slate-200 rounded-3xl shadow-xl shadow-slate-200/60 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-700 to-blue-500 text-white p-7">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-blue-100 text-sm font-semibold">Thanh toán đơn hàng</p>
              <h1 className="text-2xl font-black mt-1">#{checkout.orderid}</h1>
            </div>
            <CreditCard size={38} className="text-blue-100" />
          </div>
        </div>

        <div className="p-7 space-y-5">
          {!isPaid && !isDepositPaid && checkout.reservationexpiresat && (
            <div className={`flex items-center justify-between rounded-2xl px-4 py-3 ${expired ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>
              <span className="flex items-center gap-2 font-bold"><Clock3 size={18} /> Thời gian giữ hàng</span>
              <span className="font-black tabular-nums text-lg">{countdown}</span>
            </div>
          )}

          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Người nhận</span><span className="font-bold text-slate-800">{checkout.shippingname ?? 'Khách hàng'}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Phương thức</span><span className="font-bold text-slate-800">{checkout.paymentmethod}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Giá trị đơn</span><span className="font-bold text-slate-800">{formatCurrency(checkout.finalamount)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Đã thanh toán</span><span className="font-bold text-emerald-600">{formatCurrency(checkout.paidamount)}</span></div>
          </div>

          <div className="rounded-2xl bg-blue-50 border border-blue-100 p-5 text-center">
            <p className="text-sm text-blue-700 font-semibold">Số tiền cần thanh toán</p>
            <p className="text-3xl font-black text-blue-700 mt-1">{formatCurrency(checkout.requiredpayment)}</p>
          </div>

          {message && (
            <div className={`rounded-xl p-4 text-sm font-semibold ${result === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
              {message}
            </div>
          )}

          {result === 'success' || isPaid || isDepositPaid ? (
            <div className="text-center py-2">
              <CheckCircle2 size={48} className="mx-auto text-emerald-500 mb-3" />
              <Link to="/order-lookup" className="inline-flex px-5 py-3 bg-blue-600 text-white font-bold rounded-xl">
                Tra cứu đơn hàng
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              <button
                onClick={() => submitPayment(true)}
                disabled={submitting || expired}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-black rounded-xl transition-colors"
              >
                {submitting ? 'Đang xử lý...' : `Mô phỏng thanh toán ${formatCurrency(checkout.requiredpayment)}`}
              </button>
              <button
                onClick={() => submitPayment(false)}
                disabled={submitting || expired}
                className="w-full py-3 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50"
              >
                Mô phỏng giao dịch thất bại
              </button>
              {result === 'failed' && !expired && (
                <button onClick={loadPayment} className="mx-auto flex items-center gap-2 text-sm font-bold text-blue-600">
                  <RefreshCcw size={15} /> Tải lại giao dịch
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      <p className="text-xs text-slate-400 text-center mt-4">
        Đây là cổng thanh toán giả lập phục vụ trình diễn khóa luận, không phát sinh giao dịch thật.
      </p>
    </div>
  );
};

export default PaymentSimulationPage;
