import axios from 'axios';
import { getAccessToken, clearSession, saveSession } from '@/features/auth/utils/authUtils';
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
    '/auth/refresh',
  ].some(endpoint => url.includes(endpoint));
};

interface RefreshResponse {
  userid: number; username: string; fullname: string; email?: string; phone?: string;
  roleid?: number; rolename: string; roleids?: number[]; rolenames?: string[];
  permissions?: string[]; accessToken: string; expiresIn: number;
}

let refreshRequest: Promise<RefreshResponse> | null = null;

const renewAccessToken = () => {
  if (!refreshRequest) {
    refreshRequest = axios.post<RefreshResponse>(`${API_BASE_URL}/auth/refresh`, {}, { withCredentials: true })
      .then(response => {
        const user = response.data;
        saveSession(user.accessToken, user.expiresIn, {
          userid: String(user.userid), username: user.username, fullname: user.fullname,
          email: user.email ?? user.username, phone: user.phone, rolename: user.rolename,
          roleids: user.roleids ?? (user.roleid ? [user.roleid] : []),
          rolenames: user.rolenames ?? [user.rolename], permissions: user.permissions ?? [],
        });
        return user;
      })
      .finally(() => { refreshRequest = null; });
  }
  return refreshRequest;
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
  withCredentials: true,
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
  async (error) => {
    const original = error.config as (typeof error.config & { _retry?: boolean });
    if (error.response?.status === 401 && !isAuthenticationRequest(original?.url) && !original?._retry) {
      if (error.response?.data?.code === 'STAFF_SESSION_REPLACED') {
        sessionStorage.setItem(
          'ec_auth_notice',
          error.response.data.message ||
            'Phiên đăng nhập đã được mở trên thiết bị khác. Vui lòng đăng nhập lại.',
        );
        clearSession();
        window.location.href = '/auth/login';
        return Promise.reject(error);
      }
      original._retry = true;
      try {
        const refreshed = await renewAccessToken();
        original.headers.Authorization = `Bearer ${refreshed.accessToken}`;
        return apiClient(original);
      } catch (refreshError) {
        if (axios.isAxiosError(refreshError) && refreshError.response?.data?.code === 'STAFF_SESSION_REPLACED') {
          sessionStorage.setItem('ec_auth_notice', refreshError.response.data.message);
        }
        clearSession();
        window.location.href = '/auth/login';
      }
    }
    return Promise.reject(error);
  },
);

export default apiClient;
