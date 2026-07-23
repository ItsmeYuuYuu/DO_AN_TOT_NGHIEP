using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ECommerceBackend.Migrations
{
    /// <inheritdoc />
    public partial class AddReturnDepreciationWorkflow : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "approvedrefundamount",
                table: "returnrequests",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "policyversion",
                table: "returnrequests",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "Legacy");

            migrationBuilder.AddColumn<string>(
                name: "reasoncategory",
                table: "returnrequests",
                type: "character varying(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "Other");

            migrationBuilder.AddColumn<string>(
                name: "refundcalculation",
                table: "returnrequests",
                type: "jsonb",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "deductionamount",
                table: "returnitems",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "faultresponsibility",
                table: "returnitems",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "inspectiongrade",
                table: "returnitems",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "originalpaidamount",
                table: "returnitems",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<int>(
                name: "resalevariantid",
                table: "returnitems",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "ix_returnitems_resalevariantid",
                table: "returnitems",
                column: "resalevariantid");

            migrationBuilder.AddForeignKey(
                name: "fk_returnitems_resale_variants",
                table: "returnitems",
                column: "resalevariantid",
                principalTable: "productvariants",
                principalColumn: "variantid",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.Sql("""
                UPDATE returnitems
                SET originalpaidamount = refundamount
                WHERE originalpaidamount = 0 AND refundamount > 0;

                UPDATE returnrequests
                SET approvedrefundamount = requestedrefundamount
                WHERE approvedrefundamount IS NULL
                  AND status IN ('RefundPending', 'RefundProcessing', 'RefundDisputed', 'Completed');
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_returnitems_resale_variants",
                table: "returnitems");

            migrationBuilder.DropIndex(
                name: "ix_returnitems_resalevariantid",
                table: "returnitems");

            migrationBuilder.DropColumn(
                name: "approvedrefundamount",
                table: "returnrequests");

            migrationBuilder.DropColumn(
                name: "policyversion",
                table: "returnrequests");

            migrationBuilder.DropColumn(
                name: "reasoncategory",
                table: "returnrequests");

            migrationBuilder.DropColumn(
                name: "refundcalculation",
                table: "returnrequests");

            migrationBuilder.DropColumn(
                name: "deductionamount",
                table: "returnitems");

            migrationBuilder.DropColumn(
                name: "faultresponsibility",
                table: "returnitems");

            migrationBuilder.DropColumn(
                name: "inspectiongrade",
                table: "returnitems");

            migrationBuilder.DropColumn(
                name: "originalpaidamount",
                table: "returnitems");

            migrationBuilder.DropColumn(
                name: "resalevariantid",
                table: "returnitems");
        }
    }
}
