export const formatCurrency = (amount: number, currency = 'VND'): string => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(amount);
};

export const formatDate = (date: string | Date): string => {
  return new Intl.DateTimeFormat('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(date));
};

export const formatDateTime = (date: string | Date): string => {
  return new Intl.DateTimeFormat('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
};

export const truncate = (str: string, maxLength = 80): string => {
  return str.length > maxLength ? `${str.substring(0, maxLength)}…` : str;
};

export const generateOrderCode = (id: number): string => {
  return `ORD-${String(id).padStart(6, '0')}`;
};
