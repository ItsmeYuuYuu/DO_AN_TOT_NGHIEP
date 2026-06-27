import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Expand, X } from 'lucide-react';

interface ProductGalleryProps {
  productName: string;
  images: { imageid: number; imageurl: string; ismain: boolean }[];
}

export const ProductGallery: React.FC<ProductGalleryProps> = ({ productName, images }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const orderedImages = [...images].sort((a, b) => Number(b.ismain) - Number(a.ismain));

  // Reset to first image when variant changes (images array changes)
  useEffect(() => {
    setActiveIndex(0);
    setIsViewerOpen(false);
  }, [images]);

  const activeImage = orderedImages[activeIndex]?.imageurl || `https://placehold.co/600x600?text=${encodeURIComponent(productName)}`;

  const imageCount = Math.max(1, orderedImages.length);

  const nextImage = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % imageCount);
  }, [imageCount]);

  const prevImage = useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + imageCount) % imageCount);
  }, [imageCount]);

  useEffect(() => {
    if (!isViewerOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsViewerOpen(false);
      if (event.key === 'ArrowRight' && orderedImages.length > 1) nextImage();
      if (event.key === 'ArrowLeft' && orderedImages.length > 1) prevImage();
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isViewerOpen, orderedImages.length, nextImage, prevImage]);

  return (
    <div className="flex flex-col gap-4">
      {/* Main Image */}
      <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.08)] group">
        <button
          type="button"
          onClick={() => setIsViewerOpen(true)}
          className="h-full w-full"
          aria-label="Phóng to ảnh sản phẩm"
        >
          <img
            src={activeImage}
            alt={productName}
            className="w-full h-full object-contain p-6 md:p-8 transition-transform duration-300 group-hover:scale-[1.03]"
            onError={(e) => { (e.target as HTMLImageElement).src = `https://placehold.co/600x600?text=${encodeURIComponent(productName)}`; }}
          />
        </button>
        <button
          type="button"
          onClick={() => setIsViewerOpen(true)}
          className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm backdrop-blur transition hover:bg-[#1f2937] hover:text-white"
          aria-label="Xem ảnh sản phẩm ở kích thước lớn"
        >
          <Expand size={14} />
          {activeIndex + 1}/{Math.max(orderedImages.length, 1)}
        </button>
        {orderedImages.length > 1 && (
          <>
            <button
              type="button"
              onClick={prevImage}
              className="absolute left-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 opacity-0 shadow-md transition-opacity hover:bg-white group-hover:opacity-100"
              aria-label="Ảnh trước"
            >
              <ChevronLeft className="text-slate-700" size={24} />
            </button>
            <button
              type="button"
              onClick={nextImage}
              className="absolute right-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 opacity-0 shadow-md transition-opacity hover:bg-white group-hover:opacity-100"
              aria-label="Ảnh tiếp theo"
            >
              <ChevronRight className="text-slate-700" size={24} />
            </button>
          </>
        )}
      </div>

      {isViewerOpen && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Xem ảnh sản phẩm"
          onClick={() => setIsViewerOpen(false)}
        >
          <button
            type="button"
            onClick={() => setIsViewerOpen(false)}
            className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/12 text-white transition hover:bg-white hover:text-[#1f2937]"
            aria-label="Đóng ảnh"
          >
            <X size={22} />
          </button>

          <div className="absolute left-4 top-4 rounded-full bg-white/12 px-4 py-2 text-sm font-black text-white">
            {activeIndex + 1}/{Math.max(orderedImages.length, 1)}
          </div>

          {orderedImages.length > 1 && (
            <>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  prevImage();
                }}
                className="absolute left-4 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/12 text-white transition hover:bg-white hover:text-[#1f2937]"
                aria-label="Ảnh trước"
              >
                <ChevronLeft size={28} />
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  nextImage();
                }}
                className="absolute right-4 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/12 text-white transition hover:bg-white hover:text-[#1f2937]"
                aria-label="Ảnh tiếp theo"
              >
                <ChevronRight size={28} />
              </button>
            </>
          )}

          <img
            src={activeImage}
            alt={productName}
            className="max-h-[88vh] max-w-[92vw] object-contain"
            onClick={(event) => event.stopPropagation()}
            onError={(e) => { (e.target as HTMLImageElement).src = `https://placehold.co/900x900?text=${encodeURIComponent(productName)}`; }}
          />
        </div>
      )}

      {/* Thumbnails */}
      {orderedImages.length > 1 && (
        <div className="grid grid-flow-col auto-cols-[76px] gap-3 overflow-x-auto pb-2 snap-x">
          {orderedImages.map((img, idx) => (
            <button
              key={img.imageid}
              onClick={() => setActiveIndex(idx)}
              className={`h-[76px] snap-start overflow-hidden rounded-xl border bg-white transition-all ${
                activeIndex === idx ? 'border-[#e30613] ring-4 ring-[#e30613]/10' : 'border-slate-200 hover:border-[#e30613]/40'
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
