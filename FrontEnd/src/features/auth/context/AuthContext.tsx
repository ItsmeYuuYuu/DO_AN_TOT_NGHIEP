import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
  clearSession,
  getCurrentUser,
  isAuthenticated,
  saveSession,
  type AuthUser,
} from '../utils/authUtils';
import { authApi } from '../api/authApi';

// ─── Types ────────────────────────────────────────────────────────────────────
interface AuthContextValue {
  user: AuthUser | null;
  isLoggedIn: boolean;
  rolename: string | null;
  isInitializing: boolean;
  logout: () => void;
  refreshAuth: () => void; // call after login to sync state
}

// ─── Context ──────────────────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoggedIn: false,
  rolename: null,
  isInitializing: true,
  logout: () => {},
  refreshAuth: () => {},
});

// ─── Provider ─────────────────────────────────────────────────────────────────
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const navigate = useNavigate();

  // Sync state from localStorage (called on mount + after login)
  const refreshAuth = useCallback(() => {
    if (isAuthenticated()) {
      setUser(getCurrentUser());
    } else {
      setUser(null);
    }
  }, []);

  // Run once on app start
  useEffect(() => {
    let active = true;
    if (isAuthenticated()) {
      refreshAuth();
      setIsInitializing(false);
      return () => { active = false; };
    }
    void authApi.refresh().then(response => {
      if (!active) return;
      const next = response.data;
      saveSession(next.accessToken, next.expiresIn, {
        userid: String(next.userid), username: next.username, fullname: next.fullname,
        email: next.email ?? next.username, phone: next.phone, rolename: next.rolename,
        roleids: next.roleids ?? (next.roleid ? [next.roleid] : []),
        rolenames: next.rolenames ?? [next.rolename], permissions: next.permissions ?? [],
      });
      refreshAuth();
    }).catch(error => {
      if (!active) return;
      setUser(null);
      if (axios.isAxiosError(error) && error.response?.data?.code === 'STAFF_SESSION_REPLACED') {
        sessionStorage.setItem('ec_auth_notice', error.response.data.message);
      }
    })
      .finally(() => { if (active) setIsInitializing(false); });
    return () => { active = false; };
  }, [refreshAuth]);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      console.warn('Logout API failed or endpoint missing, clearing local session anyway.');
    }
    const role = user?.rolename;
    clearSession();
    setUser(null);
    // Role-based redirect after logout
    if (role && role !== 'Customer') {
      navigate('/auth/login');
    } else {
      navigate('/');
    }
  }, [user, navigate]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoggedIn: user !== null,
        rolename: user?.rolename ?? null,
        isInitializing,
        logout,
        refreshAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────
export const useAuth = () => useContext(AuthContext);
