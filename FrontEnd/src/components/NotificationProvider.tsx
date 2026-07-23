import React, { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/Button';
import { notificationEvents } from '@/utils/notifications';

type ToastType = 'success' | 'error' | 'info' | 'warning';

type Toast = {
  id: number;
  type: ToastType;
  message: string;
};

type ConfirmState = {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  danger: boolean;
  resolve: (confirmed: boolean) => void;
} | null;

let toastId = 1;

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmState>(null);

  const removeToast = useCallback((id: number) => {
    setToasts(current => current.filter(toast => toast.id !== id));
  }, []);

  const notify = useCallback((message: string, type: ToastType = 'info') => {
    const id = toastId++;
    setToasts(current => [...current, { id, type, message }]);
    window.setTimeout(() => removeToast(id), 3600);
  }, [removeToast]);

  const closeConfirm = (confirmed: boolean) => {
    confirmState?.resolve(confirmed);
    setConfirmState(null);
  };

  useEffect(() => {
    const handleNotify = (event: Event) => {
      const detail = (event as CustomEvent<{ message: string; type?: ToastType }>).detail;
      if (detail?.message) {
        notify(detail.message, detail.type);
      }
    };

    const handleConfirm = (event: Event) => {
      const detail = (event as CustomEvent<{
        message: string;
        options?: {
          title?: string;
          confirmLabel?: string;
          cancelLabel?: string;
          danger?: boolean;
        };
        resolve: (confirmed: boolean) => void;
      }>).detail;
      if (!detail?.message || !detail.resolve) return;

      setConfirmState({
        title: detail.options?.title ?? 'Xác nhận thao tác',
        message: detail.message,
        confirmLabel: detail.options?.confirmLabel ?? 'Xác nhận',
        cancelLabel: detail.options?.cancelLabel ?? 'Hủy',
        danger: detail.options?.danger ?? false,
        resolve: detail.resolve,
      });
    };

    window.addEventListener(notificationEvents.notify, handleNotify);
    window.addEventListener(notificationEvents.confirm, handleConfirm);
    return () => {
      window.removeEventListener(notificationEvents.notify, handleNotify);
      window.removeEventListener(notificationEvents.confirm, handleConfirm);
    };
  }, [notify]);

  return (
    <>
      {children}

      <div className="fixed right-4 top-4 z-[70] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-3">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`rounded-2xl border bg-white px-4 py-3 text-sm font-semibold shadow-xl shadow-slate-900/10 ${
              toast.type === 'success' ? 'border-emerald-200 text-emerald-700' :
              toast.type === 'error' ? 'border-red-200 text-red-700' :
              toast.type === 'warning' ? 'border-amber-200 text-amber-700' :
              'border-blue-200 text-blue-700'
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>

      {confirmState && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm" onClick={() => closeConfirm(false)} />
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Cuồng Điện Thoại</p>
            <h2 className="mt-2 text-xl font-black text-slate-950">{confirmState.title}</h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-600">{confirmState.message}</p>
            <div className="mt-6 flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => closeConfirm(false)}>
                {confirmState.cancelLabel}
              </Button>
              <Button
                type="button"
                variant={confirmState.danger ? 'danger' : 'primary'}
                onClick={() => closeConfirm(true)}
              >
                {confirmState.confirmLabel}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
