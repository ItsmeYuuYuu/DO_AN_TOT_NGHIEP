import axios from 'axios';
import { getAccessToken, clearSession } from '@/features/auth/utils/authUtils';
import { resolveMediaUrlsDeep } from '@/utils/mediaUrl';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
const GUEST_CHECKOUT_TOKEN_KEY = 'ec_guest_checkout_token';

// Authentication forms must receive their 401 response so they can show a
// validation message without the global session-expired redirect reloading
// the page (for example, when a user enters an incorrect password).
const isAuthenticationRequest = (url?: string) => {
  if (!url) return false;
  return [
    '/auth/login',
    '/auth/register',
    '/auth/registration-code',
    '/auth/forgot-password',
    '/auth/reset-password',
  ].some(endpoint => url.includes(endpoint));
};

function getGuestCheckoutToken(): string {
  let token = localStorage.getItem(GUEST_CHECKOUT_TOKEN_KEY);
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem(GUEST_CHECKOUT_TOKEN_KEY, token);
  }
  return token;
}

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000,
});

// ── Request interceptor — attach JWT Bearer token ─────────────────────────────
apiClient.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    config.headers['x-guest-session-token'] = getGuestCheckoutToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ── Response interceptor — handle 401 globally ────────────────────────────────
apiClient.interceptors.response.use(
  (response) => {
    response.data = resolveMediaUrlsDeep(response.data);
    return response;
  },
  (error) => {
    if (error.response?.status === 401 && !isAuthenticationRequest(error.config?.url)) {
      if (error.response?.data?.code === 'STAFF_SESSION_REPLACED') {
        sessionStorage.setItem(
          'ec_auth_notice',
          error.response.data.message ||
            'Phiên đăng nhập đã được mở trên thiết bị khác. Vui lòng đăng nhập lại.',
        );
      }
      // Token expired or invalid — clear session and redirect to login
      clearSession();
      window.location.href = '/auth/login';
    }
    return Promise.reject(error);
  },
);

export default apiClient;
