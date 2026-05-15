import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getCurrentUser, clearSession } from '@/features/auth/utils/authUtils';

const UnauthorizedPage: React.FC = () => {
  const navigate = useNavigate();
  const user = getCurrentUser();

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        {/* Icon */}
        <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        <h1 className="text-3xl font-black text-slate-800 mb-2">Truy cập bị từ chối</h1>
        <p className="text-slate-500 mb-2">
          Tài khoản của bạn không có quyền truy cập vào trang này.
        </p>
        {user && (
          <p className="text-sm text-slate-400 mb-8">
            Đang đăng nhập với vai trò:{' '}
            <span className="font-bold text-slate-600">{user.rolename}</span>
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-3 bg-white border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-colors text-sm"
          >
            ← Quay lại
          </button>
          <Link
            to="/"
            className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors text-sm"
          >
            Về trang chủ
          </Link>
          <button
            onClick={() => { clearSession(); navigate('/auth/login'); }}
            className="px-6 py-3 bg-slate-100 text-slate-600 font-semibold rounded-xl hover:bg-slate-200 transition-colors text-sm"
          >
            Đăng nhập lại
          </button>
        </div>
      </div>
    </div>
  );
};

export default UnauthorizedPage;
