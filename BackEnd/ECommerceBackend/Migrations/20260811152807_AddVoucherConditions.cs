using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ECommerceBackend.Migrations
{
    /// <inheritdoc />
    public partial class AddVoucherConditions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int[]>(
                name: "applicableproductids",
                table: "vouchers",
                type: "integer[]",
                nullable: false,
                defaultValueSql: "ARRAY[]::integer[]");

            migrationBuilder.AddColumn<decimal>(
                name: "maximumdiscountamount",
                table: "vouchers",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "minimumorderamount",
                table: "vouchers",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "applicableproductids",
                table: "vouchers");

            migrationBuilder.DropColumn(
                name: "maximumdiscountamount",
                table: "vouchers");

            migrationBuilder.DropColumn(
                name: "minimumorderamount",
                table: "vouchers");
        }
    }
}
