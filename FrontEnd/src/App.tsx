import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AuthGuard from '@/components/AuthGuard';

// ── Layouts ───────────────────────────────────────────────────────────────────
import { CustomerLayout } from '@/layouts/CustomerLayout';
import { AdminLayout }    from '@/layouts/AdminLayout';
import { StaffLayout }    from '@/layouts/StaffLayout';

// ── Skeleton loader ───────────────────────────────────────────────────────────
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

// ── Customer pages ────────────────────────────────────────────────────────────
const CustomerHome      = lazy(() => import('@/portals/customer/CustomerHome'));
const LoginPage         = lazy(() => import('@/portals/customer/LoginPage'));
const ProductDetailPage = lazy(() => import('@/portals/customer/ProductDetailPage'));
const CartPage          = lazy(() => import('@/portals/customer/CartPage'));
const CheckoutPage      = lazy(() => import('@/portals/customer/CheckoutPage'));
const ProfilePage       = lazy(() => import('@/portals/customer/ProfilePage'));

// ── Admin pages ───────────────────────────────────────────────────────────────
const AdminDashboard     = lazy(() => import('@/portals/admin/AdminDashboard'));
const AdminProducts      = lazy(() => import('@/portals/admin/AdminProducts'));
const AdminOrders        = lazy(() => import('@/portals/admin/AdminOrders'));
const AdminUsers         = lazy(() => import('@/portals/admin/AdminUsers'));
const AdminCategoryBrand = lazy(() => import('@/portals/admin/AdminCategoryBrand'));
const AdminCustomers     = lazy(() => import('@/portals/admin/AdminCustomers'));

// ── Staff pages ───────────────────────────────────────────────────────────────
const StaffOrders = lazy(() => import('@/portals/staff/StaffOrders'));

// ── Misc ─────────────────────────────────────────────────────────────────────
const UnauthorizedPage = lazy(() => import('@/portals/UnauthorizedPage'));
const PlaceholderPage  = lazy(() => import('@/portals/PlaceholderPage'));

// ─────────────────────────────────────────────────────────────────────────────
const App: React.FC = () => {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>

        {/* ═══ PUBLIC — Customer Portal ════════════════════════════════════ */}
        <Route path="/" element={<CustomerLayout />}>
          <Route index                    element={<CustomerHome />} />
          <Route path="auth/login"        element={<LoginPage />} />
          <Route path="auth/register"     element={<PlaceholderPage />} />
          <Route path="forgot-password"   element={<PlaceholderPage />} />
          <Route path="products"          element={<PlaceholderPage />} />
          <Route path="products/:id"      element={<ProductDetailPage />} />
          <Route path="search"            element={<PlaceholderPage />} />
          <Route path="news"              element={<PlaceholderPage />} />
          <Route path="promotions"        element={<PlaceholderPage />} />
          <Route path="cart"              element={<CartPage />} />
          <Route path="checkout"          element={<CheckoutPage />} />
          <Route path="profile"           element={<ProfilePage />} />
          <Route path="order-lookup"      element={<PlaceholderPage />} />
        </Route>

        {/* ═══ PROTECTED — Admin ═══════════════════════════════════════════ */}
        <Route element={<AuthGuard allowedRoles={['Admin']} />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index                  element={<AdminDashboard />} />
            <Route path="products"        element={<AdminProducts />} />
            <Route path="orders"          element={<AdminOrders />} />
            <Route path="users"           element={<AdminUsers />} />
            <Route path="customers"       element={<AdminCustomers />} />
            <Route path="categories"      element={<AdminCategoryBrand />} />
            <Route path="brands"          element={<Navigate to="/admin/categories" replace />} />
            <Route path="vouchers"        element={<PlaceholderPage />} />
          </Route>
        </Route>

        {/* ═══ PROTECTED — Staff ═══════════════════════════════════════════ */}
        <Route element={<AuthGuard allowedRoles={['Admin', 'Staff']} />}>
          <Route path="/staff" element={<StaffLayout />}>
            <Route index element={<StaffOrders />} />
            <Route path="inventory"       element={<PlaceholderPage />} />
            <Route path="purchase-orders" element={<PlaceholderPage />} />
            <Route path="warranties"      element={<PlaceholderPage />} />
          </Route>
        </Route>

        {/* ═══ Utility ═════════════════════════════════════════════════════ */}
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        <Route path="*"             element={<Navigate to="/" replace />} />

      </Routes>
    </Suspense>
  );
};

export default App;
