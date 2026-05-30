import React, { useState, useEffect, useMemo } from 'react';
import { ShoppingCart, Check } from 'lucide-react';
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
    const allowedKeys = ['Màu sắc', 'Màu', 'RAM', 'Bộ nhớ trong', 'ROM'];

    variants.forEach(v => {
      v.attributes?.forEach(attr => {
        if (allowedKeys.includes(attr.attributename)) {
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
        opts[attr.attributename] = attr.valuename;
      });
      if (selectedVariant.condition) {
        opts['Tình trạng'] = selectedVariant.condition.conditionname;
      }
      setSelectedOptions(opts);
    }
  }, [selectedVariant]);

  const discount = getDiscountPercent(selectedVariant?.baseprice, selectedVariant?.saleprice);
  const inCart = selectedVariant ? isInCart(selectedVariant.variantid) : false;

  const handleOptionClick = (attrName: string, valName: string) => {
    const newOptions = { ...selectedOptions, [attrName]: valName };
    
    // Find best match variant
    let bestMatch: FullProductVariant | null = null;
    let maxMatches = -1;

    for (const v of variants) {
      const vOpts: Record<string, string> = {};
      v.attributes?.forEach(a => { vOpts[a.attributename] = a.valuename; });
      if (v.condition) vOpts['Tình trạng'] = v.condition.conditionname;

      // Variant MUST have the newly clicked option
      if (vOpts[attrName] !== valName) continue;

      // Count matches for other options
      let matches = 0;
      for (const key in newOptions) {
        if (key !== attrName && vOpts[key] === newOptions[key]) {
          matches++;
        }
      }

      if (matches > maxMatches) {
        maxMatches = matches;
        bestMatch = v;
      }
    }

    if (bestMatch) {
      onSelectVariant(bestMatch);
    }
  };

  const handleAddToCart = () => {
    if (!selectedVariant) return;
    const images = selectedVariant.productimages ?? [];
    const primary = images.find(i => i.ismain) ?? images[0];
    
    const attrsName = selectedVariant.attributes?.map(a => a.valuename).join(' - ');
    const variantName = attrsName || selectedVariant.sku;

    addToCart({
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
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end gap-4 pb-2 border-b border-slate-100">
        <span className="text-4xl font-bold text-red-600">
          {formatCurrency(selectedVariant?.saleprice ?? selectedVariant?.baseprice ?? 0)}
        </span>
        {discount && discount > 0 ? (
          <div className="flex flex-col pb-1">
            <span className="text-sm text-slate-400 line-through mb-1">
              {formatCurrency(selectedVariant?.baseprice ?? 0)}
            </span>
          </div>
        ) : null}
      </div>

      <p className="text-sm text-red-600 italic">
        Quý khách vui lòng chọn màu sắc / ram / bộ nhớ trong / option để xem giá sản phẩm chính xác. Xin cảm ơn!
      </p>

      {hasOptions ? (
        <div className="flex flex-col gap-5">
          {Object.entries(optionGroups).map(([attrName, values]) => (
            <div key={attrName}>
              <h3 className="font-semibold text-slate-800 text-sm mb-2 uppercase tracking-wide">{attrName}:</h3>
              <div className="flex flex-wrap gap-2">
                {values.map(val => {
                  const isActive = selectedOptions[attrName] === val;
                  return (
                    <button
                      key={val}
                      onClick={() => handleOptionClick(attrName, val)}
                      className={`px-4 py-2 border rounded text-sm font-medium transition-all min-w-[80px] ${
                        isActive 
                          ? 'border-red-500 text-red-600 shadow-sm' 
                          : 'border-slate-300 text-slate-700 hover:border-slate-400 bg-white hover:bg-slate-50'
                      }`}
                    >
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
                return (
                  <button
                    key={v.variantid}
                    onClick={() => { onSelectVariant(v); }}
                    className={`p-3 border rounded text-center transition-all ${
                      isActive ? 'border-red-500 text-red-600' : 'border-slate-300 hover:border-slate-400 bg-white'
                    }`}
                  >
                    <div className={`font-semibold text-sm line-clamp-2 ${isActive ? 'text-red-600' : 'text-slate-700'}`}>
                      {v.sku}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )
      )}

      <div className="flex flex-col gap-3 mt-4">
        <button
          onClick={() => { handleAddToCart(); navigate('/cart'); }}
          className="w-full py-3 rounded bg-red-600 hover:bg-red-700 text-white transition-all shadow-md flex flex-col items-center justify-center"
        >
          <span className="font-bold text-lg uppercase">Mua Ngay</span>
          <span className="text-xs opacity-90">(Giao hàng tận nơi hoặc nhận tại cửa hàng)</span>
        </button>

        <div className="flex flex-row gap-3">
          <button
            onClick={handleAddToCart}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded font-bold transition-all ${
              addedToCart
                ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                : inCart
                ? 'bg-blue-50 border border-blue-500 text-blue-600 hover:bg-blue-100'
                : 'bg-blue-500 text-white hover:bg-blue-600 shadow-sm'
            }`}
          >
            {addedToCart ? <Check size={18} /> : <ShoppingCart size={18} />}
            {addedToCart ? 'Đã thêm' : inCart ? 'Trong giỏ hàng' : 'Thêm vào giỏ hàng'}
          </button>
          <a
            href="#"
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded font-bold transition-all bg-blue-500 text-white hover:bg-blue-600 shadow-sm"
            onClick={(e) => { e.preventDefault(); alert('Chức năng mua trả góp đang được phát triển'); }}
          >
            Mua trả góp
          </a>
        </div>
      </div>
    </div>
  );
};
