using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace ECommerceBackend.Migrations
{
    /// <inheritdoc />
    public partial class AddRolePermissionsAndUserRoles : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "permissions",
                columns: table => new
                {
                    permissionid = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    code = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    groupname = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("permissions_pkey", x => x.permissionid);
                });

            migrationBuilder.CreateTable(
                name: "userroles",
                columns: table => new
                {
                    userid = table.Column<int>(type: "integer", nullable: false),
                    roleid = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("userroles_pkey", x => new { x.userid, x.roleid });
                    table.ForeignKey(
                        name: "fk_userroles_roles",
                        column: x => x.roleid,
                        principalTable: "roles",
                        principalColumn: "roleid",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_userroles_users",
                        column: x => x.userid,
                        principalTable: "users",
                        principalColumn: "userid",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "rolepermissions",
                columns: table => new
                {
                    roleid = table.Column<int>(type: "integer", nullable: false),
                    permissionid = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("rolepermissions_pkey", x => new { x.roleid, x.permissionid });
                    table.ForeignKey(
                        name: "fk_rolepermissions_permissions",
                        column: x => x.permissionid,
                        principalTable: "permissions",
                        principalColumn: "permissionid",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_rolepermissions_roles",
                        column: x => x.roleid,
                        principalTable: "roles",
                        principalColumn: "roleid",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "permissions_code_key",
                table: "permissions",
                column: "code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_rolepermissions_permissionid",
                table: "rolepermissions",
                column: "permissionid");

            migrationBuilder.CreateIndex(
                name: "IX_userroles_roleid",
                table: "userroles",
                column: "roleid");

            migrationBuilder.InsertData(
                table: "permissions",
                columns: new[] { "permissionid", "code", "name", "groupname", "description" },
                values: new object[,]
                {
                    { 1, "dashboard.view", "Xem dashboard và báo cáo", "Tổng quan", null },
                    { 2, "users.manage", "Quản lý tài khoản nhân viên", "Quản trị", null },
                    { 3, "roles.manage", "Quản lý vai trò và quyền", "Quản trị", null },
                    { 4, "audit.view", "Xem nhật ký hệ thống", "Quản trị", null },
                    { 5, "customers.view", "Tra cứu khách hàng", "Khách hàng", null },
                    { 6, "customers.manage-account", "Khóa/mở tài khoản khách hàng", "Khách hàng", null },
                    { 7, "orders.view", "Xem đơn hàng", "Đơn hàng", null },
                    { 8, "orders.manage", "Xử lý đơn hàng", "Đơn hàng", null },
                    { 9, "orders.assign", "Phân công đơn hàng", "Đơn hàng", null },
                    { 10, "inventory.view", "Xem kho và IMEI", "Kho", null },
                    { 11, "inventory.manage", "Cập nhật kho và IMEI", "Kho", null },
                    { 12, "shipments.view", "Xem vận chuyển", "Vận chuyển", null },
                    { 13, "shipments.manage", "Cập nhật vận chuyển", "Vận chuyển", null },
                    { 14, "returns.view", "Xem yêu cầu đổi trả", "Đổi trả", null },
                    { 15, "returns.review", "Duyệt yêu cầu đổi trả", "Đổi trả", null },
                    { 16, "returns.receive", "Tiếp nhận hàng đổi trả", "Đổi trả", null },
                    { 17, "returns.manage", "Quản lý đổi trả và hoàn tiền", "Đổi trả", null },
                    { 18, "warranties.view", "Xem hồ sơ bảo hành", "Bảo hành", null },
                    { 19, "warranties.manage", "Xử lý bảo hành", "Bảo hành", null },
                    { 20, "products.manage", "Quản lý sản phẩm", "Hàng hóa", null },
                    { 21, "products.delete", "Xóa sản phẩm", "Hàng hóa", null },
                    { 22, "catalog.manage", "Quản lý danh mục, thương hiệu và dòng máy", "Hàng hóa", null },
                    { 23, "catalog.delete", "Xóa cấu trúc danh mục", "Hàng hóa", null },
                    { 24, "content.manage", "Quản lý tin tức và nội dung trang chủ", "Nội dung", null },
                    { 25, "vouchers.manage", "Quản lý voucher", "Khuyến mãi", null },
                    { 26, "consultations.manage", "Tiếp nhận và xử lý tư vấn trực tiếp", "Tư vấn", null },
                    { 27, "reviews.manage", "Kiểm duyệt đánh giá", "Khách hàng", null },
                    { 28, "email.test", "Gửi email kiểm thử", "Quản trị", null },
                    { 29, "orders.delete", "Xóa đơn hàng", "Đơn hàng", null },
                    { 30, "inventory.delete", "Xóa thiết bị chưa phát sinh giao dịch", "Kho", null }
                });

            migrationBuilder.Sql("""
                INSERT INTO userroles (userid, roleid)
                SELECT userid, roleid FROM users WHERE roleid IS NOT NULL
                ON CONFLICT (userid, roleid) DO NOTHING;

                INSERT INTO rolepermissions (roleid, permissionid)
                SELECT r.roleid, p.permissionid
                FROM roles r
                CROSS JOIN permissions p
                WHERE
                    r.rolename = 'Admin'
                    OR (r.rolename = 'Manager' AND p.code NOT IN ('users.manage', 'roles.manage', 'audit.view', 'products.delete', 'catalog.delete', 'orders.delete', 'inventory.delete'))
                    OR (r.rolename = 'Sales' AND p.code IN ('customers.view', 'orders.view', 'orders.manage', 'orders.assign', 'shipments.view', 'returns.view', 'returns.review', 'returns.manage'))
                    OR (r.rolename = 'Warehouse' AND p.code IN ('inventory.view', 'inventory.manage', 'products.manage', 'orders.view', 'orders.assign', 'shipments.view', 'shipments.manage', 'returns.view', 'returns.receive'))
                    OR (r.rolename = 'Warranty' AND p.code IN ('customers.view', 'orders.view', 'inventory.view', 'warranties.view', 'warranties.manage'))
                    OR (r.rolename = 'Content' AND p.code IN ('products.manage', 'catalog.manage', 'content.manage'))
                    OR (r.rolename = 'Consultant' AND p.code IN ('customers.view', 'orders.view', 'inventory.view', 'warranties.view', 'consultations.manage'))
                ON CONFLICT (roleid, permissionid) DO NOTHING;

                SELECT setval(pg_get_serial_sequence('permissions', 'permissionid'),
                    COALESCE((SELECT MAX(permissionid) FROM permissions), 1));
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "rolepermissions");

            migrationBuilder.DropTable(
                name: "userroles");

            migrationBuilder.DropTable(
                name: "permissions");
        }
    }
}
