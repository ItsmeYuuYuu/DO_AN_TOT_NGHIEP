using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ECommerceBackend.Migrations
{
    /// <inheritdoc />
    public partial class RemoveUnusedTemporaryInventory : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                DELETE FROM inventorytransactions AS transaction
                WHERE transaction.imei LIKE 'TMP-%'
                  AND EXISTS (
                      SELECT 1
                      FROM inventoryitems AS item
                      WHERE item.imei = transaction.imei
                        AND item.status = 'InStock'
                  )
                  AND NOT EXISTS (SELECT 1 FROM orderitems WHERE orderitems.imei = transaction.imei)
                  AND NOT EXISTS (
                      SELECT 1 FROM returnitems
                      WHERE returnitems.imei = transaction.imei
                         OR returnitems.replacementimei = transaction.imei
                  )
                  AND NOT EXISTS (SELECT 1 FROM warrantyclaims WHERE warrantyclaims.imei = transaction.imei);

                DELETE FROM inventoryitems AS item
                WHERE item.imei LIKE 'TMP-%'
                  AND item.status = 'InStock'
                  AND NOT EXISTS (SELECT 1 FROM orderitems WHERE orderitems.imei = item.imei)
                  AND NOT EXISTS (
                      SELECT 1 FROM returnitems
                      WHERE returnitems.imei = item.imei
                         OR returnitems.replacementimei = item.imei
                  )
                  AND NOT EXISTS (SELECT 1 FROM warrantyclaims WHERE warrantyclaims.imei = item.imei)
                  AND NOT EXISTS (SELECT 1 FROM inventorytransactions WHERE inventorytransactions.imei = item.imei);
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Deleted placeholder devices cannot and should not be recreated as physical stock.
        }
    }
}
