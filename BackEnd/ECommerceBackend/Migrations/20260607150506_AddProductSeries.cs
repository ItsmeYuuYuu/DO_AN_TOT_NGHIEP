using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace ECommerceBackend.Migrations
{
    /// <inheritdoc />
    public partial class AddProductSeries : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "seriesid",
                table: "products",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "assigneduserid",
                table: "chatsessions",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "handoffrequestedat",
                table: "chatsessions",
                type: "timestamp without time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "handoffstatus",
                table: "chatsessions",
                type: "character varying(30)",
                maxLength: 30,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "productseries",
                columns: table => new
                {
                    seriesid = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    brandid = table.Column<int>(type: "integer", nullable: false),
                    seriesname = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    displayorder = table.Column<int>(type: "integer", nullable: true, defaultValue: 0),
                    isactive = table.Column<bool>(type: "boolean", nullable: true, defaultValue: true),
                    createdat = table.Column<DateTime>(type: "timestamp without time zone", nullable: true, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("productseries_pkey", x => x.seriesid);
                    table.ForeignKey(
                        name: "fk_productseries_brands",
                        column: x => x.brandid,
                        principalTable: "brands",
                        principalColumn: "brandid",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_products_seriesid",
                table: "products",
                column: "seriesid");

            migrationBuilder.CreateIndex(
                name: "ix_productseries_brandid_seriesname",
                table: "productseries",
                columns: new[] { "brandid", "seriesname" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "fk_products_productseries",
                table: "products",
                column: "seriesid",
                principalTable: "productseries",
                principalColumn: "seriesid",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_products_productseries",
                table: "products");

            migrationBuilder.DropTable(
                name: "productseries");

            migrationBuilder.DropIndex(
                name: "IX_products_seriesid",
                table: "products");

            migrationBuilder.DropColumn(
                name: "seriesid",
                table: "products");

            migrationBuilder.DropColumn(
                name: "assigneduserid",
                table: "chatsessions");

            migrationBuilder.DropColumn(
                name: "handoffrequestedat",
                table: "chatsessions");

            migrationBuilder.DropColumn(
                name: "handoffstatus",
                table: "chatsessions");
        }
    }
}
