import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, Plus, Minus, ShoppingBag, ArrowLeft, Tag } from 'lucide-react';
import { useCart } from '@/features/orders/context/CartContext';
import { formatCurrency } from '@/utils/formatters';

const CartPage: React.FC = () => {
  const { items, totalItems, totalPrice, removeFromCart, updateQuantity, clearCart } = useCart();
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShoppingBag size={40} className="text-slate-300" />
        </div>
        <h2 className="text-2xl font-black text-slate-800 mb-2">Giỏ hàng trống</h2>
        <p className="text-slate-500 mb-8">Bạn chưa thêm sản phẩm nào vào giỏ hàng.</p>
        <Link to="/" className="inline-flex items-center gap-2 px-8 py-3 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200">
          <ArrowLeft size={18} /> Tiếp tục mua sắm
        </Link>
      </div>
    );
  }

  const shipping = totalPrice >= 2_000_000 ? 0 : 30_000;
  const grandTotal = totalPrice + shipping;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Giỏ hàng của bạn</h1>
          <p className="text-slate-500 text-sm mt-1">{totalItems} sản phẩm</p>
        </div>
        <button onClick={clearCart} className="text-sm text-red-500 hover:text-red-600 font-semibold flex items-center gap-1.5">
          <Trash2 size={14} /> Xóa tất cả
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map(item => (
            <div key={item.variantId} className="bg-white rounded-2xl border border-slate-100 p-4 flex gap-4 shadow-sm hover:shadow-md transition-shadow">
              <Link to={`/product/${item.productId}`} className="shrink-0">
                <img src={item.imageUrl} alt={item.productName} className="w-20 h-20 object-contain rounded-xl bg-slate-50 border border-slate-100 p-1"
                  onError={e => { (e.target as HTMLImageElement).src = 'https://placehold.co/80x80?text=SP'; }} />
              </Link>
              <div className="flex-1 min-w-0">
                <Link to={`/product/${item.productId}`}>
                  <h3 className="font-bold text-slate-900 hover:text-blue-600 transition-colors line-clamp-2">{item.productName}</h3>
                </Link>
                {item.variantName && (
                  <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1"><Tag size={10} /> {item.variantName}</p>
                )}
                <p className="text-orange-500 font-black text-lg mt-2">{formatCurrency(item.price)}</p>
              </div>
              <div className="flex flex-col items-end justify-between shrink-0">
                <button onClick={() => removeFromCart(item.variantId)} className="text-slate-300 hover:text-red-500 transition-colors p-1">
                  <Trash2 size={16} />
                </button>
                <div className="flex items-center border-2 border-slate-200 rounded-xl overflow-hidden">
                  <button onClick={() => updateQuantity(item.variantId, item.quantity - 1)} className="px-2.5 py-1.5 text-slate-500 hover:bg-slate-50"><Minus size={14} /></button>
                  <span className="px-3 py-1.5 font-bold text-sm text-slate-900 border-x-2 border-slate-200">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.variantId, item.quantity + 1)} className="px-2.5 py-1.5 text-slate-500 hover:bg-slate-50"><Plus size={14} /></button>
                </div>
              </div>
            </div>
          ))}
          <Link to="/" className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-semibold mt-2">
            <ArrowLeft size={16} /> Tiếp tục mua sắm
          </Link>
        </div>

        {/* Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm sticky top-24">
            <h2 className="font-black text-slate-900 text-lg mb-5">Tóm tắt đơn hàng</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Tạm tính ({totalItems} sp)</span>
                <span className="font-semibold">{formatCurrency(totalPrice)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Phí vận chuyển</span>
                <span className={`font-semibold ${shipping === 0 ? 'text-emerald-600' : ''}`}>
                  {shipping === 0 ? 'Miễn phí' : formatCurrency(shipping)}
                </span>
              </div>
              {shipping > 0 && (
                <p className="text-xs text-slate-400">Mua thêm {formatCurrency(2_000_000 - totalPrice)} để được miễn phí ship.</p>
              )}
              <div className="border-t border-slate-100 pt-3 flex justify-between font-black text-slate-900 text-base">
                <span>Tổng cộng</span>
                <span className="text-orange-500 text-xl">{formatCurrency(grandTotal)}</span>
              </div>
            </div>
            <button onClick={() => navigate('/checkout')}
              className="w-full mt-6 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-blue-200 hover:-translate-y-0.5">
              Tiến hành thanh toán →
            </button>
            <div className="flex items-center justify-center gap-2 mt-4">
              {['VISA', 'MC', 'COD', 'VNPAY'].map(p => (
                <span key={p} className="px-2 py-1 bg-slate-100 text-slate-500 text-[10px] font-bold rounded">{p}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartPage;
