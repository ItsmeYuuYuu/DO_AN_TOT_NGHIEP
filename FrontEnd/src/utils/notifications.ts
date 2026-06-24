type ToastType = 'success' | 'error' | 'info' | 'warning';

const notifyEventName = 'cuong-dien-thoai:notify';
const confirmEventName = 'cuong-dien-thoai:confirm';

export const notify = (message: string, type: ToastType = 'info') => {
  window.dispatchEvent(new CustomEvent(notifyEventName, { detail: { message, type } }));
};

export const notifySuccess = (message: string) => notify(message, 'success');
export const notifyError = (message: string) => notify(message, 'error');
export const notifyWarning = (message: string) => notify(message, 'warning');
export const notifyInfo = (message: string) => notify(message, 'info');

export const confirmAction = (
  message: string,
  options?: {
    title?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    danger?: boolean;
  },
) => {
  return new Promise<boolean>(resolve => {
    window.dispatchEvent(new CustomEvent(confirmEventName, {
      detail: {
        message,
        options,
        resolve,
      },
    }));
  });
};

export const notificationEvents = {
  notify: notifyEventName,
  confirm: confirmEventName,
};
