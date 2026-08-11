import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '@/features/auth/api/authApi';
import { AlertCircle, ArrowLeft, CheckCircle2, KeyRound, Mail, ShieldCheck } from 'lucide-react';
import Logo from '@/assets/Logo.webp';
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
    <main className="customer-shell px-4 py-6">
      <Seo title="Quên mật khẩu - Cuồng Điện Thoại" description="Khôi phục tài khoản Cuồng Điện Thoại." noIndex />
      <div className="customer-container flex justify-center">
        <div className="auth-motion-card auth-recovery-card is-login">
          <aside className="auth-overlay">
            <div className="auth-overlay-copy auth-overlay-copy--login">
              <div className="auth-overlay-content">
                <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#c4000b]">Cuồng Điện Thoại</p>
                <h1 className="mt-3 max-w-md text-4xl font-bold leading-tight tracking-[-0.03em] text-[#b0000a]">
                  Khôi phục quyền truy cập tài khoản
                </h1>
                <p className="mt-5 max-w-sm leading-7 text-[#4b5563]">
                  Nhận mã xác nhận qua email và thiết lập mật khẩu mới theo quy trình bảo mật của hệ thống.
                </p>
                <div className="mt-6 rounded-xl border border-[#f3c8cb] bg-white/70 p-4">
                  <div className="mb-2 flex items-center gap-2 text-[#c4000b]">
                    <ShieldCheck size={18} />
                    <p className="text-xs font-bold uppercase tracking-[0.12em]">Bảo vệ tài khoản</p>
                  </div>
                  <p className="text-xs leading-6 text-[#596273]">
                    Mã khôi phục gồm 6 chữ số, có hiệu lực trong 10 phút và chỉ được sử dụng một lần.
                  </p>
                </div>
                <Link to="/auth/login" className="auth-overlay-button">Quay lại đăng nhập</Link>
              </div>
            </div>
          </aside>

          <section className="auth-form-panel auth-form-panel--login auth-recovery-form">
            <div key={step} className="auth-recovery-step w-full max-w-md">
              <Link to="/" className="mb-8 inline-flex lg:hidden">
                <img src={Logo} alt="Cuồng Điện Thoại" width={400} height={188} className="h-14 w-auto object-contain" />
              </Link>

              <p className="customer-label">Khôi phục tài khoản</p>
              <h2 className="mt-2 text-4xl font-bold tracking-[-0.03em] text-[#1f2937]">
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
                <div className="auth-alert auth-alert--error">
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
                  <button type="submit" disabled={loading || !email.trim()} className="auth-submit">
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
                  <button type="submit" disabled={loading} className="auth-submit">
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
                  <Link to="/auth/login" className="auth-submit mt-6 gap-2">
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
