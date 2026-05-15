import React, { useState } from 'react';
import { Button } from '@/components/Button';
import { useNavigate, Link } from 'react-router-dom';
import apiClient from '@/api/apiClient';
import { saveSession } from '@/features/auth/utils/authUtils';

// ─── Validation helpers ────────────────────────────────────────────────────────
const validateEmail = (email: string): string | null => {
  if (!email) return 'Email không được để trống.';
  if (!email.endsWith('@gmail.com')) return 'Email phải có định dạng @gmail.com.';
  if (!/^[^\s@]+@gmail\.com$/.test(email)) return 'Email không hợp lệ.';
  return null;
};

const validatePassword = (password: string): string | null => {
  if (!password) return 'Mật khẩu không được để trống.';
  if (password.length < 8) return 'Mật khẩu phải có ít nhất 8 ký tự.';
  if (!/[A-Z]/.test(password)) return 'Mật khẩu phải chứa ít nhất một chữ hoa.';
  if (!/[a-z]/.test(password)) return 'Mật khẩu phải chứa ít nhất một chữ thường.';
  if (!/[0-9]/.test(password)) return 'Mật khẩu phải chứa ít nhất một chữ số.';
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password))
    return 'Mật khẩu phải chứa ít nhất một ký tự đặc biệt (!@#$%...).';
  return null;
};

// ─── Password strength indicator ──────────────────────────────────────────────
const getStrength = (password: string): { score: number; label: string; color: string } => {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score++;

  if (score <= 2) return { score, label: 'Yếu', color: 'bg-red-500' };
  if (score === 3) return { score, label: 'Trung bình', color: 'bg-amber-500' };
  if (score === 4) return { score, label: 'Mạnh', color: 'bg-blue-500' };
  return { score, label: 'Rất mạnh', color: 'bg-emerald-500' };
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

  const strength = password ? getStrength(password) : null;

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
        username: email,
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

      // Điều hướng theo Role
      if (user.rolename === 'Admin') navigate('/admin');
      else if (user.rolename === 'Staff') navigate('/staff');
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
            <Link to="/" className="text-2xl font-black text-white flex items-center gap-2">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
              ECOMMERCE
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
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
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
                <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              {/* Email field */}
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-1.5">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  placeholder="example@gmail.com"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setEmailError(''); }}
                  onBlur={() => setEmailError(validateEmail(email) ?? '')}
                  className={`w-full bg-white border rounded-xl px-4 py-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400
                    ${emailError
                      ? 'border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-50'
                      : 'border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-50'
                    }`}
                  autoComplete="email"
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
                    placeholder="Tối thiểu 8 ký tự, có số và ký tự đặc biệt"
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
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>

                {/* Password strength bar */}
                {password && strength && (
                  <div className="mt-2 space-y-1">
                    <div className="flex gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                            i < strength.score ? strength.color : 'bg-slate-200'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-slate-500">
                      Độ mạnh: <span className="font-semibold">{strength.label}</span>
                    </p>
                  </div>
                )}

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

              {/* Requirements hint */}
              <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-500 space-y-1">
                <p className="font-semibold text-slate-700 mb-1.5">Yêu cầu mật khẩu:</p>
                {[
                  { rule: password.length >= 8, text: 'Ít nhất 8 ký tự' },
                  { rule: /[A-Z]/.test(password), text: 'Có chữ hoa (A-Z)' },
                  { rule: /[0-9]/.test(password), text: 'Có chữ số (0-9)' },
                  { rule: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password), text: 'Có ký tự đặc biệt (!@#$...)' },
                ].map(({ rule, text }) => (
                  <div key={text} className="flex items-center gap-1.5">
                    <span className={rule ? 'text-emerald-500' : 'text-slate-300'}>
                      {rule ? '✓' : '○'}
                    </span>
                    <span className={rule ? 'text-emerald-700' : ''}>{text}</span>
                  </div>
                ))}
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
