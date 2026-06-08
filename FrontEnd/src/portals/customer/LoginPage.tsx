import React, { useState } from 'react';
import { Button } from '@/components/Button';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, AlertCircle, Eye, EyeOff } from 'lucide-react';
import apiClient from '@/api/apiClient';
import { saveSession } from '@/features/auth/utils/authUtils';
import { useAuth } from '@/features/auth/context/AuthContext';
import Logo from '@/assets/Logo.png';

// ─── Validation helpers ────────────────────────────────────────────────────────
const validateEmail = (email: string): string | null => {
  if (!email.trim()) return 'Tên đăng nhập hoặc email không được để trống.';
  return null;
};

const validatePassword = (password: string): string | null => {
  if (!password) return 'Mật khẩu không được để trống.';
  return null;
};

// ─── Component ─────────────────────────────────────────────────────────────────
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    // Client-side validation
    const eErr = validateEmail(email);
    const pErr = validatePassword(password);
    setEmailError(eErr ?? '');
    setPasswordError(pErr ?? '');
    if (eErr || pErr) return;

    setLoading(true);
    try {
      const response = await apiClient.post('/Auth/login', {
        username: email.trim(),
        password: password,
      });

      const user = response.data;

      // Lưu JWT vào session store (tự động handle expiry)
      saveSession(
        user.accessToken,
        user.expiresIn,
        {
          userid:   String(user.userid),
          username: user.username,
          fullname: user.fullname,
          email:    user.email ?? user.username,
          rolename: user.rolename,
        }
      );

      // Cập nhật AuthContext state ngay lập tức
      refreshAuth();

      // Điều hướng theo Role
      if (user.rolename === 'Admin') navigate('/admin');
      else if (['Staff', 'Manager', 'Sales', 'Warehouse', 'Warranty', 'Content', 'Consultant'].includes(user.rolename)) navigate('/staff');
      else navigate('/');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setFormError(axiosErr.response?.data?.message ?? 'Đăng nhập thất bại. Vui lòng kiểm tra lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-[960px] bg-white rounded-2xl shadow-xl overflow-hidden flex">

        {/* ── Left Brand Panel ── */}
        <div className="hidden lg:flex lg:w-[45%] bg-blue-600 p-12 flex-col justify-between relative overflow-hidden">
          <div className="relative z-10">
            <Link to="/" className="inline-block group">
              <img src={Logo} alt="ECOMMERCE" className="h-20 w-auto object-contain group-hover:scale-105 transition-transform" />
            </Link>
            <h2 className="mt-20 text-4xl font-black text-white leading-tight">
              ĐĂNG NHẬP ĐỂ <br /> NHẬN ƯU ĐÃI <br /> ĐỘC QUYỀN.
            </h2>
            <p className="mt-6 text-blue-100 text-sm max-w-xs leading-relaxed">
              Trải nghiệm mua sắm công nghệ tuyệt vời hơn với tài khoản thành viên.
            </p>
          </div>

          {/* Security note */}
          <div className="relative z-10 bg-white/10 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck size={16} className="text-white" />
              <p className="text-white text-xs font-bold tracking-wide">BẢO MẬT TUYỆT ĐỐI</p>
            </div>
            <p className="text-blue-100 text-xs leading-relaxed">
              Tài khoản được bảo vệ bằng mã hóa BCrypt. Chúng tôi không bao giờ lưu mật khẩu gốc.
            </p>
          </div>

          {/* Decorative circles */}
          <div className="absolute -top-16 -right-16 w-72 h-72 bg-white/10 rounded-full" />
          <div className="absolute bottom-24 -left-16 w-48 h-48 bg-white/10 rounded-full" />
        </div>

        {/* ── Right Form Panel ── */}
        <div className="flex-1 p-8 md:p-14">
          <div className="max-w-sm mx-auto">
            {/* Heading */}
            <div className="mb-8 text-center lg:text-left">
              <h1 className="text-3xl font-black text-slate-900 mb-1.5">ĐĂNG NHẬP</h1>
              <p className="text-sm text-slate-500">Vui lòng nhập thông tin tài khoản của bạn</p>
            </div>

            {/* Global error */}
            {formError && (
              <div className="flex items-center gap-2.5 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 text-sm font-medium">
                <AlertCircle size={16} className="shrink-0" />
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              {/* Email field */}
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-1.5">
                  Tên đăng nhập hoặc email <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Tên đăng nhập hoặc example@gmail.com"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setEmailError(''); }}
                  onBlur={() => setEmailError(validateEmail(email) ?? '')}
                  className={`w-full bg-white border rounded-xl px-4 py-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400
                    ${emailError
                      ? 'border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-50'
                      : 'border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-50'
                    }`}
                  autoComplete="username"
                />
                {emailError && (
                  <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                    <span>⚠</span> {emailError}
                  </p>
                )}
              </div>

              {/* Password field */}
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-1.5">
                  Mật khẩu <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Nhập mật khẩu"
                    value={password}
                    onChange={e => { setPassword(e.target.value); setPasswordError(''); }}
                    onBlur={() => setPasswordError(validatePassword(password) ?? '')}
                    className={`w-full bg-white border rounded-xl px-4 py-3 pr-12 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400
                      ${passwordError
                        ? 'border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-50'
                        : 'border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-50'
                      }`}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {passwordError && (
                  <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                    <span>⚠</span> {passwordError}
                  </p>
                )}

                <div className="text-right mt-2">
                  <Link to="/forgot-password" className="text-xs font-semibold text-blue-600 hover:underline">
                    Quên mật khẩu?
                  </Link>
                </div>
              </div>

              <Button type="submit" fullWidth size="lg" isLoading={loading}>
                ĐĂNG NHẬP NGAY
              </Button>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-100 text-center">
              <p className="text-sm text-slate-500">
                Bạn chưa có tài khoản?{' '}
                <Link to="/auth/register" className="font-bold text-blue-600 hover:underline">
                  Đăng ký miễn phí
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
