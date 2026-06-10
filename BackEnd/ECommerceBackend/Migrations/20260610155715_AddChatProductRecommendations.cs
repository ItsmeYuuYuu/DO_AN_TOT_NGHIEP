using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace ECommerceBackend.Migrations
{
    /// <inheritdoc />
    public partial class AddChatProductRecommendations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "chatproductrecommendations",
                columns: table => new
                {
                    recommendationid = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    messageid = table.Column<int>(type: "integer", nullable: false),
                    productid = table.Column<int>(type: "integer", nullable: false),
                    variantid = table.Column<int>(type: "integer", nullable: false),
                    rank = table.Column<int>(type: "integer", nullable: false),
                    createdat = table.Column<DateTime>(type: "timestamp without time zone", nullable: true, defaultValueSql: "CURRENT_TIMESTAMP"),
                    addedtocartat = table.Column<DateTime>(type: "timestamp without time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("chatproductrecommendations_pkey", x => x.recommendationid);
                    table.ForeignKey(
                        name: "fk_chatproductrecommendations_messages",
                        column: x => x.messageid,
                        principalTable: "chatmessages",
                        principalColumn: "messageid",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_chatproductrecommendations_products",
                        column: x => x.productid,
                        principalTable: "products",
                        principalColumn: "productid",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_chatproductrecommendations_variants",
                        column: x => x.variantid,
                        principalTable: "productvariants",
                        principalColumn: "variantid",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "chatproductrecommendations_messageid_variantid_key",
                table: "chatproductrecommendations",
                columns: new[] { "messageid", "variantid" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_chatproductrecommendations_addedtocartat",
                table: "chatproductrecommendations",
                column: "addedtocartat");

            migrationBuilder.CreateIndex(
                name: "ix_chatproductrecommendations_productid",
                table: "chatproductrecommendations",
                column: "productid");

            migrationBuilder.CreateIndex(
                name: "ix_chatproductrecommendations_variantid",
                table: "chatproductrecommendations",
                column: "variantid");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "chatproductrecommendations");
        }
    }
}
