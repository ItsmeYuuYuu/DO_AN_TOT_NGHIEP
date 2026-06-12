using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ECommerceBackend.Migrations
{
    /// <inheritdoc />
    public partial class AddChatRecommendationOrderAttribution : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "orderedat",
                table: "chatproductrecommendations",
                type: "timestamp without time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "orderid",
                table: "chatproductrecommendations",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "ix_chatproductrecommendations_orderedat",
                table: "chatproductrecommendations",
                column: "orderedat");

            migrationBuilder.CreateIndex(
                name: "ix_chatproductrecommendations_orderid",
                table: "chatproductrecommendations",
                column: "orderid");

            migrationBuilder.AddForeignKey(
                name: "fk_chatproductrecommendations_orders",
                table: "chatproductrecommendations",
                column: "orderid",
                principalTable: "orders",
                principalColumn: "orderid",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_chatproductrecommendations_orders",
                table: "chatproductrecommendations");

            migrationBuilder.DropIndex(
                name: "ix_chatproductrecommendations_orderedat",
                table: "chatproductrecommendations");

            migrationBuilder.DropIndex(
                name: "ix_chatproductrecommendations_orderid",
                table: "chatproductrecommendations");

            migrationBuilder.DropColumn(
                name: "orderedat",
                table: "chatproductrecommendations");

            migrationBuilder.DropColumn(
                name: "orderid",
                table: "chatproductrecommendations");
        }
    }
}
