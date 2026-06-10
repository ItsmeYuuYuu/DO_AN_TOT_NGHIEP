import React, { useState, useEffect, useMemo } from 'react';
import { ShoppingCart, Check, PackageCheck, Zap } from 'lucide-react';
import { formatCurrency, getDiscountPercent } from '@/utils/formatters';
import type { FullProductVariant } from '../api/productsApi';
import { useCart } from '@/features/orders/context/CartContext';
import { useNavigate } from 'react-router-dom';

interface ProductPurchasePanelProps {
  productId: number;
  productName: string;
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
  variants,
  selectedVariant,
  onSelectVariant,
}) => {
  const navigate = useNavigate();
  const { addToCart, isInCart } = useCart();
  const [addedToCart, setAddedToCart] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});

  // Parse variants into attribute groups
  const optionGroups = useMemo(() => {
    const groups: Record<string, Set<string>> = {};

    variants.forEach(v => {
      v.attributes?.forEach(attr => {
        if (SELECTABLE_ATTRIBUTE_NAMES.includes(attr.attributename)) {
          if (!groups[attr.attributename]) groups[attr.attributename] = new Set();
          groups[attr.attributename].add(attr.valuename);
        }
      });
      // Handle condition as an option if present
      if (v.condition) {
        if (!groups['Tình trạng']) groups['Tình trạng'] = new Set();
        groups['Tình trạng'].add(v.condition.conditionname);
      }
    });

    // Convert Sets to Arrays
    const result: Record<string, string[]> = {};
    for (const key in groups) {
      result[key] = Array.from(groups[key]);
    }
    return result;
  }, [variants]);

  // Sync selectedOptions when selectedVariant changes from outside
  useEffect(() => {
    if (selectedVariant) {
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
    }
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
        !selectedOptions[key] || variantOptions[key] === selectedOptions[key]
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
    if (!selectedVariant || isOutOfStock) return;
    const images = selectedVariant.productimages ?? [];
    const primary = images.find(i => i.ismain) ?? images[0];
    
    const attrsName = selectedVariant.attributes?.map(a => a.valuename).join(' - ');
    const variantName = attrsName || selectedVariant.sku;

    await addToCart({
      variantId: selectedVariant.variantid,
      productId: productId,
      productName: productName,
      variantName: variantName,
      sku: selectedVariant.sku ?? '',
      imageUrl: primary?.imageurl ?? `https://placehold.co/400x400?text=${encodeURIComponent(productName)}`,
      price: selectedVariant.saleprice ?? selectedVariant.baseprice,
    }, 1);
    
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  };

  const hasOptions = Object.keys(optionGroups).length > 0;

  return (
    <div className="flex h-full flex-col gap-5">
      <div className="rounded-2xl bg-slate-50 p-5">
        <div className="flex flex-wrap items-end gap-3">
          <span className="text-3xl font-black tracking-tight text-red-600 md:text-4xl">
          {formatCurrency(selectedVariant?.saleprice ?? selectedVariant?.baseprice ?? 0)}
          </span>
          {discount && discount > 0 ? (
            <>
            <span className="text-sm text-slate-400 line-through mb-1">
              {formatCurrency(selectedVariant?.baseprice ?? 0)}
            </span>
              <span className="mb-0.5 rounded-md bg-red-600 px-2 py-1 text-xs font-black text-white">
                -{discount}%
              </span>
            </>
          ) : null}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-semibold ${
            isOutOfStock ? 'bg-slate-200 text-slate-600' : 'bg-emerald-100 text-emerald-700'
          }`}>
            <PackageCheck size={15} />
            {isOutOfStock ? 'Tạm hết hàng' : `Còn ${stock} sản phẩm`}
          </span>
        </div>
      </div>

      {hasOptions ? (
        <div className="flex flex-col gap-5">
          {Object.entries(optionGroups).map(([attrName, values]) => (
            <div key={attrName}>
              <h3 className="mb-2 text-sm font-bold text-slate-800">{attrName}</h3>
              <div className="flex flex-wrap gap-2">
                {values.map(val => {
                  const isActive = selectedOptions[attrName] === val;
                  const isColor = attrName === 'Màu sắc' || attrName === 'Màu';
                  const isAvailable = Boolean(findAvailableVariant(attrName, val));
                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => handleOptionClick(attrName, val)}
                      disabled={!isAvailable}
                      title={isAvailable ? undefined : 'Phiên bản này đã hết hàng'}
                      className={`min-w-[84px] rounded-lg border-2 px-4 py-2.5 text-sm font-semibold transition-all ${
                        !isAvailable
                          ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 opacity-60 line-through'
                          : isActive
                          ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50/50'
                      }`}
                    >
                      {isColor && (
                        <span
                          className="mr-2 inline-block h-4 w-4 rounded-full border border-slate-300 align-[-3px]"
                          style={{ backgroundColor: COLOR_SWATCHES[val] ?? '#cbd5e1' }}
                        />
                      )}
                      {val}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Fallback for simple SKUs */
        variants.length > 0 && (
          <div className="flex flex-col gap-3">
            <h3 className="font-semibold text-slate-800 text-sm uppercase tracking-wide">Chọn phiên bản:</h3>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
              {variants.map(v => {
                const isActive = selectedVariant?.variantid === v.variantid;
                const isAvailable = (v.stockquantity ?? 0) > 0;
                return (
                  <button
                    key={v.variantid}
                    type="button"
                    onClick={() => { if (isAvailable) onSelectVariant(v); }}
                    disabled={!isAvailable}
                    title={isAvailable ? undefined : 'Phiên bản này đã hết hàng'}
                    className={`rounded-lg border-2 p-3 text-center transition-all ${
                      !isAvailable
                        ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 opacity-60'
                        : isActive
                          ? 'border-blue-600 bg-blue-50 text-blue-700'
                          : 'border-slate-200 bg-white hover:border-blue-300'
                    }`}
                  >
                    <div className={`font-semibold text-sm line-clamp-2 ${
                      !isAvailable ? 'line-through' : isActive ? 'text-blue-700' : 'text-slate-700'
                    }`}>
                      {v.sku}
                    </div>
                    {!isAvailable && <div className="mt-1 text-[11px] font-bold">Hết hàng</div>}
                  </button>
                );
              })}
            </div>
          </div>
        )
      )}

      <div className="mt-auto grid grid-cols-1 gap-3 border-t border-slate-100 pt-5 sm:grid-cols-2">
        <button
          onClick={async () => { await handleAddToCart(); navigate('/cart'); }}
          disabled={isOutOfStock}
          className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-white shadow-sm transition-all hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
        >
          <span className="flex items-center gap-2 text-sm font-black uppercase">
            <Zap size={17} className="fill-current" /> {isOutOfStock ? 'Tạm hết hàng' : 'Mua ngay'}
          </span>
        </button>

        <button
          onClick={() => { void handleAddToCart(); }}
          disabled={isOutOfStock}
          className={`flex min-h-11 items-center justify-center gap-2 rounded-xl border-2 px-4 py-2.5 text-sm font-bold transition-all disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 ${
            addedToCart
              ? 'border-emerald-500 bg-emerald-500 text-white'
              : inCart
              ? 'border-blue-500 bg-blue-50 text-blue-600'
              : 'border-blue-600 bg-white text-blue-600 hover:bg-blue-50'
          }`}
        >
          {addedToCart ? <Check size={17} /> : <ShoppingCart size={17} />}
          {addedToCart ? 'Đã thêm' : inCart ? 'Trong giỏ' : 'Thêm vào giỏ'}
        </button>
      </div>
    </div>
  );
};
