import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  clearSession,
  getCurrentUser,
  isAuthenticated,
  type AuthUser,
} from '../utils/authUtils';
import { authApi } from '../api/authApi';

// ─── Types ────────────────────────────────────────────────────────────────────
interface AuthContextValue {
  user: AuthUser | null;
  isLoggedIn: boolean;
  rolename: string | null;
  logout: () => void;
  refreshAuth: () => void; // call after login to sync state
}

// ─── Context ──────────────────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoggedIn: false,
  rolename: null,
  logout: () => {},
  refreshAuth: () => {},
});

// ─── Provider ─────────────────────────────────────────────────────────────────
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
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
    refreshAuth();
  }, [refreshAuth]);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch (error) {
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
