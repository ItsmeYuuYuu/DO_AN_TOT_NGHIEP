import { useState, useEffect } from 'react';

interface AuthUser {
  userid: number;
  username: string;
  fullname: string;
  email: string;
  roleid: number;
}

export const useAuth = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const raw = localStorage.getItem('auth_user');
    if (raw) {
      try { setUser(JSON.parse(raw)); } catch { /* ignore */ }
    }
    setIsLoading(false);
  }, []);

  const login = (userData: AuthUser, token: string) => {
    localStorage.setItem('access_token', token);
    localStorage.setItem('auth_user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('auth_user');
    setUser(null);
  };

  const isAdmin = () => user?.roleid === 1;
  const isStaff = () => user?.roleid === 2;
  const isCustomer = () => user?.roleid === 3;

  return { user, isLoading, login, logout, isAdmin, isStaff, isCustomer };
};
