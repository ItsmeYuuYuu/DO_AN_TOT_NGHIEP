import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '@/features/auth/api/authApi';
import { Mail, ChevronLeft, XCircle } from 'lucide-react';

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    try {
      const res = await authApi.forgotPassword(email);
      setSuccess(res.data.message || 'Yêu cầu đặt lại mật khẩu đã được xử lý.');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Đã xảy ra lỗi. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 max-w-md w-full">
        <h1 className="text-2xl font-black text-slate-800 mb-2">Quên mật khẩu?</h1>
        <p className="text-slate-500 text-sm mb-8">Nhập email đăng ký của bạn để nhận hướng dẫn đặt lại mật khẩu.</p>

        {error && (
          <div className="mb-6 flex items-center gap-2 text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm">
            <XCircle size={15} /> {error}
          </div>
        )}

        {success ? (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-blue-100 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">📧</div>
            <p className="text-slate-700 font-medium leading-relaxed mb-6">{success}</p>
            <Link to="/auth/login" className="inline-flex items-center justify-center gap-2 py-3 bg-blue-600 text-white font-black rounded-xl hover:bg-blue-700 transition-colors w-full">
              Quay lại Đăng nhập
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input type="email" placeholder="Nhập địa chỉ Email *" required
                value={email} onChange={e => setEmail(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-sm font-medium outline-none transition-colors"
              />
            </div>
            <button type="submit" disabled={loading || !email}
              className="w-full py-3 bg-blue-600 text-white font-black rounded-xl hover:bg-blue-700 disabled:opacity-60 transition-colors mt-2"
            >
              {loading ? 'Đang gửi...' : 'Gửi yêu cầu'}
            </button>
          </form>
        )}

        {!success && (
          <div className="mt-8 text-center">
            <Link to="/auth/login" className="inline-flex items-center gap-1 text-slate-500 font-medium hover:text-slate-800 transition-colors">
              <ChevronLeft size={14} /> Quay lại trang đăng nhập
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
