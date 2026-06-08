import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Expand } from 'lucide-react';

interface ProductGalleryProps {
  productName: string;
  images: { imageid: number; imageurl: string; ismain: boolean }[];
}

export const ProductGallery: React.FC<ProductGalleryProps> = ({ productName, images }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const orderedImages = [...images].sort((a, b) => Number(b.ismain) - Number(a.ismain));

  // Reset to first image when variant changes (images array changes)
  useEffect(() => {
    setActiveIndex(0);
  }, [images]);

  const activeImage = orderedImages[activeIndex]?.imageurl || `https://placehold.co/600x600?text=${encodeURIComponent(productName)}`;

  const nextImage = () => setActiveIndex((prev) => (prev + 1) % Math.max(1, orderedImages.length));
  const prevImage = () => setActiveIndex((prev) => (prev - 1 + orderedImages.length) % Math.max(1, orderedImages.length));

  return (
    <div className="flex flex-col gap-4">
      {/* Main Image */}
      <div className="relative aspect-square bg-white rounded-2xl border border-slate-200 overflow-hidden group flex items-center justify-center shadow-sm">
        <img
          src={activeImage}
          alt={productName}
          className="w-full h-full object-contain p-6 md:p-8 transition-transform duration-300 group-hover:scale-[1.03]"
          onError={(e) => { (e.target as HTMLImageElement).src = `https://placehold.co/600x600?text=${encodeURIComponent(productName)}`; }}
        />
        <div className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm backdrop-blur">
          <Expand size={14} />
          {activeIndex + 1}/{Math.max(orderedImages.length, 1)}
        </div>
        {orderedImages.length > 1 && (
          <>
            <button
              onClick={prevImage}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 hover:bg-white rounded-full flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronLeft className="text-slate-700" size={24} />
            </button>
            <button
              onClick={nextImage}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 hover:bg-white rounded-full flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronRight className="text-slate-700" size={24} />
            </button>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {orderedImages.length > 1 && (
        <div className="grid grid-flow-col auto-cols-[76px] gap-3 overflow-x-auto pb-2 snap-x">
          {orderedImages.map((img, idx) => (
            <button
              key={img.imageid}
              onClick={() => setActiveIndex(idx)}
              className={`h-[76px] rounded-xl border-2 overflow-hidden bg-white snap-start transition-all ${
                activeIndex === idx ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-200 hover:border-blue-300'
              }`}
            >
              <img src={img.imageurl} alt="" className="w-full h-full object-contain p-2" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
