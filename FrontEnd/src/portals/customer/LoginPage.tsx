import React, { useState } from 'react';
import { Button } from '@/components/Button';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';
import apiClient from '@/api/apiClient';
import { saveSession } from '@/features/auth/utils/authUtils';
import { useAuth } from '@/features/auth/context/AuthContext';
import Logo from '@/assets/Logo.png';
import { Seo } from '@/components/Seo';

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
      <Seo
        title="Đăng nhập - Cuồng Điện Thoại"
        description="Đăng nhập tài khoản thành viên Cuồng Điện Thoại."
        noIndex
      />
      <div className="customer-container flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <div className="grid w-full max-w-6xl overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white shadow-[0_24px_70px_rgba(15,23,42,0.14)] lg:grid-cols-[0.95fr_1.05fr]">
          <section className="hidden min-h-[560px] bg-[#fff1f2] p-10 text-[#1f2937] lg:flex lg:flex-col">
            <div>
              <Link to="/" className="inline-flex rounded-xl bg-white px-5 py-3 shadow-[0_12px_28px_rgba(92,0,7,0.18)]">
                <img src={Logo} alt="Cuồng Điện Thoại" className="h-16 w-auto object-contain" />
              </Link>
              <p className="mt-16 text-sm font-semibold uppercase tracking-[0.12em] text-[#c4000b]">Cuồng Điện Thoại</p>
              <h1 className="mt-3 max-w-md font-sans text-4xl font-bold leading-tight tracking-[-0.02em] text-[#b0000a]">
                Đăng nhập tài khoản.
              </h1>
              <p className="mt-6 max-w-sm font-sans text-base font-normal leading-7 text-[#4b5563]">
                Theo dõi đơn hàng, bảo hành và lưu lại các sản phẩm bạn đang quan tâm.
              </p>
            </div>
          </section>

          <section className="p-6 md:p-10 lg:p-14">
            <div className="mx-auto max-w-md">
              <Link to="/" className="mb-8 inline-flex lg:hidden">
                <img src={Logo} alt="Cuồng Điện Thoại" className="h-14 w-auto object-contain" />
              </Link>

              <h2 className="customer-display mt-2 text-4xl font-black text-[#1f2937]">Đăng nhập</h2>
              <p className="mt-2 text-sm font-medium text-slate-500">
                Nhập tài khoản để tiếp tục mua sắm.
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

                <div className="flex items-center justify-end text-sm">
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
