import React, { useEffect, useMemo, useState } from 'react';
import { Check, PackageCheck, ShoppingCart, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatCurrency, getDiscountPercent } from '@/utils/formatters';
import type { FullProductVariant } from '../api/productsApi';
import { useCart } from '@/features/orders/context/CartContext';

interface ProductPurchasePanelProps {
  productId: number;
  productName: string;
  isActive: boolean;
  variants: FullProductVariant[];
  selectedVariant: FullProductVariant | null;
  onSelectVariant: (v: FullProductVariant) => void;
}

const COLOR_SWATCHES: Record<string, string> = {
  Đen: '#171717',
  Trắng: '#f8fafc',
  Xanh: '#2563eb',
  Vàng: '#eab308',
  Hồng: '#ec4899',
  Xám: '#94a3b8',
};

const SELECTABLE_ATTRIBUTE_NAMES = [
  'Màu sắc',
  'Màu',
  'RAM',
  'Bộ nhớ trong',
  'ROM',
  'Dung lượng',
  'Xuất xứ',
];

const getVariantOptions = (variant: FullProductVariant) => {
  const options: Record<string, string> = {};
  variant.attributes?.forEach(attribute => {
    options[attribute.attributename] = attribute.valuename;
  });
  if (variant.condition) {
    options['Tình trạng'] = variant.condition.conditionname;
  }
  return options;
};

