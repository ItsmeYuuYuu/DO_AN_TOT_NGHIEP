namespace ECommerceBackend.Authorization;

public sealed record PermissionDefinition(string Code, string Name, string Group);

public static class AppPermissions
{
    public const string ClaimType = "permission";
    public const string Wildcard = "*";

    public const string DashboardView = "dashboard.view";
    public const string UsersManage = "users.manage";
    public const string RolesManage = "roles.manage";
    public const string AuditView = "audit.view";
    public const string CustomersView = "customers.view";
    public const string CustomersManageAccount = "customers.manage-account";
    public const string OrdersView = "orders.view";
    public const string OrdersManage = "orders.manage";
    public const string OrdersAssign = "orders.assign";
    public const string OrdersDelete = "orders.delete";
    public const string InventoryView = "inventory.view";
    public const string InventoryManage = "inventory.manage";
    public const string InventoryDelete = "inventory.delete";
    public const string ShipmentsView = "shipments.view";
    public const string ShipmentsManage = "shipments.manage";
    public const string ReturnsView = "returns.view";
    public const string ReturnsReview = "returns.review";
    public const string ReturnsReceive = "returns.receive";
    public const string ReturnsManage = "returns.manage";
    public const string WarrantiesView = "warranties.view";
    public const string WarrantiesManage = "warranties.manage";
    public const string ProductsManage = "products.manage";
    public const string ProductsDelete = "products.delete";
    public const string CatalogManage = "catalog.manage";
    public const string CatalogDelete = "catalog.delete";
    public const string ContentManage = "content.manage";
    public const string VouchersManage = "vouchers.manage";
    public const string ConsultationsManage = "consultations.manage";
    public const string ReviewsManage = "reviews.manage";
    public const string EmailTest = "email.test";

    public static readonly IReadOnlyList<PermissionDefinition> All = new[]
    {
        new PermissionDefinition(DashboardView, "Xem dashboard và báo cáo", "Tổng quan"),
        new PermissionDefinition(UsersManage, "Quản lý tài khoản nhân viên", "Quản trị"),
        new PermissionDefinition(RolesManage, "Quản lý vai trò và quyền", "Quản trị"),
        new PermissionDefinition(AuditView, "Xem nhật ký hệ thống", "Quản trị"),
        new PermissionDefinition(CustomersView, "Tra cứu khách hàng", "Khách hàng"),
        new PermissionDefinition(CustomersManageAccount, "Khóa/mở tài khoản khách hàng", "Khách hàng"),
        new PermissionDefinition(OrdersView, "Xem đơn hàng", "Đơn hàng"),
        new PermissionDefinition(OrdersManage, "Xử lý đơn hàng", "Đơn hàng"),
        new PermissionDefinition(OrdersAssign, "Phân công đơn hàng", "Đơn hàng"),
        new PermissionDefinition(OrdersDelete, "Xóa đơn hàng", "Đơn hàng"),
        new PermissionDefinition(InventoryView, "Xem kho và IMEI", "Kho"),
        new PermissionDefinition(InventoryManage, "Cập nhật kho và IMEI", "Kho"),
        new PermissionDefinition(InventoryDelete, "Xóa thiết bị chưa phát sinh giao dịch", "Kho"),
        new PermissionDefinition(ShipmentsView, "Xem vận chuyển", "Vận chuyển"),
        new PermissionDefinition(ShipmentsManage, "Cập nhật vận chuyển", "Vận chuyển"),
        new PermissionDefinition(ReturnsView, "Xem yêu cầu đổi trả", "Đổi trả"),
        new PermissionDefinition(ReturnsReview, "Duyệt yêu cầu đổi trả", "Đổi trả"),
        new PermissionDefinition(ReturnsReceive, "Tiếp nhận hàng đổi trả", "Đổi trả"),
        new PermissionDefinition(ReturnsManage, "Quản lý đổi trả và hoàn tiền", "Đổi trả"),
        new PermissionDefinition(WarrantiesView, "Xem hồ sơ bảo hành", "Bảo hành"),
        new PermissionDefinition(WarrantiesManage, "Xử lý bảo hành", "Bảo hành"),
        new PermissionDefinition(ProductsManage, "Quản lý sản phẩm", "Hàng hóa"),
        new PermissionDefinition(ProductsDelete, "Xóa sản phẩm", "Hàng hóa"),
        new PermissionDefinition(CatalogManage, "Quản lý danh mục, thương hiệu và dòng máy", "Hàng hóa"),
        new PermissionDefinition(CatalogDelete, "Xóa cấu trúc danh mục", "Hàng hóa"),
        new PermissionDefinition(ContentManage, "Quản lý tin tức và nội dung trang chủ", "Nội dung"),
        new PermissionDefinition(VouchersManage, "Quản lý voucher", "Khuyến mãi"),
        new PermissionDefinition(ConsultationsManage, "Tiếp nhận và xử lý tư vấn trực tiếp", "Tư vấn"),
        new PermissionDefinition(ReviewsManage, "Kiểm duyệt đánh giá", "Khách hàng"),
        new PermissionDefinition(EmailTest, "Gửi email kiểm thử", "Quản trị"),
    };

    public static readonly IReadOnlyDictionary<string, string[]> DefaultsByRole =
        new Dictionary<string, string[]>(StringComparer.OrdinalIgnoreCase)
        {
            ["Admin"] = new[] { Wildcard },
            ["Manager"] = All
                .Where(item => item.Code is not UsersManage and not RolesManage and not AuditView and not ProductsDelete and not CatalogDelete and not InventoryDelete and not OrdersDelete)
                .Select(item => item.Code).ToArray(),
            ["Sales"] = new[] { CustomersView, OrdersView, OrdersManage, OrdersAssign, ShipmentsView, ReturnsView, ReturnsReview, ReturnsManage },
            ["Warehouse"] = new[] { InventoryView, InventoryManage, ProductsManage, OrdersView, OrdersAssign, ShipmentsView, ShipmentsManage, ReturnsView, ReturnsReceive },
            ["Warranty"] = new[] { CustomersView, OrdersView, InventoryView, WarrantiesView, WarrantiesManage },
            ["Content"] = new[] { ProductsManage, CatalogManage, ContentManage },
            ["Consultant"] = new[] { CustomersView, OrdersView, InventoryView, WarrantiesView, ConsultationsManage },
            ["Customer"] = Array.Empty<string>(),
        };
}
