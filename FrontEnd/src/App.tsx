import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import AuthGuard from '@/components/AuthGuard';
import { useAuth } from '@/features/auth/context/AuthContext';

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

// ── Customer pages ───────────────────────────────────────────────────
const CustomerHome      = lazy(() => import('@/portals/customer/CustomerHome'));
const AuthPage          = lazy(() => import('@/portals/customer/AuthPage'));
const ProductDetailPage = lazy(() => import('@/portals/customer/ProductDetailPage'));
const ProductsListPage  = lazy(() => import('@/portals/customer/ProductsListPage'));
const SearchPage        = lazy(() => import('@/portals/customer/SearchPage'));
const NewsPage          = lazy(() => import('@/portals/customer/NewsPage'));
const PromotionsPage    = lazy(() => import('@/portals/customer/PromotionsPage'));
const CustomerPolicyPage = lazy(() => import('@/portals/customer/CustomerPolicyPage'));
const OrderLookupPage   = lazy(() => import('@/portals/customer/OrderLookupPage'));
const CartPage          = lazy(() => import('@/portals/customer/CartPage'));
const CheckoutPage      = lazy(() => import('@/portals/customer/CheckoutPage'));
const PaymentSimulationPage = lazy(() => import('@/portals/customer/PaymentSimulationPage'));
const ProfilePage       = lazy(() => import('@/portals/customer/ProfilePage'));
const CustomerChat      = lazy(() => import('@/portals/customer/CustomerChat'));
const CustomerReturns   = lazy(() => import('@/portals/customer/CustomerReturns'));
const ForgotPasswordPage = lazy(() => import('@/portals/customer/ForgotPasswordPage'));

// ── Admin pages ───────────────────────────────────────────────────
const AdminDashboard     = lazy(() => import('@/portals/admin/AdminDashboard'));
const AdminProducts      = lazy(() => import('@/portals/admin/AdminProducts'));
const AdminOrders        = lazy(() => import('@/portals/admin/AdminOrders'));
const AdminUsers         = lazy(() => import('@/portals/admin/AdminUsers'));
const AdminRoles         = lazy(() => import('@/portals/admin/AdminRoles'));
const AdminCategoryBrand = lazy(() => import('@/portals/admin/AdminCategoryBrand'));
const AdminCustomers     = lazy(() => import('@/portals/admin/AdminCustomers'));
const AdminVouchers      = lazy(() => import('@/portals/admin/AdminVouchers'));
const AdminWarrantyPackages = lazy(() => import('@/portals/admin/AdminWarrantyPackages'));
const AdminNews          = lazy(() => import('@/portals/admin/AdminNews'));
const AdminPromotionalContents = lazy(() => import('@/portals/admin/AdminPromotionalContents').then(m => ({ default: m.AdminPromotionalContents })));
const AdminHomepageSections = lazy(() => import('@/portals/admin/AdminHomepageSections'));
const AdminAuditLogs     = lazy(() => import('@/portals/admin/AdminAuditLogs'));

// ── Employee portal pages ────────────────────────────────────────────────────
const StaffOrders         = lazy(() => import('@/portals/staff/StaffOrders'));
const SalesOrders         = lazy(() => import('@/portals/staff/SalesOrders'));
const WarehouseOrders     = lazy(() => import('@/portals/staff/WarehouseOrders'));
const StaffInventory      = lazy(() => import('@/portals/staff/StaffInventory'));
const StaffWarranties     = lazy(() => import('@/portals/staff/StaffWarranties'));
const ConsultantChats     = lazy(() => import('@/portals/staff/ConsultantChats'));
const ManagerWorkspace    = lazy(() => import('@/portals/staff/ManagerWorkspace'));
const ContentWorkspace    = lazy(() => import('@/portals/staff/ContentWorkspace'));
const StaffReturns         = lazy(() => import('@/portals/staff/StaffReturns'));
const StaffShipments       = lazy(() => import('@/portals/staff/StaffShipments'));

// ── Misc ─────────────────────────────────────────────────────────────────────
const UnauthorizedPage = lazy(() => import('@/portals/UnauthorizedPage'));

const StaffHomeRedirect = () => {
  const { user } = useAuth();
  const permissions = user?.permissions ?? [];
  if (permissions.includes('*')) return <Navigate to="/admin" replace />;
  const destinations: Array<[string, string]> = [
    ['dashboard.view', '/staff/manager'],
    ['orders.manage', '/staff/sales-orders'],
    ['inventory.manage', '/staff/warehouse-orders'],
    ['warranties.view', '/staff/warranties'],
    ['content.manage', '/staff/content'],
    ['consultations.manage', '/staff/consultations'],
    ['customers.view', '/staff/customers'],
  ];
  return <Navigate to={destinations.find(([permission]) => permissions.includes(permission))?.[1] ?? '/unauthorized'} replace />;
};

const ScrollToTop = () => {
  const { pathname } = useLocation();

  React.useEffect(() => {
    if (pathname === '/chat') return;
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname]);

  return null;
};

