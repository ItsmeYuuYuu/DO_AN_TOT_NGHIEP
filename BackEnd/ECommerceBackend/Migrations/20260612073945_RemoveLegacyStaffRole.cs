using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ECommerceBackend.Migrations
{
    /// <inheritdoc />
    public partial class RemoveLegacyStaffRole : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                DELETE FROM users AS legacy
                WHERE legacy.roleid = 2
                  AND legacy.username = 'stafflegacy@gmail.com'
                  AND NOT EXISTS (
                      SELECT 1 FROM auditlogs WHERE userid = legacy.userid
                  )
                  AND NOT EXISTS (
                      SELECT 1 FROM news WHERE userid = legacy.userid
                  )
                  AND NOT EXISTS (
                      SELECT 1 FROM orders WHERE userid = legacy.userid
                  );

                UPDATE users
                SET roleid = 6,
                    isactive = false
                WHERE roleid = 2;

                DELETE FROM roles
                WHERE roleid = 2
                  AND rolename = 'Staff'
                  AND NOT EXISTS (
                      SELECT 1 FROM users WHERE users.roleid = roles.roleid
                  );
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                INSERT INTO roles (roleid, rolename)
                VALUES (2, 'Staff')
                ON CONFLICT (roleid) DO NOTHING;
                """);
        }
    }
}
