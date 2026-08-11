import { useEffect, useState, type FormEvent } from 'react';
import { AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Seo } from '@/components/Seo';
import Logo from '@/assets/Logo.webp';
import { authApi } from '@/features/auth/api/authApi';
import { useAuth } from '@/features/auth/context/AuthContext';
import { saveSession } from '@/features/auth/utils/authUtils';

type AuthMode = 'login' | 'register';

const isStrongPassword = (password: string) =>
  password.length >= 8 &&
  !/\s/.test(password) &&
  /[a-z]/.test(password) &&
  /[A-Z]/.test(password) &&
  /\d/.test(password) &&
  /[^A-Za-z0-9]/.test(password);

const digitsOnly = (value: string, maxLength: number) =>
  value.replace(/\D/g, '').slice(0, maxLength);

const validLoginIdentifier = (value: string) => /^[A-Za-z0-9._@+-]{1,100}$/.test(value);
const validUsername = (value: string) => /^[A-Za-z0-9._-]{3,50}$/.test(value);
const containsUnsafeMarkup = (value: string) => /[<>]|javascript:|data:text\/html/i.test(value);

const getResponseMessage = (error: unknown, fallback: string) => {
  const data = (error as {
    response?: { data?: { message?: string; errors?: Record<string, string[]> } };
  })?.response?.data;
  const validationMessage = data?.errors
    ? Object.values(data.errors).flat().find(Boolean)
    : undefined;
  return validationMessage || data?.message || fallback;
};

interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  action?: React.ReactNode;
}

const AuthField = ({ label, error, action, className = '', ...props }: FieldProps) => (
  <label className="block">
    <span className="mb-1.5 block text-xs font-bold text-[#374151]">
      {label} {props.required && <span className="text-[#c4000b]">*</span>}
    </span>
    <span className="flex gap-2">
      <input
        {...props}
        className={`customer-input min-w-0 ${error ? 'border-red-400 focus:border-red-500' : ''} ${className}`}
      />
      {action}
    </span>
    {error && (
      <span className="mt-1.5 flex items-center gap-1 text-xs font-semibold text-red-600">
        <AlertCircle size={13} /> {error}
      </span>
    )}
  </label>
);