// ─────────────────────────────────────────────────────────────────────────────
const App: React.FC = () => {
  return (
    <Suspense fallback={<PageLoader />}>
      <ScrollToTop />
      <Routes>

        {/* ═══ PUBLIC — Customer Portal ════════════════════════════════════ */}
        <Route path="/" element={<CustomerLayout />}>
          <Route index                    element={<CustomerHome />} />
          <Route path="auth/:mode"        element={<AuthPage />} />
          <Route path="forgot-password"   element={<ForgotPasswordPage />} />
          <Route path="products"          element={<ProductsListPage />} />
          <Route path="products/:id"      element={<ProductDetailPage />} />
          <Route path="search"            element={<SearchPage />} />
          <Route path="chat"              element={<CustomerChat />} />
          <Route path="news"              element={<NewsPage />} />
          <Route path="news/:slug"        element={<NewsPage />} />
          <Route path="promotions"        element={<PromotionsPage />} />
          <Route path="policy"            element={<CustomerPolicyPage />} />
          <Route path="shipping"          element={<CustomerPolicyPage />} />
          <Route path="return"            element={<CustomerPolicyPage />} />
          <Route path="cart"              element={<CartPage />} />
          <Route path="checkout"          element={<CheckoutPage />} />
          <Route path="payment/:orderId"  element={<PaymentSimulationPage />} />
          <Route path="profile"           element={<ProfilePage />} />
          <Route path="order-lookup"      element={<OrderLookupPage />} />
          <Route element={<AuthGuard allowedRoles={['Customer']} />}>
            <Route path="returns"         element={<CustomerReturns />} />
          </Route>
        </Route>

        {/* ═══ PROTECTED — Admin ═══════════════════════════════════════════ */}
        <Route element={<AuthGuard allowedRoles={['Admin']} />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index                  element={<AdminDashboard />} />
            <Route path="products"        element={<AdminProducts />} />
            <Route path="orders"          element={<AdminOrders />} />
            <Route path="sales-orders"    element={<SalesOrders />} />
            <Route path="warehouse-orders" element={<WarehouseOrders />} />
            <Route path="inventory"       element={<StaffInventory />} />
            <Route path="warranties"      element={<StaffWarranties />} />
            <Route path="returns"         element={<StaffReturns />} />
            <Route path="shipments"       element={<StaffShipments />} />
            <Route path="users"           element={<AdminUsers />} />
            <Route path="roles"           element={<AdminRoles />} />
            <Route path="customers"       element={<AdminCustomers />} />
            <Route path="categories"      element={<AdminCategoryBrand />} />
            <Route path="brands"          element={<Navigate to="/admin/categories" replace />} />
            <Route path="vouchers"        element={<AdminVouchers />} />
            <Route path="warranty-packages" element={<AdminWarrantyPackages />} />
            <Route path="news"            element={<AdminNews />} />
            <Route path="promotional-contents" element={<AdminPromotionalContents />} />
            <Route path="homepage-sections" element={<AdminHomepageSections />} />
            <Route path="consultations"    element={<ConsultantChats />} />
            <Route path="auditlogs"       element={<AdminAuditLogs />} />
          </Route>
        </Route>

        {/* ═══ PROTECTED — Employee portal ═════════════════════════════════ */}
        <Route element={<AuthGuard allowedPermissions={['dashboard.view', 'orders.view', 'inventory.view', 'warranties.view', 'content.manage', 'consultations.manage', 'customers.view']} />}>
          <Route path="/staff" element={<StaffLayout />}>
            <Route index element={<StaffHomeRedirect />} />

            <Route element={<AuthGuard allowedPermissions={['dashboard.view']} />}>
              <Route path="manager" element={<ManagerWorkspace />} />
              <Route path="dashboard" element={<AdminDashboard />} />
            </Route>
            <Route element={<AuthGuard allowedPermissions={['content.manage']} />}>
              <Route path="content" element={<ContentWorkspace />} />
            </Route>
            <Route element={<AuthGuard allowedPermissions={['products.manage']} />}>
              <Route path="products" element={<AdminProducts />} />
            </Route>
            <Route element={<AuthGuard allowedPermissions={['orders.view']} />}>
              <Route path="orders" element={<StaffOrders />} />
            </Route>
            <Route element={<AuthGuard allowedPermissions={['orders.manage']} />}>
              <Route path="sales-orders" element={<SalesOrders />} />
            </Route>
            <Route element={<AuthGuard allowedPermissions={['inventory.manage']} />}>
              <Route path="warehouse-orders" element={<WarehouseOrders />} />
            </Route>
            <Route element={<AuthGuard allowedPermissions={['inventory.view']} />}>
              <Route path="inventory" element={<StaffInventory />} />
            </Route>
            <Route element={<AuthGuard allowedPermissions={['returns.view', 'shipments.view']} />}>
              <Route path="returns" element={<StaffReturns />} />
              <Route path="shipments" element={<StaffShipments />} />
            </Route>
            <Route element={<AuthGuard allowedPermissions={['warranties.view']} />}>
              <Route path="warranties" element={<StaffWarranties />} />
            </Route>
            <Route element={<AuthGuard allowedPermissions={['customers.view']} />}>
              <Route path="customers" element={<AdminCustomers />} />
            </Route>
            <Route element={<AuthGuard allowedPermissions={['vouchers.manage']} />}>
              <Route path="vouchers" element={<AdminVouchers />} />
            </Route>
            <Route element={<AuthGuard allowedPermissions={['content.manage']} />}>
              <Route path="news" element={<AdminNews />} />
              <Route path="promotional-contents" element={<AdminPromotionalContents />} />
            </Route>
            <Route element={<AuthGuard allowedPermissions={['content.manage']} />}>
              <Route path="homepage-sections" element={<AdminHomepageSections />} />
            </Route>
            <Route element={<AuthGuard allowedPermissions={['consultations.manage']} />}>
              <Route path="consultations" element={<ConsultantChats />} />
            </Route>
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
