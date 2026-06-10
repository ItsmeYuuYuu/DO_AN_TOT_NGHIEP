using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ECommerceBackend.Migrations
{
    /// <inheritdoc />
    public partial class BackfillInventoryTransactionBaseline : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                INSERT INTO inventorytransactions (
                    imei, transactiontype, fromstatus, tostatus, note, createdat
                )
                SELECT
                    inventory.imei,
                    'Baseline',
                    NULL,
                    COALESCE(inventory.status, 'InStock'),
                    'Initial history entry for existing inventory.',
                    COALESCE(inventory.importedat, CURRENT_TIMESTAMP)
                FROM inventoryitems AS inventory
                WHERE NOT EXISTS (
                    SELECT 1
                    FROM inventorytransactions AS history
                    WHERE history.imei = inventory.imei
                );
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                DELETE FROM inventorytransactions
                WHERE transactiontype = 'Baseline'
                  AND note = 'Initial history entry for existing inventory.';
                """);
        }
    }
}
