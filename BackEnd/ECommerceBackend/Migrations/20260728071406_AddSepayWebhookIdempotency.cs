using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ECommerceBackend.Migrations
{
    /// <inheritdoc />
    public partial class AddSepayWebhookIdempotency : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "ux_orderpayments_sepay_transaction_reference",
                table: "orderpayments",
                columns: new[] { "provider", "transactionref" },
                unique: true,
                filter: "provider = 'SEPAY' AND status = 'Success' AND transactionref IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ux_orderpayments_sepay_transaction_reference",
                table: "orderpayments");
        }
    }
}