export default function AuthPage() {
  const { mode: routeMode } = useParams();
  const mode = routeMode as AuthMode;
  const isRegister = mode === 'register';
  const navigate = useNavigate();
  const location = useLocation();
  const { refreshAuth } = useAuth();

  const [loginId, setLoginId] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  const [registerData, setRegisterData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    fullname: '',
    email: '',
    phone: '',
    verificationCode: '',
  });
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [registerSuccess, setRegisterSuccess] = useState<string | null>(null);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [codeMessage, setCodeMessage] = useState<string | null>(null);

  useEffect(() => {
    const state = location.state as { username?: string } | null;
    if (mode === 'login' && state?.username) {
      setLoginId(state.username);
    }

    if (mode === 'login') {
      const authNotice = sessionStorage.getItem('ec_auth_notice');
      if (authNotice) {
        setLoginError(authNotice);
        sessionStorage.removeItem('ec_auth_notice');
      }
    }
  }, [location.state, mode]);

  if (mode !== 'login' && mode !== 'register') {
    return <Navigate to="/auth/login" replace />;
  }

  const switchMode = (nextMode: AuthMode) => {
    setLoginError(null);
    setRegisterError(null);
    navigate(`/auth/${nextMode}`);
  };

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault();
    setLoginError(null);

    if (!loginId.trim() || !loginPassword) {
      setLoginError('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.');
      return;
    }
    if (!validLoginIdentifier(loginId.trim())) {
      setLoginError('Tên đăng nhập hoặc email chứa ký tự không hợp lệ.');
      return;
    }

    setLoginLoading(true);
    try {
      const response = await authApi.login(loginId.trim(), loginPassword);
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
          roleids: user.roleids ?? (user.roleid ? [user.roleid] : []),
          rolenames: user.rolenames ?? [user.rolename],
          permissions: user.permissions ?? [],
        },
      );
      refreshAuth();

      const roleNames: string[] = user.rolenames ?? [user.rolename];
      if (roleNames.includes('Admin')) navigate('/admin');
      else if (roleNames.some(role => ['Manager', 'Sales', 'Warehouse', 'Warranty', 'Content', 'Consultant'].includes(role))) {
        navigate('/staff');
      } else {
        navigate('/');
      }
    } catch (error) {
      setLoginError(getResponseMessage(error, 'Đăng nhập thất bại. Vui lòng kiểm tra lại.'));
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegisterChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    const nextValue =
      name === 'phone' ? digitsOnly(value, 10) :
      name === 'verificationCode' ? digitsOnly(value, 6) :
      value;
    setRegisterData(current => ({ ...current, [name]: nextValue }));
    setRegisterError(null);
  };

  const requestCode = async () => {
    const email = registerData.email.trim();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setRegisterError('Vui lòng nhập địa chỉ email hợp lệ trước khi gửi mã xác nhận.');
      return;
    }

    setSendingCode(true);
    setRegisterError(null);
    setCodeMessage(null);
    try {
      const response = await authApi.requestRegistrationCode(email);
      setCodeMessage(response.data.message || 'Đã gửi mã xác nhận đến email của bạn.');
    } catch (error) {
      setRegisterError(getResponseMessage(error, 'Không thể gửi mã xác nhận lúc này.'));
    } finally {
      setSendingCode(false);
    }
  };

  const handleRegister = async (event: FormEvent) => {
    event.preventDefault();
    setRegisterError(null);

    if (!/^\S+@\S+\.\S+$/.test(registerData.email.trim())) {
      setRegisterError('Vui lòng nhập địa chỉ email hợp lệ.');
      return;
    }
    if (!/^\d{6}$/.test(registerData.verificationCode.trim())) {
      setRegisterError('Mã xác nhận email phải gồm đúng 6 chữ số.');
      return;
    }
    if (!isStrongPassword(registerData.password)) {
      setRegisterError('Mật khẩu phải có ít nhất 8 ký tự, gồm chữ hoa, chữ thường, chữ số và ký tự đặc biệt.');
      return;
    }
    if (!validUsername(registerData.username.trim())) {
      setRegisterError('Tên đăng nhập chỉ được gồm chữ, số, dấu chấm, gạch dưới và gạch ngang.');
      return;
    }
    if (containsUnsafeMarkup(registerData.fullname)) {
      setRegisterError('Họ tên chứa nội dung không hợp lệ.');
      return;
    }
    if (registerData.password !== registerData.confirmPassword) {
      setRegisterError('Mật khẩu nhập lại không khớp.');
      return;
    }
    if (!/^0\d{9}$/.test(registerData.phone.trim())) {
      setRegisterError('Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0.');
      return;
    }

    setRegisterLoading(true);
    try {
      const response = await authApi.register({
        username: registerData.username.trim(),
        password: registerData.password,
        fullname: registerData.fullname.trim(),
        email: registerData.email.trim(),
        phone: registerData.phone.trim(),
        verificationCode: registerData.verificationCode.trim() || undefined,
      });
      setRegisterSuccess(response.data.message || 'Đăng ký thành công!');
      window.setTimeout(() => {
        navigate('/auth/login', { state: { username: registerData.username } });
        setRegisterSuccess(null);
      }, 1600);
    } catch (error) {
      setRegisterError(getResponseMessage(error, 'Đã xảy ra lỗi. Vui lòng thử lại sau.'));
    } finally {
      setRegisterLoading(false);
    }
  };

  return (
    <main className="customer-shell px-4 py-6">
      <Seo
        title={`${isRegister ? 'Đăng ký tài khoản' : 'Đăng nhập'} - Cuồng Điện Thoại`}
        description={isRegister
          ? 'Tạo tài khoản mua hàng tại Cuồng Điện Thoại.'
          : 'Đăng nhập tài khoản thành viên Cuồng Điện Thoại.'}
        noIndex
      />

      <div className="customer-container flex justify-center">
        <div className={`auth-motion-card ${isRegister ? 'is-register' : 'is-login'}`}>
          <section
            className="auth-form-panel auth-form-panel--register"
            aria-hidden={!isRegister}
            inert={!isRegister}
          >
            <div className="w-full max-w-lg">
              <Link to="/" className="mb-7 inline-flex lg:hidden">
                <img src={Logo} alt="Cuồng Điện Thoại" width={400} height={188} className="h-14 w-auto object-contain" />
              </Link>
              <h1 className="text-4xl font-bold tracking-[-0.03em] text-[#1f2937]">Đăng ký</h1>
              <p className="mt-2 text-sm font-medium text-slate-500">
                Điền thông tin và xác nhận email để tạo tài khoản.
              </p>

              {registerError && (
                <div className="auth-alert auth-alert--error">
                  <AlertCircle size={16} /> {registerError}
                </div>
              )}

              {registerSuccess ? (
                <div className="mt-8 border border-emerald-200 bg-emerald-50 p-8 text-center">
                  <CheckCircle2 size={36} className="mx-auto text-emerald-600" />
                  <p className="mt-4 font-bold text-emerald-700">{registerSuccess}</p>
                  <p className="mt-2 text-sm text-slate-500">Đang chuyển sang đăng nhập...</p>
                </div>
              ) : (
                <form onSubmit={handleRegister} className="mt-6 space-y-4">
                  <div className="rounded-xl border border-[#f3c8cb] bg-[#fff8f8] p-4 sm:p-5">
                    <div className="mb-4 flex items-start gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#e30613] text-xs font-bold text-white">1</span>
                      <div>
                        <p className="text-sm font-bold text-[#1f2937]">Xác nhận địa chỉ email</p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">Nhập email, nhận mã rồi xác nhận trước khi điền thông tin tài khoản.</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <AuthField
                        label="Email"
                        name="email"
                        type="email"
                        required
                        maxLength={100}
                        autoComplete="email"
                        value={registerData.email}
                        onChange={handleRegisterChange}
                        action={(
                          <button
                            type="button"
                            onClick={requestCode}
                            disabled={sendingCode}
                            className="shrink-0 rounded-lg border border-red-200 px-4 text-xs font-bold text-[#c4000b] transition hover:bg-red-50 disabled:opacity-60 sm:px-5"
                          >
                            {sendingCode ? 'Đang gửi...' : 'Gửi mã'}
                          </button>
                        )}
                      />
                      <AuthField
                        label="Mã xác nhận email"
                        name="verificationCode"
                        required
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        pattern="[0-9]{6}"
                        maxLength={6}
                        value={registerData.verificationCode}
                        onChange={handleRegisterChange}
                      />
                      {codeMessage && <p className="text-xs font-semibold text-emerald-600">{codeMessage}</p>}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-1">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1f2937] text-xs font-bold text-white">2</span>
                    <p className="text-sm font-bold text-[#1f2937]">Thông tin tài khoản</p>
                    <span className="h-px flex-1 bg-slate-200" />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <AuthField
                      label="Tên đăng nhập"
                      name="username"
                      required
                      autoComplete="username"
                      value={registerData.username}
                      onChange={handleRegisterChange}
                    />
                    <AuthField
                      label="Họ và tên"
                      name="fullname"
                      required
                      autoComplete="name"
                      value={registerData.fullname}
                      onChange={handleRegisterChange}
                    />
                  </div>

                  <AuthField
                    label="Số điện thoại"
                    name="phone"
                    type="tel"
                    required
                    inputMode="numeric"
                    maxLength={10}
                    autoComplete="tel"
                    value={registerData.phone}
                    onChange={handleRegisterChange}
                  />

                  <div className="grid gap-4 sm:grid-cols-2">
                    <AuthField
                      label="Mật khẩu"
                      name="password"
                      type="password"
                      required
                      minLength={8}
                      autoComplete="new-password"
                      value={registerData.password}
                      onChange={handleRegisterChange}
                    />
                    <AuthField
                      label="Nhập lại mật khẩu"
                      name="confirmPassword"
                      type="password"
                      required
                      minLength={8}
                      autoComplete="new-password"
                      value={registerData.confirmPassword}
                      onChange={handleRegisterChange}
                    />
                  </div>
                  <p className="text-xs font-medium leading-5 text-slate-500">
                    Mật khẩu tối thiểu 8 ký tự, có chữ hoa, chữ thường, chữ số và ký tự đặc biệt.
                  </p>

                  <button type="submit" disabled={registerLoading} className="auth-submit">
                    {registerLoading ? 'Đang đăng ký...' : 'Đăng ký ngay'}
                  </button>
                </form>
              )}

              <p className="mt-6 text-center text-sm text-slate-500 lg:hidden">
                Đã có tài khoản?{' '}
                <button type="button" onClick={() => switchMode('login')} className="font-bold text-[#c4000b]">
                  Đăng nhập
                </button>
              </p>
            </div>
          </section>

          <section
            className="auth-form-panel auth-form-panel--login"
            aria-hidden={isRegister}
            inert={isRegister}
          >
            <div className="w-full max-w-md">
              <Link to="/" className="mb-8 inline-flex lg:hidden">
                <img src={Logo} alt="Cuồng Điện Thoại" width={400} height={188} className="h-14 w-auto object-contain" />
              </Link>
              <h1 className="text-4xl font-bold tracking-[-0.03em] text-[#1f2937]">Đăng nhập</h1>
              <p className="mt-2 text-sm font-medium text-slate-500">
                Nhập tài khoản để tiếp tục mua sắm.
              </p>

              {loginError && (
                <div className="auth-alert auth-alert--error">
                  <AlertCircle size={16} /> {loginError}
                </div>
              )}

              <form onSubmit={handleLogin} className="mt-8 space-y-5">
                <AuthField
                  label="Tên đăng nhập hoặc email"
                  required
                  autoComplete="username"
                  placeholder="Ví dụ: nguyenvana hoặc email@gmail.com"
                  value={loginId}
                  maxLength={100}
                  onChange={event => setLoginId(event.target.value)}
                />
                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold text-[#374151]">
                    Mật khẩu <span className="text-[#c4000b]">*</span>
                  </span>
                  <span className="relative block">
                    <input
                      type={showLoginPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      placeholder="Nhập mật khẩu"
                      value={loginPassword}
                      onChange={event => setLoginPassword(event.target.value)}
                      className="customer-input pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(current => !current)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#1f2937]"
                      aria-label={showLoginPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    >
                      {showLoginPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </span>
                </label>

                <div className="text-right">
                  <Link to="/forgot-password" className="text-sm font-bold text-[#c4000b] hover:underline">
                    Quên mật khẩu?
                  </Link>
                </div>
                <button type="submit" disabled={loginLoading} className="auth-submit">
                  {loginLoading ? 'Đang đăng nhập...' : 'Đăng nhập ngay'}
                </button>
              </form>

              <p className="mt-7 text-center text-sm text-slate-500 lg:hidden">
                Chưa có tài khoản?{' '}
                <button type="button" onClick={() => switchMode('register')} className="font-bold text-[#c4000b]">
                  Đăng ký miễn phí
                </button>
              </p>
            </div>
          </section>

          <aside className="auth-overlay">
            <div className="auth-overlay-copy auth-overlay-copy--login">
              <div className="auth-overlay-content">
                <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#c4000b]">
                  Cuồng Điện Thoại
                </p>
                <h2 className="mt-3 text-4xl font-bold leading-tight tracking-[-0.03em] text-[#b0000a]">
                  Chưa có tài khoản?
                </h2>
                <p className="mt-5 max-w-sm leading-7 text-[#4b5563]">
                  Đăng ký để lưu lịch sử mua hàng, theo dõi bảo hành và đặt hàng nhanh hơn.
                </p>
                <button type="button" onClick={() => switchMode('register')} className="auth-overlay-button">
                  Tạo tài khoản
                </button>
              </div>
            </div>

            <div className="auth-overlay-copy auth-overlay-copy--register">
              <div className="auth-overlay-content">
                <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#c4000b]">
                  Cuồng Điện Thoại
                </p>
                <h2 className="mt-3 text-4xl font-bold leading-tight tracking-[-0.03em] text-[#b0000a]">
                  Đã là thành viên?
                </h2>
                <p className="mt-5 max-w-sm leading-7 text-[#4b5563]">
                  Đăng nhập để tiếp tục theo dõi đơn hàng và các quyền lợi của bạn.
                </p>
                <button type="button" onClick={() => switchMode('login')} className="auth-overlay-button">
                  Đăng nhập
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
