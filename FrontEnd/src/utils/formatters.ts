export const formatCurrency = (amount: number, currency = 'VND'): string => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(amount);
};

export const VIETNAM_TIME_ZONE = 'Asia/Ho_Chi_Minh';

export const parseApiDate = (date: string | Date): Date => {
  if (date instanceof Date) return date;

  const value = date.trim();
  const hasExplicitTimeZone = /(?:z|[+-]\d{2}:?\d{2})$/i.test(value);
  const isDateTime = value.includes('T') || value.includes(' ');

  // Legacy PostgreSQL timestamp-without-time-zone responses have no suffix,
  // although application timestamps are stored as UTC.
  return new Date(isDateTime && !hasExplicitTimeZone ? `${value.replace(' ', 'T')}Z` : value);
};

export const formatDate = (date: string | Date): string => {
  return new Intl.DateTimeFormat('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: VIETNAM_TIME_ZONE,
  }).format(parseApiDate(date));
};

export const formatDateTime = (date: string | Date): string => {
  return new Intl.DateTimeFormat('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: VIETNAM_TIME_ZONE,
  }).format(parseApiDate(date));
};

export const formatTime = (date: string | Date): string => {
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: VIETNAM_TIME_ZONE,
  }).format(parseApiDate(date));
};

export const formatDateInput = (date: string | Date): string => {
  const parts = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: VIETNAM_TIME_ZONE,
  }).formatToParts(parseApiDate(date));

  const getPart = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find(part => part.type === type)?.value ?? '';

  return `${getPart('year')}-${getPart('month')}-${getPart('day')}`;
};

export const truncate = (str: string, maxLength = 80): string => {
  return str.length > maxLength ? `${str.substring(0, maxLength)}…` : str;
};

export const generateOrderCode = (id: number): string => {
  return `ORD-${String(id).padStart(6, '0')}`;
};

export const getDiscountPercent = (basePrice?: number | null, salePrice?: number | null): number | null => {
  if (basePrice && salePrice && basePrice > 0 && salePrice < basePrice) {
    return Math.round(((basePrice - salePrice) / basePrice) * 100);
  }
  return null;
};
