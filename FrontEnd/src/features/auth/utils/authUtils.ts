// ─── Auth utility helpers ─────────────────────────────────────────────────────
// Provides a lightweight, dependency-free JWT parser for the frontend.
// NOTE: This does NOT verify the signature — that's the server's job.
//       We only decode the payload to read claims for UI decisions.

export interface AuthUser {
  userid: string;
  username: string;
  fullname: string;
  email: string;
  phone?: string;
  rolename: string;
  roleids?: number[];
  rolenames?: string[];
  permissions?: string[];
  exp: number;       // expiry timestamp (seconds)
}

export interface StoredSession {
  accessToken: string;
  user: AuthUser;
  expiresAt: number; // ms timestamp
}

const SESSION_KEY = 'ec_session';

const legacyPermissionsByRole: Record<string, string[]> = {
  Admin: ['*'],
  Manager: ['dashboard.view', 'customers.view', 'customers.manage-account', 'orders.view', 'orders.manage', 'orders.assign', 'inventory.view', 'inventory.manage', 'shipments.view', 'shipments.manage', 'returns.view', 'returns.review', 'returns.receive', 'returns.manage', 'warranties.view', 'warranties.manage', 'products.manage', 'catalog.manage', 'content.manage', 'vouchers.manage', 'consultations.manage', 'reviews.manage', 'email.test'],
  Sales: ['customers.view', 'orders.view', 'orders.manage', 'orders.assign', 'shipments.view', 'returns.view', 'returns.review', 'returns.manage'],
  Warehouse: ['inventory.view', 'inventory.manage', 'products.manage', 'orders.view', 'orders.assign', 'shipments.view', 'shipments.manage', 'returns.view', 'returns.receive'],
  Warranty: ['customers.view', 'orders.view', 'inventory.view', 'warranties.view', 'warranties.manage'],
  Content: ['products.manage', 'catalog.manage', 'content.manage'],
  Consultant: ['customers.view', 'orders.view', 'inventory.view', 'warranties.view', 'consultations.manage'],
  Customer: [],
};

const normalizeUserAccess = <T extends Omit<AuthUser, 'exp'> | AuthUser>(user: T): T => {
  const rolenames = user.rolenames?.length ? user.rolenames : [user.rolename];
  const permissions = user.permissions?.length
    ? user.permissions
    : [...new Set(rolenames.flatMap(role => legacyPermissionsByRole[role] ?? []))];
  return { ...user, rolenames, permissions };
};

// ─── Save ─────────────────────────────────────────────────────────────────────
export function saveSession(token: string, expiresIn: number, userInfo: Omit<AuthUser, 'exp'>): void {
  const expiresAt = Date.now() + expiresIn * 1000;
  const session: StoredSession = {
    accessToken: token,
    user: { ...normalizeUserAccess(userInfo), exp: Math.floor(expiresAt / 1000) },
    expiresAt,
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function updateStoredUser(userInfo: Partial<Omit<AuthUser, 'exp'>>): void {
  const session = getSession();
  if (!session) return;

  const updatedSession: StoredSession = {
    ...session,
    user: {
      ...session.user,
      ...userInfo,
    },
  };

  localStorage.setItem(SESSION_KEY, JSON.stringify(updatedSession));
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
    session.user = normalizeUserAccess(session.user);
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
  const user = getCurrentUser();
  return user?.rolename === role || user?.rolenames?.includes(role) === true;
}

export function hasPermission(permission: string): boolean {
  const permissions = getCurrentUser()?.permissions ?? [];
  return permissions.includes('*') || permissions.includes(permission);
}

export function isAdmin(): boolean   { return hasRole('Admin'); }
export function isCustomer(): boolean { return hasRole('Customer'); }
