import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Minus, Plus, ShieldCheck, ShoppingBag, Tag, Trash2, Truck } from 'lucide-react';
import { useCart } from '@/features/orders/context/CartContext';
import { formatCurrency } from '@/utils/formatters';

const CartPage: React.FC = () => {
  const { items, totalItems, totalPrice, removeFromCart, updateQuantity, clearCart } = useCart();
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <div className="customer-shell min-h-screen px-4 py-16">
        <div className="customer-panel-soft mx-auto max-w-2xl px-6 py-20 text-center">
          <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center bg-[#1f2937] text-white">
            <ShoppingBag size={42} />
          </div>
          <p className="customer-label">Cart</p>
          <h2 className="customer-display mt-2 text-4xl font-bold text-[#1f2937]">
            Giỏ hàng đang trống
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500">
            Bạn chưa thêm sản phẩm nào. Hãy xem danh sách máy hoặc hỏi AI để được gợi ý nhanh hơn.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/products" className="customer-button-dark">
              Xem sản phẩm <ArrowRight size={15} />
            </Link>
            <Link to="/chat" className="customer-button-outline">
              Hỏi AI tư vấn
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const shipping = totalPrice >= 2_000_000 ? 0 : 30_000;
  const grandTotal = totalPrice + shipping;

  return (
    <div className="customer-shell min-h-screen pb-16">
      <section className="border-b customer-rule bg-[#ffffff] px-3 py-6 sm:px-4 sm:py-8">
        <div className="customer-container flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="customer-label">Shopping cart</p>
            <h1 className="customer-display mt-2 text-3xl font-bold text-[#1f2937] sm:text-4xl">
              Giỏ hàng của bạn
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              {totalItems} sản phẩm đang chờ thanh toán.
            </p>
          </div>
          <button
            type="button"
            onClick={clearCart}
            className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-[#c4000b]"
          >
            <Trash2 size={14} /> Xóa tất cả
          </button>
        </div>
      </section>

      <main className="customer-container grid gap-6 px-3 py-6 sm:px-4 sm:py-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          {items.map(item => (
            <article key={item.variantId} className="customer-panel flex flex-col gap-4 p-3 transition hover:-translate-y-0.5 hover:shadow-xl sm:flex-row sm:p-4">
              <Link to={`/products/${item.productId}`} className="shrink-0">
                <img
                  src={item.imageUrl}
                  alt={item.productName}
                  className="h-32 w-full rounded-2xl border border-[#e5e7eb] bg-[#f3f4f6] object-contain p-3 sm:h-24 sm:w-24 sm:rounded-none sm:p-2"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </Link>

              <div className="min-w-0 flex-1">
                <Link to={`/products/${item.productId}`}>
                  <h3 className="line-clamp-2 font-black leading-6 text-[#1f2937] transition hover:text-[#c4000b]">
                    {item.productName}
                  </h3>
                </Link>
                {item.variantName && (
                  <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-slate-500">
                    <Tag size={11} /> {item.variantName}
                  </p>
                )}
                <p className="mt-3 text-xl font-black tracking-tight text-[#c4000b]">
                  {formatCurrency(item.price)}
                </p>
              </div>

              <div className="flex shrink-0 flex-row-reverse items-center justify-between sm:flex-col sm:items-end">
                <button
                  type="button"
                  onClick={() => removeFromCart(item.variantId)}
                  className="p-1 text-slate-300 transition hover:text-[#c4000b]"
                  aria-label="Xóa khỏi giỏ"
                >
                  <Trash2 size={16} />
                </button>

                <div className="flex rounded-full border border-[#e5e7eb] bg-white sm:rounded-none">
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                    className="flex h-9 w-9 items-center justify-center text-slate-500 hover:bg-[#f3f4f6]"
                    aria-label="Giảm số lượng"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="flex h-9 min-w-10 items-center justify-center border-x border-[#e5e7eb] text-sm font-black text-[#1f2937]">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                    className="flex h-9 w-9 items-center justify-center text-slate-500 hover:bg-[#f3f4f6]"
                    aria-label="Tăng số lượng"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            </article>
          ))}

          <Link to="/products" className="customer-button-outline">
            <ArrowLeft size={15} /> Tiếp tục mua sắm
          </Link>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="customer-panel p-6">
            <p className="customer-label">Order summary</p>
            <h2 className="customer-display mt-2 text-3xl font-bold text-[#1f2937]">
              Tạm tính đơn hàng
            </h2>

            <div className="mt-6 space-y-3 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Tạm tính ({totalItems} sp)</span>
                <span className="font-bold text-[#1f2937]">{formatCurrency(totalPrice)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Phí vận chuyển</span>
                <span className={`font-bold ${shipping === 0 ? 'text-emerald-700' : 'text-[#1f2937]'}`}>
                  {shipping === 0 ? 'Miễn phí' : formatCurrency(shipping)}
                </span>
              </div>
              {shipping > 0 && (
                <div className="flex gap-2 border border-[#e5e7eb] bg-[#ffffff] p-3 text-xs leading-5 text-slate-500">
                  <Truck className="mt-0.5 shrink-0 text-[#c4000b]" size={15} />
                  <span>Mua thêm {formatCurrency(2_000_000 - totalPrice)} để được miễn phí vận chuyển.</span>
                </div>
              )}
              <div className="border-t border-[#e5e7eb] pt-4">
                <div className="flex justify-between">
                  <span className="font-black text-[#1f2937]">Tổng cộng</span>
                  <span className="text-2xl font-black text-[#c4000b]">{formatCurrency(grandTotal)}</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate('/checkout')}
              className="customer-button-dark mt-6 w-full"
            >
              Tiến hành thanh toán <ArrowRight size={15} />
            </button>

            <div className="mt-5 flex items-start gap-3 border-t border-[#e5e7eb] pt-5">
              <ShieldCheck className="mt-0.5 shrink-0 text-emerald-700" size={19} />
              <p className="text-xs leading-5 text-slate-500">
                Khách vãng lai cần đặt cọc hoặc thanh toán trước. Thành viên có thể chọn thêm COD.
              </p>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
};

export default CartPage;
