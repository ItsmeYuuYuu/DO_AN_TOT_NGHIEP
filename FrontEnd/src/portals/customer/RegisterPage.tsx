import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '@/features/auth/api/authApi';
import { User, Mail, Phone, Lock, ChevronRight, XCircle } from 'lucide-react';

const isStrongPassword = (password: string) =>
  password.length >= 8 &&
  !/\s/.test(password) &&
  /[a-z]/.test(password) &&
  /[A-Z]/.test(password) &&
  /\d/.test(password) &&
  /[^A-Za-z0-9]/.test(password);

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    fullname: '',
    email: '',
    phone: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      const res = await authApi.register({
        username: formData.username.trim(),
        password: formData.password,
        fullname: formData.fullname.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
      });
      setSuccess(res.data.message || 'Đăng ký thành công!');
      setTimeout(() => {
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
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 max-w-md w-full">
        <h1 className="text-2xl font-black text-slate-800 mb-2">Đăng ký tài khoản</h1>
        <p className="text-slate-500 text-sm mb-8">Trở thành thành viên để nhận nhiều ưu đãi.</p>

        {error && (
          <div className="mb-6 flex items-center gap-2 text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm">
            <XCircle size={15} /> {error}
          </div>
        )}

        {success ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">✓</div>
            <p className="text-green-600 font-bold">{success}</p>
            <p className="text-slate-400 text-sm mt-2">Đang chuyển hướng đến trang đăng nhập...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input type="text" name="username" placeholder="Tên đăng nhập *" required
                value={formData.username} onChange={handleChange}
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-sm font-medium outline-none transition-colors"
              />
            </div>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input type="text" name="fullname" placeholder="Họ và tên *" required
                value={formData.fullname} onChange={handleChange}
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-sm font-medium outline-none transition-colors"
              />
            </div>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input type="email" name="email" placeholder="Email *" required maxLength={100}
                value={formData.email} onChange={handleChange}
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-sm font-medium outline-none transition-colors"
              />
            </div>
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input type="tel" name="phone" placeholder="Số điện thoại *" required
                inputMode="numeric" pattern="0[0-9]{9}" maxLength={10}
                value={formData.phone} onChange={handleChange}
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-sm font-medium outline-none transition-colors"
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input type="password" name="password" placeholder="Mật khẩu *" required minLength={8}
                value={formData.password} onChange={handleChange}
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-sm font-medium outline-none transition-colors"
              />
            </div>
            <p className="-mt-2 text-xs text-slate-500">
              Ít nhất 8 ký tự, có chữ hoa, chữ thường, chữ số và ký tự đặc biệt.
            </p>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input type="password" name="confirmPassword" placeholder="Nhập lại mật khẩu *" required minLength={8}
                value={formData.confirmPassword} onChange={handleChange}
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-sm font-medium outline-none transition-colors"
              />
            </div>

            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white font-black rounded-xl hover:bg-blue-700 disabled:opacity-60 transition-colors mt-2"
            >
              {loading ? 'Đang đăng ký...' : 'Đăng ký ngay'}
            </button>
          </form>
        )}

        <div className="mt-8 text-center">
          <p className="text-slate-500 text-sm">Đã có tài khoản?</p>
          <Link to="/auth/login" className="inline-flex items-center gap-1 text-blue-600 font-bold hover:underline mt-1">
            Đăng nhập <ChevronRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
