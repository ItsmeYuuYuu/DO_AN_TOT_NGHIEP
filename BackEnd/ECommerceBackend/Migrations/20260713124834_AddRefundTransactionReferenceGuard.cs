using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ECommerceBackend.Migrations
{
    /// <inheritdoc />
    public partial class AddRefundTransactionReferenceGuard : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "ux_orderpayments_active_refund_reference",
                table: "orderpayments",
                columns: new[] { "Transactiontype", "transactionref" },
                unique: true,
                filter: "\"Transactiontype\" = 'Refund' AND status <> 'Failed' AND transactionref IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ux_orderpayments_active_refund_reference",
                table: "orderpayments");
        }
    }
}
