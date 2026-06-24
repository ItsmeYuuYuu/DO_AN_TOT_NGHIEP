import React, { useState } from 'react';
import { Button } from '@/components/Button';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, Eye, EyeOff, ShieldCheck, ShoppingBag, Sparkles } from 'lucide-react';
import apiClient from '@/api/apiClient';
import { saveSession } from '@/features/auth/utils/authUtils';
import { useAuth } from '@/features/auth/context/AuthContext';
import Logo from '@/assets/Logo.png';

const validateLoginId = (value: string): string | null => {
  if (!value.trim()) return 'Tên đăng nhập hoặc email không được để trống.';
  return null;
};

const validatePassword = (password: string): string | null => {
  if (!password) return 'Mật khẩu không được để trống.';
  return null;
};

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { refreshAuth } = useAuth();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError('');

    const emailValidation = validateLoginId(email);
    const passwordValidation = validatePassword(password);
    setEmailError(emailValidation ?? '');
    setPasswordError(passwordValidation ?? '');
    if (emailValidation || passwordValidation) return;

    setLoading(true);
    try {
      const response = await apiClient.post('/Auth/login', {
        username: email.trim(),
        password,
      });

      const user = response.data;
      saveSession(
        user.accessToken,
        user.expiresIn,
        {
          userid: String(user.userid),
          username: user.username,
          fullname: user.fullname,
          email: user.email ?? user.username,
          phone: user.phone,
          rolename: user.rolename,
        },
      );

      refreshAuth();

      if (user.rolename === 'Admin') navigate('/admin');
      else if (['Manager', 'Sales', 'Warehouse', 'Warranty', 'Content', 'Consultant'].includes(user.rolename)) navigate('/staff');
      else navigate('/');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setFormError(axiosErr.response?.data?.message ?? 'Đăng nhập thất bại. Vui lòng kiểm tra lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="customer-shell min-h-screen px-4 py-8">
      <div className="customer-container flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <div className="grid w-full max-w-6xl overflow-hidden rounded-[30px] border border-[#e5e7eb] bg-white shadow-[0_24px_70px_rgba(15,23,42,0.14)] lg:grid-cols-[0.95fr_1.05fr]">
          <section className="relative hidden min-h-[620px] overflow-hidden bg-[#1f2937] p-10 text-white lg:flex lg:flex-col lg:justify-between">
            <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full border border-white/10 bg-white/5" />
            <div className="absolute -bottom-20 -left-20 h-60 w-60 rounded-full border border-white/10 bg-[#e30613]/20" />
            <div className="relative z-10">
              <Link to="/" className="inline-flex rounded-2xl bg-white px-5 py-3 shadow-[0_14px_30px_rgba(227,6,19,0.18)]">
                <img src={Logo} alt="Cuồng Điện Thoại" className="h-16 w-auto object-contain" />
              </Link>
              <p className="mt-16 text-xs font-black uppercase tracking-[0.28em] text-[#ffd166]">Member login</p>
              <h1 className="customer-display mt-3 max-w-md text-5xl font-black leading-[0.95]">
                Đăng nhập để giữ trọn ưu đãi.
              </h1>
              <p className="mt-6 max-w-sm text-sm font-medium leading-7 text-white/70">
                Xem lịch sử đơn hàng, nhận gợi ý từ chatbot và lưu lại cấu hình điện thoại bạn đang quan tâm.
              </p>
            </div>

            <div className="relative z-10 grid gap-3">
              <div className="rounded-[22px] border border-white/15 bg-white/10 p-4 backdrop-blur">
                <div className="mb-2 flex items-center gap-2">
                  <ShieldCheck size={18} className="text-[#ffd166]" />
                  <p className="text-xs font-black uppercase tracking-[0.18em]">Bảo mật tài khoản</p>
                </div>
                <p className="text-xs leading-6 text-white/70">
                  Mật khẩu được mã hóa bằng BCrypt. Hệ thống không lưu mật khẩu gốc của khách hàng.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs font-black uppercase tracking-[0.12em]">
                <div className="rounded-2xl border border-white/15 bg-white/10 p-3"><ShoppingBag size={16} /> Lưu đơn hàng</div>
                <div className="rounded-2xl border border-white/15 bg-white/10 p-3"><Sparkles size={16} /> Gợi ý cá nhân</div>
              </div>
            </div>
          </section>

          <section className="p-6 md:p-10 lg:p-14">
            <div className="mx-auto max-w-md">
              <Link to="/" className="mb-8 inline-flex lg:hidden">
                <img src={Logo} alt="Cuồng Điện Thoại" className="h-14 w-auto object-contain" />
              </Link>

              <p className="customer-label">Tài khoản thành viên</p>
              <h2 className="customer-display mt-2 text-4xl font-black text-[#1f2937]">Đăng nhập</h2>
              <p className="mt-2 text-sm font-medium text-slate-500">
                Nhập thông tin tài khoản để tiếp tục mua sắm.
              </p>

              {formError && (
                <div className="mt-6 flex items-center gap-2.5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                  <AlertCircle size={16} className="shrink-0" />
                  {formError}
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
                <div>
                  <label className="mb-1.5 block text-xs font-black uppercase tracking-[0.14em] text-[#1f2937]">
                    Tên đăng nhập hoặc email <span className="text-[#c4000b]">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ví dụ: nguyenvana hoặc email@gmail.com"
                    value={email}
                    onChange={event => { setEmail(event.target.value); setEmailError(''); }}
                    onBlur={() => setEmailError(validateLoginId(email) ?? '')}
                    className={`customer-input ${emailError ? 'border-red-400 focus:border-red-500' : ''}`}
                    autoComplete="username"
                  />
                  {emailError && (
                    <p className="mt-1.5 flex items-center gap-1 text-xs font-bold text-red-600">
                      <AlertCircle size={13} /> {emailError}
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-black uppercase tracking-[0.14em] text-[#1f2937]">
                    Mật khẩu <span className="text-[#c4000b]">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Nhập mật khẩu"
                      value={password}
                      onChange={event => { setPassword(event.target.value); setPasswordError(''); }}
                      onBlur={() => setPasswordError(validatePassword(password) ?? '')}
                      className={`customer-input pr-12 ${passwordError ? 'border-red-400 focus:border-red-500' : ''}`}
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(current => !current)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-[#1f2937]"
                      tabIndex={-1}
                      aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {passwordError && (
                    <p className="mt-1.5 flex items-center gap-1 text-xs font-bold text-red-600">
                      <AlertCircle size={13} /> {passwordError}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-400">Bảo vệ bằng phiên đăng nhập JWT.</span>
                  <Link to="/forgot-password" className="font-black text-[#c4000b] hover:underline">
                    Quên mật khẩu?
                  </Link>
                </div>

                <Button
                  type="submit"
                  fullWidth
                  size="lg"
                  isLoading={loading}
                  className="rounded-full bg-[#e30613] text-sm font-black uppercase tracking-[0.14em] hover:bg-[#c4000b]"
                >
                  Đăng nhập ngay
                </Button>
              </form>

              <div className="mt-8 border-t border-[#e5e7eb] pt-6 text-center">
                <p className="text-sm font-medium text-slate-500">
                  Bạn chưa có tài khoản?{' '}
                  <Link to="/auth/register" className="font-black text-[#c4000b] hover:underline">
                    Đăng ký miễn phí
                  </Link>
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
};

export default LoginPage;
