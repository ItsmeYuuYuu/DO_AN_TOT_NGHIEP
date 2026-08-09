import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { isAuthenticated, hasPermission, hasRole } from '@/features/auth/utils/authUtils';

interface AuthGuardProps {
  /** Role(s) that are allowed to access this route */
  allowedRoles?: string[];
  allowedPermissions?: string[];
  /** Where to redirect unauthorized users. Defaults to /auth/login */
  redirectTo?: string;
}

/**
 * AuthGuard — wraps protected Route groups.
 *
 * Usage in App.tsx:
 * ```tsx
 * <Route element={<AuthGuard allowedRoles={['Admin']} />}>
 *   <Route path="/admin" element={<AdminLayout />}>
 *     ...
 *   </Route>
 * </Route>
 * ```
 *
 * Logic:
 * 1. Not logged in → redirect to /auth/login (with `from` state for post-login redirect)
 * 2. Logged in but wrong role → redirect to /unauthorized
 * 3. OK → render <Outlet />
 */
const AuthGuard: React.FC<AuthGuardProps> = ({
  allowedRoles,
  allowedPermissions,
  redirectTo = '/auth/login',
}) => {
  const location = useLocation();

  // 1. Not authenticated at all
  if (!isAuthenticated()) {
    return (
      <Navigate
        to={redirectTo}
        state={{ from: location.pathname }}
        replace
      />
    );
  }

  // 2. Authenticated but role not permitted
  const roleAllowed = !allowedRoles?.length || allowedRoles.some(role => hasRole(role));
  const permissionAllowed = !allowedPermissions?.length || allowedPermissions.some(permission => hasPermission(permission));
  if (!roleAllowed || !permissionAllowed) {
    return <Navigate to="/unauthorized" replace />;
  }

  // 3. All good — render child routes
  return <Outlet />;
};

export default AuthGuard;
