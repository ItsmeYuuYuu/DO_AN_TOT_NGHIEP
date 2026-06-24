import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '@/features/auth/api/authApi';
import { AlertCircle, ArrowLeft, CheckCircle2, Mail, ShieldCheck } from 'lucide-react';
import Logo from '@/assets/Logo.png';

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await authApi.forgotPassword(email);
      setSuccess(response.data.message || 'Yêu cầu đặt lại mật khẩu đã được xử lý.');
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(message || 'Đã xảy ra lỗi. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="customer-shell min-h-screen px-4 py-8">
      <div className="customer-container flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <div className="grid w-full max-w-5xl overflow-hidden rounded-[30px] border border-[#e5e7eb] bg-white shadow-[0_24px_70px_rgba(15,23,42,0.14)] lg:grid-cols-[0.9fr_1.1fr]">
          <section className="relative hidden overflow-hidden bg-[#1f2937] p-10 text-white lg:flex lg:flex-col lg:justify-between">
            <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/5" />
            <div>
              <Link to="/" className="inline-flex rounded-2xl bg-white px-5 py-3 shadow-[0_14px_30px_rgba(227,6,19,0.18)]">
                <img src={Logo} alt="Cuồng Điện Thoại" className="h-16 w-auto object-contain" />
              </Link>
              <p className="mt-16 text-xs font-black uppercase tracking-[0.28em] text-[#ffd166]">Account recovery</p>
              <h1 className="customer-display mt-3 max-w-md text-5xl font-black leading-[0.95]">
                Lấy lại quyền truy cập tài khoản.
              </h1>
              <p className="mt-6 max-w-sm text-sm font-medium leading-7 text-white/70">
                Nhập email đã đăng ký để hệ thống xử lý yêu cầu đặt lại mật khẩu.
              </p>
            </div>
            <div className="rounded-[22px] border border-white/15 bg-white/10 p-4 backdrop-blur">
              <div className="mb-2 flex items-center gap-2">
                <ShieldCheck size={18} className="text-[#ffd166]" />
                <p className="text-xs font-black uppercase tracking-[0.18em]">Lưu ý demo</p>
              </div>
              <p className="text-xs leading-6 text-white/70">
                Chức năng quên mật khẩu hiện xử lý theo API hiện có của dự án; phần gửi email thật có thể bổ sung sau.
              </p>
            </div>
          </section>

          <section className="p-6 md:p-10 lg:p-14">
            <div className="mx-auto max-w-md">
              <Link to="/" className="mb-8 inline-flex lg:hidden">
                <img src={Logo} alt="Cuồng Điện Thoại" className="h-14 w-auto object-contain" />
              </Link>

              <p className="customer-label">Khôi phục tài khoản</p>
              <h2 className="customer-display mt-2 text-4xl font-black text-[#1f2937]">Quên mật khẩu?</h2>
              <p className="mt-2 text-sm font-medium text-slate-500">
                Nhập email đăng ký để nhận hướng dẫn đặt lại mật khẩu.
              </p>

              {error && (
                <div className="mt-6 flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                  <AlertCircle size={16} className="shrink-0" /> {error}
                </div>
              )}

              {success ? (
                <div className="mt-8 rounded-[24px] border border-red-100 bg-red-50 p-8 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-[#e30613]">
                    <CheckCircle2 size={34} />
                  </div>
                  <p className="font-bold leading-relaxed text-[#1f2937]">{success}</p>
                  <Link
                    to="/auth/login"
                    className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#e30613] py-3 text-sm font-black uppercase tracking-[0.14em] text-white hover:bg-[#c4000b]"
                  >
                    Quay lại đăng nhập
                  </Link>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="mt-8 space-y-4">
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="email"
                      placeholder="Nhập địa chỉ email *"
                      required
                      value={email}
                      onChange={event => setEmail(event.target.value)}
                      className="customer-input !pl-14"
                      autoComplete="email"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading || !email}
                    className="w-full rounded-full bg-[#e30613] py-3.5 text-sm font-black uppercase tracking-[0.14em] text-white transition hover:bg-[#c4000b] disabled:opacity-60"
                  >
                    {loading ? 'Đang gửi...' : 'Gửi yêu cầu'}
                  </button>
                </form>
              )}

              {!success && (
                <div className="mt-8 border-t border-[#e5e7eb] pt-6 text-center">
                  <Link to="/auth/login" className="inline-flex items-center gap-2 font-black text-[#1f2937] hover:text-[#c4000b]">
                    <ArrowLeft size={15} /> Quay lại trang đăng nhập
                  </Link>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
};

export default ForgotPasswordPage;
