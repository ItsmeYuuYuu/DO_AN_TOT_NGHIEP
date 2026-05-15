import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AuthGuard from '@/components/AuthGuard';

// ── Layouts ───────────────────────────────────────────────────────────────────
import { CustomerLayout } from '@/layouts/CustomerLayout';
import { AdminLayout }    from '@/layouts/AdminLayout';
import { StaffLayout }    from '@/layouts/StaffLayout';

// ── Page loader skeleton ──────────────────────────────────────────────────────
const PageLoader = () => (
  <div className="min-h-screen bg-slate-50 flex items-center justify-center">
    <div className="space-y-3 w-full max-w-2xl px-8">
      <div className="skeleton h-8 w-1/3 rounded-lg" />
      <div className="skeleton h-4 w-2/3 rounded" />
      <div className="skeleton h-48 w-full rounded-xl mt-4" />
      <div className="grid grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-24 rounded-xl" />)}
      </div>
    </div>
  </div>
);

// ── Lazy pages ────────────────────────────────────────────────────────────────
// Customer
const CustomerHome    = lazy(() => import('@/portals/customer/CustomerHome'));
const LoginPage       = lazy(() => import('@/portals/customer/LoginPage'));

// Admin
const AdminDashboard     = lazy(() => import('@/portals/admin/AdminDashboard'));
const AdminProducts      = lazy(() => import('@/portals/admin/AdminProducts'));
const AdminOrders        = lazy(() => import('@/portals/admin/AdminOrders'));
const AdminUsers         = lazy(() => import('@/portals/admin/AdminUsers'));
const AdminCategoryBrand = lazy(() => import('@/portals/admin/AdminCategoryBrand'));
const AdminCustomers     = lazy(() => import('@/portals/admin/AdminCustomers'));

// Staff
const StaffOrders = lazy(() => import('@/portals/staff/StaffOrders'));

// Misc
const UnauthorizedPage = lazy(() => import('@/portals/UnauthorizedPage'));

// ── App ───────────────────────────────────────────────────────────────────────
const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>

          {/* ═══ PUBLIC — Customer Portal ════════════════════════════════════ */}
          <Route path="/" element={<CustomerLayout />}>
            <Route index element={<CustomerHome />} />
            <Route path="auth/login" element={<LoginPage />} />
            {/* TODO: /products/:id, /cart, /checkout, /account/orders */}
          </Route>

          {/* ═══ PROTECTED — Admin (role: Admin only) ════════════════════════ */}
          <Route element={<AuthGuard allowedRoles={['Admin']} />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="products"   element={<AdminProducts />} />
              <Route path="orders"     element={<AdminOrders />} />
              <Route path="users"      element={<AdminUsers />} />
              <Route path="customers"  element={<AdminCustomers />} />
              <Route path="categories" element={<AdminCategoryBrand />} />
              <Route path="brands"     element={<Navigate to="/admin/categories" replace />} />
            </Route>
          </Route>

          {/* ═══ PROTECTED — Staff (role: Admin or Staff) ════════════════════ */}
          <Route element={<AuthGuard allowedRoles={['Admin', 'Staff']} />}>
            <Route path="/staff" element={<StaffLayout />}>
              <Route index element={<StaffOrders />} />
              {/* TODO: /staff/inventory, /staff/purchase-orders */}
            </Route>
          </Route>

          {/* ═══ Utility routes ══════════════════════════════════════════════ */}
          <Route path="/unauthorized" element={<UnauthorizedPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />

        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};

export default App;
