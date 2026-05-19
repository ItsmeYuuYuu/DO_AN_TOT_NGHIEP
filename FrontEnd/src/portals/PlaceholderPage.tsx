import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Construction, ArrowLeft } from 'lucide-react';

const PlaceholderPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 max-w-md w-full text-center">
        <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Construction size={40} className="text-amber-500" />
        </div>
        <h1 className="text-2xl font-black text-slate-800 mb-2">Tính năng đang phát triển</h1>
        <p className="text-slate-500 mb-8">
          Module này đang trong quá trình hoàn thiện và sẽ sớm được ra mắt. Vui lòng quay lại sau!
        </p>
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 w-full justify-center"
        >
          <ArrowLeft size={18} />
          Quay lại trang trước
        </button>
      </div>
    </div>
  );
};

export default PlaceholderPage;