export const ProductPurchasePanel: React.FC<ProductPurchasePanelProps> = ({
  productId,
  productName,
  isActive,
  variants,
  selectedVariant,
  onSelectVariant,
}) => {
  const navigate = useNavigate();
  const { addToCart, isInCart } = useCart();
  const [addedToCart, setAddedToCart] = useState(false);
  const [cartError, setCartError] = useState('');
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});

  const optionGroups = useMemo(() => {
    const groups: Record<string, Set<string>> = {};

    variants.forEach(variant => {
      variant.attributes?.forEach(attr => {
        if (SELECTABLE_ATTRIBUTE_NAMES.includes(attr.attributename)) {
          if (!groups[attr.attributename]) groups[attr.attributename] = new Set();
          groups[attr.attributename].add(attr.valuename);
        }
      });

      if (variant.condition) {
        if (!groups['Tình trạng']) groups['Tình trạng'] = new Set();
        groups['Tình trạng'].add(variant.condition.conditionname);
      }
    });

    const result: Record<string, string[]> = {};
    for (const key in groups) {
      result[key] = Array.from(groups[key]);
    }
    return result;
  }, [variants]);

  useEffect(() => {
    if (!selectedVariant) return;

    const opts: Record<string, string> = {};
    selectedVariant.attributes?.forEach(attr => {
      if (SELECTABLE_ATTRIBUTE_NAMES.includes(attr.attributename)) {
        opts[attr.attributename] = attr.valuename;
      }
    });
    if (selectedVariant.condition) {
      opts['Tình trạng'] = selectedVariant.condition.conditionname;
    }
    setSelectedOptions(opts);
  }, [selectedVariant]);

  const discount = getDiscountPercent(selectedVariant?.baseprice, selectedVariant?.saleprice);
  const inCart = selectedVariant ? isInCart(selectedVariant.variantid) : false;
  const stock = selectedVariant?.stockquantity ?? 0;
  const isOutOfStock = !selectedVariant || stock <= 0;

  const findAvailableVariant = (attrName: string, valName: string) => {
    const groupNames = Object.keys(optionGroups);
    const currentGroupIndex = groupNames.indexOf(attrName);
    const precedingGroups = groupNames.slice(0, Math.max(currentGroupIndex, 0));

    const candidates = variants.filter(variant => {
      if ((variant.stockquantity ?? 0) <= 0) return false;

      const variantOptions = getVariantOptions(variant);
      if (variantOptions[attrName] !== valName) return false;

      return precedingGroups.every(key =>
        !selectedOptions[key] || variantOptions[key] === selectedOptions[key],
      );
    });

    return candidates.reduce<FullProductVariant | undefined>((best, candidate) => {
      if (!best) return candidate;

      const bestOptions = getVariantOptions(best);
      const candidateOptions = getVariantOptions(candidate);
      const bestMatches = Object.entries(selectedOptions)
        .filter(([key]) => key !== attrName)
        .filter(([key, value]) => bestOptions[key] === value).length;
      const candidateMatches = Object.entries(selectedOptions)
        .filter(([key]) => key !== attrName)
        .filter(([key, value]) => candidateOptions[key] === value).length;

      return candidateMatches > bestMatches ? candidate : best;
    }, undefined);
  };

  const handleOptionClick = (attrName: string, valName: string) => {
    const availableVariant = findAvailableVariant(attrName, valName);
    if (availableVariant) {
      onSelectVariant(availableVariant);
    }
  };

  const handleAddToCart = async () => {
    if (!isActive || !selectedVariant || isOutOfStock) return false;
    const images = selectedVariant.productimages ?? [];
    const primary = images.find(image => image.ismain) ?? images[0];

    const selectedAttrs = selectedVariant.attributes
      ?.filter(attr => SELECTABLE_ATTRIBUTE_NAMES.includes(attr.attributename))
      .map(attr => attr.valuename) ?? [];
    if (selectedVariant.condition) {
      selectedAttrs.push(selectedVariant.condition.conditionname);
    }
    const attrsName = selectedAttrs.join(' - ');

    setCartError('');
    const added = await addToCart({
      variantId: selectedVariant.variantid,
      productId,
      productName,
      variantName: attrsName || selectedVariant.sku,
      sku: selectedVariant.sku ?? '',
      imageUrl: primary?.imageurl ?? `https://placehold.co/400x400?text=${encodeURIComponent(productName)}`,
      price: selectedVariant.saleprice ?? selectedVariant.baseprice,
    }, 1);

    if (!added) {
      setCartError('Chưa thể thêm sản phẩm vào giỏ. Vui lòng thử lại sau.');
      return false;
    }

    setAddedToCart(true);
    window.setTimeout(() => setAddedToCart(false), 2000);
    return true;
  };

  const hasOptions = Object.keys(optionGroups).length > 0;

  return (
    <div className="flex h-full flex-col gap-6">
      <div className="rounded-2xl border border-[#f3c7cb] bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
        <p className="customer-label">Giá bán</p>
        <div className="mt-2 flex flex-wrap items-end gap-3">
          <span className="text-4xl font-black tracking-tight text-[#c4000b]">
            {formatCurrency(selectedVariant?.saleprice ?? selectedVariant?.baseprice ?? 0)}
          </span>
          {discount && discount > 0 ? (
            <>
              <span className="mb-1 text-sm text-[#9f6670] line-through">
                {formatCurrency(selectedVariant?.baseprice ?? 0)}
              </span>
              <span className="mb-1 rounded-full bg-[#e30613] px-2.5 py-1 text-xs font-black text-white">
                -{discount}%
              </span>
            </>
          ) : null}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-black ${
            !isActive || isOutOfStock ? 'bg-slate-100 text-slate-500' : 'bg-emerald-100 text-emerald-800'
          }`}>
            <PackageCheck size={15} />
            {!isActive ? 'Ngừng kinh doanh' : isOutOfStock ? 'Tạm hết hàng' : `Còn ${stock} sản phẩm`}
          </span>
        </div>
      </div>

      {hasOptions ? (
        <div className="flex flex-col gap-5">
          {Object.entries(optionGroups).map(([attrName, values]) => (
            <div key={attrName}>
              <h3 className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-[#1f2937]">
                {attrName}
              </h3>
              <div className="flex flex-wrap gap-2">
                {values.map(value => {
                  const isActive = selectedOptions[attrName] === value;
                  const isColor = attrName === 'Màu sắc' || attrName === 'Màu';
                  const isAvailable = Boolean(findAvailableVariant(attrName, value));
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => handleOptionClick(attrName, value)}
                      disabled={!isAvailable}
                      title={isAvailable ? undefined : 'Phiên bản này đã hết hàng'}
                      className={`min-w-[86px] rounded-full border px-4 py-2.5 text-sm font-black transition ${
                        !isAvailable
                          ? 'cursor-not-allowed border-[#e5e7eb] bg-slate-100 text-slate-400 opacity-60 line-through'
                          : isActive
                            ? 'border-[#e30613] bg-[#e30613] text-white shadow-[0_10px_24px_rgba(227,6,19,0.22)]'
                            : 'border-[#e5e7eb] bg-white text-[#1f2937] hover:border-[#1f2937]'
                      }`}
                    >
                      {isColor && (
                        <span
                          className="mr-2 inline-block h-4 w-4 rounded-full border border-slate-300 align-[-3px]"
                          style={{ backgroundColor: COLOR_SWATCHES[value] ?? '#cbd5e1' }}
                        />
                      )}
                      {value}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        variants.length > 0 && (
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-black uppercase tracking-[0.14em] text-[#1f2937]">
              Chọn phiên bản
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {variants.map(variant => {
                const isActive = selectedVariant?.variantid === variant.variantid;
                const isAvailable = (variant.stockquantity ?? 0) > 0;
                return (
                  <button
                    key={variant.variantid}
                    type="button"
                    onClick={() => { if (isAvailable) onSelectVariant(variant); }}
                    disabled={!isAvailable}
                    title={isAvailable ? undefined : 'Phiên bản này đã hết hàng'}
                    className={`rounded-xl border p-3 text-center transition ${
                      !isAvailable
                        ? 'cursor-not-allowed border-[#e5e7eb] bg-slate-100 text-slate-400 opacity-60'
                        : isActive
                          ? 'border-[#1f2937] bg-[#1f2937] text-white'
                          : 'border-[#e5e7eb] bg-white text-[#1f2937] hover:border-[#1f2937]'
                    }`}
                  >
                    <div className={`line-clamp-2 text-sm font-black ${!isAvailable ? 'line-through' : ''}`}>
                      {variant.sku}
                    </div>
                    {!isAvailable && <div className="mt-1 text-[11px] font-bold">Hết hàng</div>}
                  </button>
                );
              })}
            </div>
          </div>
        )
      )}

      <div className="mt-auto grid grid-cols-1 gap-3 border-t border-[#e5e7eb] pt-5 sm:grid-cols-2">
        {cartError && (
          <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-bold text-red-600 sm:col-span-2">
            {cartError}
          </div>
        )}
        {!isActive ? (
          <div className="flex min-h-12 items-center justify-center rounded-full bg-slate-200 px-4 py-3 text-sm font-black uppercase text-slate-500 sm:col-span-2">
            Ngừng kinh doanh
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={async () => {
                const added = await handleAddToCart();
                if (added) navigate('/cart');
              }}
              disabled={isOutOfStock}
              className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#e30613] px-4 py-3 text-white shadow-[0_12px_26px_rgba(227,6,19,0.22)] transition hover:bg-[#c4000b] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
            >
              <span className="flex items-center gap-2 text-sm font-black uppercase">
                <Zap size={17} className="fill-current" />
                {isOutOfStock ? 'Tạm hết hàng' : 'Mua ngay'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => { void handleAddToCart(); }}
              disabled={isOutOfStock}
              className={`flex min-h-12 items-center justify-center gap-2 rounded-full border px-4 py-3 text-sm font-black transition disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 ${
                addedToCart
                  ? 'border-emerald-600 bg-emerald-600 text-white'
                  : inCart
                    ? 'border-[#ffd166] bg-[#ffd166]/25 text-[#1f2937]'
                    : 'border-[#1f2937] bg-white text-[#1f2937] hover:bg-[#1f2937] hover:text-white'
              }`}
            >
              {addedToCart ? <Check size={17} /> : <ShoppingCart size={17} />}
              {addedToCart ? 'Đã thêm' : inCart ? 'Trong giỏ' : 'Thêm vào giỏ'}
            </button>
          </>
        )}
      </div>
    </div>
  );
};
