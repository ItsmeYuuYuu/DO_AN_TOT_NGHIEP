import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Image as ImageIcon, LoaderCircle, Minus, Plus, RotateCcw, X } from 'lucide-react';

interface ImagePositionEditorProps {
  files: File[];
  aspectRatio?: number;
  outputWidth?: number;
  outputHeight?: number;
  backgroundColor?: string | null;
  title?: string;
  onCancel: () => void;
  onComplete: (files: File[]) => void | Promise<void>;
}

interface Point {
  x: number;
  y: number;
}

const WEBP_QUALITY = 0.9;

const fileToImage = (file: File): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Không thể đọc hình ảnh.'));
    };
    image.src = url;
  });

const canvasToFile = (
  canvas: HTMLCanvasElement,
  sourceFile: File,
): Promise<File> =>
  new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (!blob) {
        reject(new Error('Không thể xử lý hình ảnh.'));
        return;
      }

      const baseName = sourceFile.name.replace(/\.[^.]+$/, '') || 'image';
      resolve(new File([blob], `${baseName}-framed.webp`, {
        type: 'image/webp',
        lastModified: Date.now(),
      }));
    }, 'image/webp', WEBP_QUALITY);
  });

export const ImagePositionEditor: React.FC<ImagePositionEditorProps> = ({
  files,
  aspectRatio = 1,
  outputWidth = 1200,
  outputHeight = 1200,
  backgroundColor = null,
  title = 'Căn chỉnh hình ảnh',
  onCancel,
  onComplete,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const dragStartRef = useRef<Point | null>(null);
  const offsetStartRef = useRef<Point>({ x: 0, y: 0 });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [processedFiles, setProcessedFiles] = useState<File[]>([]);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const [loadingImage, setLoadingImage] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const currentFile = files[currentIndex];
  const previewWidth = 680;
  const previewHeight = Math.round(previewWidth / aspectRatio);

  const progressLabel = useMemo(
    () => files.length > 1 ? `Ảnh ${currentIndex + 1}/${files.length}` : 'Xem trước',
    [currentIndex, files.length],
  );

  useEffect(() => {
    let cancelled = false;
    setLoadingImage(true);
    setError('');
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    imageRef.current = null;

    if (!currentFile) return;

    void fileToImage(currentFile)
      .then(image => {
        if (!cancelled) imageRef.current = image;
      })
      .catch(() => {
        if (!cancelled) setError('Không thể đọc hình ảnh đã chọn.');
      })
      .finally(() => {
        if (!cancelled) setLoadingImage(false);
      });

    return () => {
      cancelled = true;
    };
  }, [currentFile]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image || loadingImage) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    canvas.width = previewWidth;
    canvas.height = previewHeight;
    context.clearRect(0, 0, canvas.width, canvas.height);
    if (backgroundColor) {
      context.fillStyle = backgroundColor;
      context.fillRect(0, 0, canvas.width, canvas.height);
    }

    const fitScale = Math.min(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight);
    const scale = fitScale * zoom;
    const drawWidth = image.naturalWidth * scale;
    const drawHeight = image.naturalHeight * scale;
    const drawX = (canvas.width - drawWidth) / 2 + offset.x;
    const drawY = (canvas.height - drawHeight) / 2 + offset.y;
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(image, drawX, drawY, drawWidth, drawHeight);
  }, [backgroundColor, loadingImage, offset, previewHeight, zoom]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const resetPosition = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStartRef.current = { x: event.clientX, y: event.clientY };
    offsetStartRef.current = offset;
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragStartRef.current) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const xScale = event.currentTarget.width / bounds.width;
    const yScale = event.currentTarget.height / bounds.height;
    setOffset({
      x: offsetStartRef.current.x + (event.clientX - dragStartRef.current.x) * xScale,
      y: offsetStartRef.current.y + (event.clientY - dragStartRef.current.y) * yScale,
    });
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragStartRef.current = null;
  };

  const exportCurrentImage = async () => {
    const image = imageRef.current;
    if (!image || !currentFile) return null;

    const canvas = document.createElement('canvas');
    canvas.width = outputWidth;
    canvas.height = outputHeight;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Trình duyệt không hỗ trợ xử lý ảnh.');

    if (backgroundColor) {
      context.fillStyle = backgroundColor;
      context.fillRect(0, 0, outputWidth, outputHeight);
    }
    const fitScale = Math.min(outputWidth / image.naturalWidth, outputHeight / image.naturalHeight);
    const scale = fitScale * zoom;
    const xRatio = outputWidth / previewWidth;
    const yRatio = outputHeight / previewHeight;
    const drawWidth = image.naturalWidth * scale;
    const drawHeight = image.naturalHeight * scale;
    const drawX = (outputWidth - drawWidth) / 2 + offset.x * xRatio;
    const drawY = (outputHeight - drawHeight) / 2 + offset.y * yRatio;
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(image, drawX, drawY, drawWidth, drawHeight);
    return canvasToFile(canvas, currentFile);
  };

  const handleConfirm = async () => {
    setSaving(true);
    setError('');
    try {
      const framedFile = await exportCurrentImage();
      if (!framedFile) return;
      const nextFiles = [...processedFiles, framedFile];

      if (currentIndex < files.length - 1) {
        setProcessedFiles(nextFiles);
        setCurrentIndex(index => index + 1);
      } else {
        await onComplete(nextFiles);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể xử lý hình ảnh.');
    } finally {
      setSaving(false);
    }
  };

  if (!currentFile) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <div className="max-h-[96vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{title}</h2>
            <p className="mt-1 text-xs text-slate-500">
              Kéo ảnh để đổi vị trí, dùng thanh phóng to để chọn khung hiển thị.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
            aria-label="Đóng trình căn ảnh"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-5 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3 text-xs font-semibold text-slate-500">
            <span className="truncate">{currentFile.name}</span>
            <span className="shrink-0 rounded-full bg-red-50 px-3 py-1 text-[#c4000b]">{progressLabel}</span>
          </div>

          <div className="flex min-h-72 items-center justify-center overflow-hidden rounded-2xl bg-[linear-gradient(45deg,#f1f5f9_25%,transparent_25%),linear-gradient(-45deg,#f1f5f9_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f1f5f9_75%),linear-gradient(-45deg,transparent_75%,#f1f5f9_75%)] bg-[length:24px_24px] bg-[position:0_0,0_12px,12px_-12px,-12px_0] p-3">
            {loadingImage ? (
              <LoaderCircle className="animate-spin text-[#e30613]" size={32} />
            ) : error ? (
              <div className="flex items-center gap-2 text-sm font-semibold text-red-600">
                <ImageIcon size={20} /> {error}
              </div>
            ) : (
              <canvas
                ref={canvasRef}
                style={{ aspectRatio: String(aspectRatio) }}
                className="block h-auto max-h-[58vh] w-auto max-w-full cursor-grab touch-none rounded-xl border border-slate-300 bg-white shadow-lg active:cursor-grabbing"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
              />
            )}
          </div>

          <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center">
            <div className="flex flex-1 items-center gap-3">
              <Minus size={18} className="text-slate-500" />
              <input
                type="range"
                min="0.65"
                max="3"
                step="0.01"
                value={zoom}
                onChange={event => setZoom(Number(event.target.value))}
                className="h-2 w-full accent-[#e30613]"
                aria-label="Mức phóng to hình ảnh"
              />
              <Plus size={18} className="text-slate-500" />
              <span className="w-14 text-right text-xs font-bold text-slate-700">
                {Math.round(zoom * 100)}%
              </span>
            </div>
            <button
              type="button"
              onClick={resetPosition}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-red-300 hover:text-[#c4000b]"
            >
              <RotateCcw size={16} /> Đặt lại
            </button>
          </div>

          {error && !loadingImage && (
            <p className="text-sm font-medium text-red-600">{error}</p>
          )}

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onCancel}
              disabled={saving}
              className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={() => { void handleConfirm(); }}
              disabled={saving || loadingImage || Boolean(error)}
              className="inline-flex min-w-36 items-center justify-center gap-2 rounded-xl bg-[#e30613] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#c4000b] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving && <LoaderCircle size={16} className="animate-spin" />}
              {currentIndex < files.length - 1 ? 'Xong, ảnh kế tiếp' : 'Dùng ảnh này'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
