const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const getApiOrigin = (): string => {
  if (API_BASE_URL.startsWith('http://') || API_BASE_URL.startsWith('https://')) {
    return new URL(API_BASE_URL).origin;
  }

  return window.location.origin;
};

/**
 * Keeps uploaded media portable between local development and production.
 * Older rows may contain an absolute localhost URL; only its /uploads path is
 * retained and served from the API origin configured for the current build.
 */
export const resolveMediaUrl = (value: string): string => {
  if (!value) return value;

  try {
    const url = new URL(value, window.location.origin);
    if (!url.pathname.startsWith('/uploads/')) return value;

    return `${getApiOrigin()}${url.pathname}${url.search}${url.hash}`;
  } catch {
    return value;
  }
};

export const resolveMediaUrlsDeep = <T>(value: T): T => {
  if (typeof value === 'string') {
    return resolveMediaUrl(value) as T;
  }

  if (Array.isArray(value)) {
    return value.map(item => resolveMediaUrlsDeep(item)) as T;
  }

  if (
    value &&
    typeof value === 'object' &&
    Object.getPrototypeOf(value) === Object.prototype
  ) {
    const entries = Object.entries(value as Record<string, unknown>)
      .map(([key, item]) => [key, resolveMediaUrlsDeep(item)]);
    return Object.fromEntries(entries) as T;
  }

  return value;
};
