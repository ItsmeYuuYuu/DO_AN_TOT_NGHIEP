// ─── Auth utility helpers ─────────────────────────────────────────────────────
// Provides a lightweight, dependency-free JWT parser for the frontend.
// NOTE: This does NOT verify the signature — that's the server's job.
//       We only decode the payload to read claims for UI decisions.

export interface AuthUser {
  userid: string;
  username: string;
  fullname: string;
  email: string;
  rolename: string;  // "Admin" | "Staff" | "Customer"
  exp: number;       // expiry timestamp (seconds)
}

export interface StoredSession {
  accessToken: string;
  user: AuthUser;
  expiresAt: number; // ms timestamp
}

const SESSION_KEY = 'ec_session';

// ─── Save ─────────────────────────────────────────────────────────────────────
export function saveSession(token: string, expiresIn: number, userInfo: Omit<AuthUser, 'exp'>): void {
  const expiresAt = Date.now() + expiresIn * 1000;
  const session: StoredSession = {
    accessToken: token,
    user: { ...userInfo, exp: Math.floor(expiresAt / 1000) },
    expiresAt,
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

// ─── Load ─────────────────────────────────────────────────────────────────────
export function getSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session: StoredSession = JSON.parse(raw);
    // Expired?
    if (Date.now() > session.expiresAt) {
      clearSession();
      return null;
    }
    return session;
  } catch {
    clearSession();
    return null;
  }
}

// ─── Clear ────────────────────────────────────────────────────────────────────
export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
  // Also clear old key used before this refactor
  localStorage.removeItem('user');
  localStorage.removeItem('access_token');
}

// ─── Shortcuts ────────────────────────────────────────────────────────────────
export function getAccessToken(): string | null {
  return getSession()?.accessToken ?? null;
}

export function getCurrentUser(): AuthUser | null {
  return getSession()?.user ?? null;
}

export function isAuthenticated(): boolean {
  return getSession() !== null;
}

export function hasRole(role: string): boolean {
  return getCurrentUser()?.rolename === role;
}

export function isAdmin(): boolean   { return hasRole('Admin'); }
export function isStaff(): boolean   { return hasRole('Staff'); }
export function isCustomer(): boolean { return hasRole('Customer'); }
