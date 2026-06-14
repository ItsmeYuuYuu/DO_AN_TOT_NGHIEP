import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
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
const LoginPage         = lazy(() => import('@/portals/customer/LoginPage'));
const ProductDetailPage = lazy(() => import('@/portals/customer/ProductDetailPage'));
const ProductsListPage  = lazy(() => import('@/portals/customer/ProductsListPage'));
const SearchPage        = lazy(() => import('@/portals/customer/SearchPage'));
const NewsPage          = lazy(() => import('@/portals/customer/NewsPage'));
const PromotionsPage    = lazy(() => import('@/portals/customer/PromotionsPage'));
const OrderLookupPage   = lazy(() => import('@/portals/customer/OrderLookupPage'));
const CartPage          = lazy(() => import('@/portals/customer/CartPage'));
const CheckoutPage      = lazy(() => import('@/portals/customer/CheckoutPage'));
const PaymentSimulationPage = lazy(() => import('@/portals/customer/PaymentSimulationPage'));
const ProfilePage       = lazy(() => import('@/portals/customer/ProfilePage'));
const CustomerChat      = lazy(() => import('@/portals/customer/CustomerChat'));
const CustomerReturns   = lazy(() => import('@/portals/customer/CustomerReturns'));
// Batch 2 — Auth (wired after Batch 2 is done)
const RegisterPage      = lazy(() => import('@/portals/customer/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('@/portals/customer/ForgotPasswordPage'));

// ── Admin pages ───────────────────────────────────────────────────
const AdminDashboard     = lazy(() => import('@/portals/admin/AdminDashboard'));
const AdminProducts      = lazy(() => import('@/portals/admin/AdminProducts'));
const AdminOrders        = lazy(() => import('@/portals/admin/AdminOrders'));
const AdminUsers         = lazy(() => import('@/portals/admin/AdminUsers'));
const AdminCategoryBrand = lazy(() => import('@/portals/admin/AdminCategoryBrand'));
const AdminCustomers     = lazy(() => import('@/portals/admin/AdminCustomers'));
const AdminVouchers      = lazy(() => import('@/portals/admin/AdminVouchers'));
const AdminWarrantyPackages = lazy(() => import('@/portals/admin/AdminWarrantyPackages'));
const AdminNews          = lazy(() => import('@/portals/admin/AdminNews'));
const AdminPromotionalContents = lazy(() => import('@/portals/admin/AdminPromotionalContents').then(m => ({ default: m.AdminPromotionalContents })));
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
  const destinations: Record<string, string> = {
    Manager: '/staff/manager',
    Sales: '/staff/sales-orders',
    Warehouse: '/staff/warehouse-orders',
    Warranty: '/staff/warranties',
    Content: '/staff/content',
    Consultant: '/staff/consultations',
  };
  return <Navigate to={destinations[user?.rolename ?? ''] ?? '/unauthorized'} replace />;
};

// ─────────────────────────────────────────────────────────────────────────────
const App: React.FC = () => {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>

        {/* ═══ PUBLIC — Customer Portal ════════════════════════════════════ */}
        <Route path="/" element={<CustomerLayout />}>
          <Route index                    element={<CustomerHome />} />
          <Route path="auth/login"        element={<LoginPage />} />
          <Route path="auth/register"     element={<RegisterPage />} />
          <Route path="forgot-password"   element={<ForgotPasswordPage />} />
          <Route path="products"          element={<ProductsListPage />} />
          <Route path="products/:id"      element={<ProductDetailPage />} />
          <Route path="search"            element={<SearchPage />} />
          <Route path="chat"              element={<CustomerChat />} />
          <Route path="news"              element={<NewsPage />} />
          <Route path="promotions"        element={<PromotionsPage />} />
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
            <Route path="customers"       element={<AdminCustomers />} />
            <Route path="categories"      element={<AdminCategoryBrand />} />
            <Route path="brands"          element={<Navigate to="/admin/categories" replace />} />
            <Route path="vouchers"        element={<AdminVouchers />} />
            <Route path="warranty-packages" element={<AdminWarrantyPackages />} />
            <Route path="news"            element={<AdminNews />} />
            <Route path="promotional-contents" element={<AdminPromotionalContents />} />
            <Route path="consultations"    element={<ConsultantChats />} />
            <Route path="auditlogs"       element={<AdminAuditLogs />} />
          </Route>
        </Route>

        {/* ═══ PROTECTED — Employee portal ═════════════════════════════════ */}
        <Route element={<AuthGuard allowedRoles={['Admin', 'Manager', 'Sales', 'Warehouse', 'Warranty', 'Content', 'Consultant']} />}>
          <Route path="/staff" element={<StaffLayout />}>
            <Route index element={<StaffHomeRedirect />} />

            <Route element={<AuthGuard allowedRoles={['Admin', 'Manager']} />}>
              <Route path="manager" element={<ManagerWorkspace />} />
              <Route path="dashboard" element={<AdminDashboard />} />
            </Route>
            <Route element={<AuthGuard allowedRoles={['Admin', 'Content']} />}>
              <Route path="content" element={<ContentWorkspace />} />
            </Route>
            <Route element={<AuthGuard allowedRoles={['Admin', 'Manager', 'Warehouse', 'Content']} />}>
              <Route path="products" element={<AdminProducts />} />
            </Route>
            <Route element={<AuthGuard allowedRoles={['Admin', 'Manager', 'Sales']} />}>
              <Route path="orders" element={<StaffOrders />} />
            </Route>
            <Route element={<AuthGuard allowedRoles={['Admin', 'Manager', 'Sales']} />}>
              <Route path="sales-orders" element={<SalesOrders />} />
            </Route>
            <Route element={<AuthGuard allowedRoles={['Admin', 'Manager', 'Warehouse']} />}>
              <Route path="warehouse-orders" element={<WarehouseOrders />} />
            </Route>
            <Route element={<AuthGuard allowedRoles={['Admin', 'Manager', 'Warehouse']} />}>
              <Route path="inventory" element={<StaffInventory />} />
            </Route>
            <Route element={<AuthGuard allowedRoles={['Admin', 'Manager', 'Sales', 'Warehouse']} />}>
              <Route path="returns" element={<StaffReturns />} />
              <Route path="shipments" element={<StaffShipments />} />
            </Route>
            <Route element={<AuthGuard allowedRoles={['Admin', 'Manager', 'Warranty']} />}>
              <Route path="warranties" element={<StaffWarranties />} />
            </Route>
            <Route element={<AuthGuard allowedRoles={['Admin', 'Manager', 'Sales', 'Warranty', 'Consultant']} />}>
              <Route path="customers" element={<AdminCustomers />} />
            </Route>
            <Route element={<AuthGuard allowedRoles={['Admin', 'Manager', 'Sales']} />}>
              <Route path="vouchers" element={<AdminVouchers />} />
            </Route>
            <Route element={<AuthGuard allowedRoles={['Admin', 'Content']} />}>
              <Route path="news" element={<AdminNews />} />
              <Route path="promotional-contents" element={<AdminPromotionalContents />} />
            </Route>
            <Route element={<AuthGuard allowedRoles={['Admin', 'Manager', 'Consultant']} />}>
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
