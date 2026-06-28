import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '@/features/auth/api/authApi';
import { AlertCircle, CheckCircle2, ChevronRight, Lock, Mail, Phone, User, UserPlus } from 'lucide-react';
import Logo from '@/assets/Logo.png';
import { Seo } from '@/components/Seo';

const isStrongPassword = (password: string) =>
  password.length >= 8 &&
  !/\s/.test(password) &&
  /[a-z]/.test(password) &&
  /[A-Z]/.test(password) &&
  /\d/.test(password) &&
  /[^A-Za-z0-9]/.test(password);

const digitsOnly = (value: string, maxLength: number) =>
  value.replace(/\D/g, '').slice(0, maxLength);

interface AuthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon: React.ReactNode;
}

const AuthInput = ({ icon, className = '', ...props }: AuthInputProps) => (
  <div className="relative">
    <span className="pointer-events-none absolute left-4 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center text-slate-400">
      {icon}
    </span>
    <input
      {...props}
      className={`customer-input !pl-14 ${className}`}
    />
  </div>
);

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    fullname: '',
    email: '',
    phone: '',
    verificationCode: '',
  });
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [codeMessage, setCodeMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    const nextValue =
      name === 'phone' ? digitsOnly(value, 10) :
      name === 'verificationCode' ? digitsOnly(value, 6) :
      value;
    setFormData({ ...formData, [name]: nextValue });
    if (error) setError(null);
  };

  const requestCode = async () => {
    const email = formData.email.trim();
    if (!email) {
      setError('Vui lòng nhập email trước khi gửi mã xác nhận.');
      return;
    }

    setSendingCode(true);
    setError(null);
    setCodeMessage(null);
    try {
      const response = await authApi.requestRegistrationCode(email);
      setCodeMessage(response.data.message || 'Đã gửi mã xác nhận đến email của bạn.');
    } catch (err: unknown) {
      const data = (err as { response?: { data?: { message?: string } } })?.response?.data;
      setError(data?.message || 'Không thể gửi mã xác nhận lúc này.');
    } finally {
      setSendingCode(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!isStrongPassword(formData.password)) {
      setError('Mật khẩu phải có ít nhất 8 ký tự, gồm chữ hoa, chữ thường, chữ số và ký tự đặc biệt.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Mật khẩu nhập lại không khớp.');
      return;
    }

    if (!/^0\d{9}$/.test(formData.phone.trim())) {
      setError('Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0.');
      return;
    }

    setLoading(true);
    try {
      const response = await authApi.register({
        username: formData.username.trim(),
        password: formData.password,
        fullname: formData.fullname.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        verificationCode: formData.verificationCode.trim() || undefined,
      });
      setSuccess(response.data.message || 'Đăng ký thành công!');
      window.setTimeout(() => {
        navigate('/auth/login', { state: { username: formData.username } });
      }, 2000);
    } catch (err: unknown) {
      const data = (err as {
        response?: { data?: { message?: string; errors?: Record<string, string[]> } };
      })?.response?.data;
      const validationMessage = data?.errors
        ? Object.values(data.errors).flat().find(Boolean)
        : undefined;
      setError(validationMessage || data?.message || 'Đã xảy ra lỗi. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="customer-shell min-h-screen px-4 py-8">
      <Seo
        title="Đăng ký tài khoản - Cuồng Điện Thoại"
        description="Tạo tài khoản mua hàng tại Cuồng Điện Thoại."
        noIndex
      />
      <div className="customer-container flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <div className="grid w-full max-w-6xl overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white shadow-[0_24px_70px_rgba(15,23,42,0.14)] lg:grid-cols-[0.95fr_1.05fr]">
          <section className="relative hidden min-h-[560px] overflow-hidden bg-[#1f2937] p-10 text-white lg:flex lg:flex-col">
            <div className="absolute -right-24 top-20 h-72 w-72 rounded-full border border-white/10 bg-[#ffd166]/10" />
            <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-[#e30613]/20" />

            <div className="relative z-10">
              <Link to="/" className="inline-flex rounded-2xl bg-white px-5 py-3 shadow-[0_14px_30px_rgba(227,6,19,0.18)]">
                <img src={Logo} alt="Cuồng Điện Thoại" className="h-16 w-auto object-contain" />
              </Link>
              <p className="mt-16 text-xs font-black uppercase tracking-[0.28em] text-[#ffd166]">Cuồng Điện Thoại</p>
              <h1 className="customer-display mt-3 max-w-md text-5xl font-black leading-[0.95]">
                Tạo tài khoản mới.
              </h1>
              <p className="mt-6 max-w-sm text-sm font-medium leading-7 text-white/70">
                Lưu lịch sử mua hàng, theo dõi bảo hành và đặt hàng nhanh hơn ở những lần sau.
              </p>
            </div>
          </section>

          <section className="p-6 md:p-10 lg:p-14">
            <div className="mx-auto max-w-md">
              <Link to="/" className="mb-8 inline-flex lg:hidden">
                <img src={Logo} alt="Cuồng Điện Thoại" className="h-14 w-auto object-contain" />
              </Link>

              <h2 className="customer-display mt-2 text-4xl font-black text-[#1f2937]">Đăng ký</h2>
              <p className="mt-2 text-sm font-medium text-slate-500">
                Điền thông tin để tạo tài khoản mua hàng.
              </p>

              {error && (
                <div className="mt-6 flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                  <AlertCircle size={16} className="shrink-0" /> {error}
                </div>
              )}

              {success ? (
                <div className="mt-8 border border-emerald-200 bg-emerald-50 p-8 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                    <CheckCircle2 size={34} />
                  </div>
                  <p className="font-black text-emerald-700">{success}</p>
                  <p className="mt-2 text-sm font-medium text-slate-500">Đang chuyển hướng đến trang đăng nhập...</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="mt-8 space-y-4">
                  <AuthInput
                    icon={<User size={18} />}
                    type="text"
                    name="username"
                    placeholder="Tên đăng nhập *"
                    required
                    value={formData.username}
                    onChange={handleChange}
                    autoComplete="username"
                  />
                  <AuthInput
                    icon={<UserPlus size={18} />}
                    type="text"
                    name="fullname"
                    placeholder="Họ và tên *"
                    required
                    value={formData.fullname}
                    onChange={handleChange}
                    autoComplete="name"
                  />
                  <AuthInput
                    icon={<Mail size={18} />}
                    type="email"
                    name="email"
                    placeholder="Email *"
                    required
                    maxLength={100}
                    value={formData.email}
                    onChange={handleChange}
                    autoComplete="email"
                  />
                  <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                    <AuthInput
                      icon={<Mail size={18} />}
                      type="text"
                      name="verificationCode"
                      placeholder="Mã xác nhận email"
                      inputMode="numeric"
                      maxLength={6}
                      value={formData.verificationCode}
                      onChange={handleChange}
                    />
                    <button
                      type="button"
                      onClick={requestCode}
                      disabled={sendingCode}
                      className="rounded-full border border-[#e5e7eb] px-4 py-3 text-xs font-black text-[#1f2937] transition hover:border-[#e30613] hover:text-[#c4000b] disabled:opacity-60"
                    >
                      {sendingCode ? 'Đang gửi...' : 'Gửi mã'}
                    </button>
                  </div>
                  {codeMessage && (
                    <p className="-mt-1 text-xs font-bold text-emerald-600">{codeMessage}</p>
                  )}
                  <AuthInput
                    icon={<Phone size={18} />}
                    type="tel"
                    name="phone"
                    placeholder="Số điện thoại *"
                    required
                    inputMode="numeric"
                    pattern="0[0-9]{9}"
                    maxLength={10}
                    value={formData.phone}
                    onChange={handleChange}
                    autoComplete="tel"
                  />
                  <AuthInput
                    icon={<Lock size={18} />}
                    type="password"
                    name="password"
                    placeholder="Mật khẩu *"
                    required
                    minLength={8}
                    value={formData.password}
                    onChange={handleChange}
                    autoComplete="new-password"
                  />
                  <p className="-mt-1 text-xs font-semibold leading-5 text-slate-500">
                    Ít nhất 8 ký tự, có chữ hoa, chữ thường, chữ số và ký tự đặc biệt.
                  </p>
                  <AuthInput
                    icon={<Lock size={18} />}
                    type="password"
                    name="confirmPassword"
                    placeholder="Nhập lại mật khẩu *"
                    required
                    minLength={8}
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    autoComplete="new-password"
                  />

                  <button
                    type="submit"
                    disabled={loading}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-[#e30613] py-3.5 text-sm font-black uppercase tracking-[0.14em] text-white transition hover:bg-[#c4000b] disabled:opacity-60"
                  >
                    {loading ? 'Đang đăng ký...' : 'Đăng ký ngay'}
                  </button>
                </form>
              )}

              <div className="mt-8 border-t border-[#e5e7eb] pt-6 text-center">
                <p className="text-sm font-medium text-slate-500">Đã có tài khoản?</p>
                <Link to="/auth/login" className="mt-1 inline-flex items-center gap-1 font-black text-[#c4000b] hover:underline">
                  Đăng nhập <ChevronRight size={14} />
                </Link>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
};

export default RegisterPage;
