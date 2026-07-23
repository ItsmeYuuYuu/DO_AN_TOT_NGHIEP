import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '@/features/auth/api/authApi';
import { AlertCircle, ArrowLeft, CheckCircle2, KeyRound, Mail, ShieldCheck } from 'lucide-react';
import Logo from '@/assets/Logo.png';
import { Seo } from '@/components/Seo';

type RecoveryStep = 'request' | 'reset' | 'done';

const passwordPattern = /^(?=.{8,}$)(?!.*\s)(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).*$/;

const getApiMessage = (error: unknown, fallback: string) =>
  (error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;

const ForgotPasswordPage: React.FC = () => {
  const [step, setStep] = useState<RecoveryStep>('request');
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const requestCode = async () => {
    const response = await authApi.forgotPassword(email.trim());
    setMessage(response.data.message || 'Yêu cầu khôi phục mật khẩu đã được xử lý.');
    setStep('reset');
  };

  const handleRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      await requestCode();
    } catch (requestError: unknown) {
      setError(getApiMessage(requestError, 'Không thể gửi yêu cầu khôi phục. Vui lòng thử lại sau.'));
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!/^\d{6}$/.test(verificationCode)) {
      setError('Mã khôi phục phải gồm đúng 6 chữ số.');
      return;
    }
    if (!passwordPattern.test(newPassword)) {
      setError('Mật khẩu mới phải có ít nhất 8 ký tự, gồm chữ hoa, chữ thường, chữ số và ký tự đặc biệt.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }

    setLoading(true);
    try {
      const response = await authApi.resetPassword({
        email: email.trim(),
        verificationCode,
        newPassword,
        confirmPassword,
      });
      setMessage(response.data.message || 'Đặt lại mật khẩu thành công.');
      setStep('done');
    } catch (resetError: unknown) {
      setError(getApiMessage(resetError, 'Không thể đặt lại mật khẩu. Vui lòng thử lại.'));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      await requestCode();
    } catch (requestError: unknown) {
      setError(getApiMessage(requestError, 'Không thể gửi lại mã khôi phục. Vui lòng thử lại sau.'));
    } finally {
      setLoading(false);
    }
  };

  const changeEmail = () => {
    setStep('request');
    setVerificationCode('');
    setNewPassword('');
    setConfirmPassword('');
    setError(null);
    setMessage(null);
  };

  return (
    <main className="customer-shell min-h-screen px-4 py-8">
      <Seo title="Quên mật khẩu - Cuồng Điện Thoại" description="Khôi phục tài khoản Cuồng Điện Thoại." noIndex />
      <div className="customer-container flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <div className="grid w-full max-w-5xl overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white shadow-[0_24px_70px_rgba(15,23,42,0.14)] lg:grid-cols-[0.9fr_1.1fr]">
          <section className="relative hidden overflow-hidden bg-[#1f2937] p-10 text-white lg:flex lg:flex-col lg:justify-between">
            <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/5" />
            <div>
              <Link to="/" className="inline-flex rounded-2xl bg-white px-5 py-3 shadow-[0_14px_30px_rgba(227,6,19,0.18)]">
                <img src={Logo} alt="Cuồng Điện Thoại" className="h-16 w-auto object-contain" />
              </Link>
              <p className="mt-16 text-xs font-black uppercase tracking-[0.28em] text-[#ffd166]">Account recovery</p>
              <h1 className="customer-display mt-3 max-w-md text-5xl font-black leading-[0.95]">Lấy lại quyền truy cập tài khoản.</h1>
              <p className="mt-6 max-w-sm text-sm font-medium leading-7 text-white/70">
                Mã khôi phục gồm 6 chữ số, có hiệu lực trong 10 phút và chỉ được sử dụng một lần.
              </p>
            </div>
            <div className="rounded-xl border border-white/15 bg-white/10 p-4 backdrop-blur">
              <div className="mb-2 flex items-center gap-2">
                <ShieldCheck size={18} className="text-[#ffd166]" />
                <p className="text-xs font-black uppercase tracking-[0.18em]">Bảo vệ tài khoản</p>
              </div>
              <p className="text-xs leading-6 text-white/70">
                Hệ thống không tiết lộ email có tồn tại hay không và sẽ khóa mã sau nhiều lần nhập sai.
              </p>
            </div>
          </section>

          <section className="p-6 md:p-10 lg:p-14">
            <div className="mx-auto max-w-md">
              <Link to="/" className="mb-8 inline-flex lg:hidden">
                <img src={Logo} alt="Cuồng Điện Thoại" className="h-14 w-auto object-contain" />
              </Link>

              <p className="customer-label">Khôi phục tài khoản</p>
              <h2 className="customer-display mt-2 text-4xl font-black text-[#1f2937]">
                {step === 'request' ? 'Quên mật khẩu?' : step === 'reset' ? 'Đặt mật khẩu mới' : 'Khôi phục thành công'}
              </h2>
              <p className="mt-2 text-sm font-medium text-slate-500">
                {step === 'request'
                  ? 'Nhập email đăng ký để nhận mã khôi phục.'
                  : step === 'reset'
                    ? `Nhập mã đã gửi cho ${email.trim()} và thiết lập mật khẩu mới.`
                    : 'Mật khẩu của bạn đã được cập nhật an toàn.'}
              </p>

              {error && (
                <div className="mt-6 flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                  <AlertCircle size={16} className="shrink-0" /> {error}
                </div>
              )}
              {message && step !== 'done' && (
                <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold leading-6 text-emerald-700">
                  {message}
                </div>
              )}

              {step === 'request' && (
                <form onSubmit={handleRequest} className="mt-8 space-y-4">
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
                  <button type="submit" disabled={loading || !email.trim()} className="w-full rounded-full bg-[#e30613] py-3.5 text-sm font-black uppercase tracking-[0.14em] text-white transition hover:bg-[#c4000b] disabled:opacity-60">
                    {loading ? 'Đang gửi...' : 'Gửi mã khôi phục'}
                  </button>
                </form>
              )}

              {step === 'reset' && (
                <form onSubmit={handleReset} className="mt-8 space-y-4">
                  <div className="relative">
                    <KeyRound className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      placeholder="Mã khôi phục 6 chữ số *"
                      required
                      value={verificationCode}
                      onChange={event => setVerificationCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="customer-input !pl-14"
                    />
                  </div>
                  <input
                    type="password"
                    autoComplete="new-password"
                    placeholder="Mật khẩu mới *"
                    required
                    value={newPassword}
                    onChange={event => setNewPassword(event.target.value)}
                    className="customer-input"
                  />
                  <input
                    type="password"
                    autoComplete="new-password"
                    placeholder="Xác nhận mật khẩu mới *"
                    required
                    value={confirmPassword}
                    onChange={event => setConfirmPassword(event.target.value)}
                    className="customer-input"
                  />
                  <p className="text-xs font-medium leading-5 text-slate-500">
                    Mật khẩu tối thiểu 8 ký tự, có chữ hoa, chữ thường, chữ số và ký tự đặc biệt.
                  </p>
                  <button type="submit" disabled={loading} className="w-full rounded-full bg-[#e30613] py-3.5 text-sm font-black uppercase tracking-[0.14em] text-white transition hover:bg-[#c4000b] disabled:opacity-60">
                    {loading ? 'Đang cập nhật...' : 'Đặt lại mật khẩu'}
                  </button>
                  <div className="flex flex-wrap items-center justify-between gap-3 text-sm font-bold">
                    <button type="button" onClick={changeEmail} disabled={loading} className="text-slate-600 hover:text-[#c4000b]">Đổi email</button>
                    <button type="button" onClick={handleResend} disabled={loading} className="text-[#c4000b] hover:underline">Gửi lại mã</button>
                  </div>
                </form>
              )}

              {step === 'done' && (
                <div className="mt-8 rounded-2xl border border-emerald-100 bg-emerald-50 p-8 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                    <CheckCircle2 size={34} />
                  </div>
                  <p className="font-bold leading-relaxed text-[#1f2937]">{message}</p>
                  <Link to="/auth/login" className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#e30613] py-3 text-sm font-black uppercase tracking-[0.14em] text-white hover:bg-[#c4000b]">
                    Đăng nhập ngay
                  </Link>
                </div>
              )}

              {step === 'request' && (
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
