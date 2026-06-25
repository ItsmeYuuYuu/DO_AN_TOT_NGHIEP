using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ECommerceBackend.Migrations
{
    /// <inheritdoc />
    public partial class AddNewsSlugs : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "slug",
                table: "news",
                type: "character varying(220)",
                maxLength: 220,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "news_slug_key",
                table: "news",
                column: "slug",
                unique: true,
                filter: "slug IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "news_slug_key",
                table: "news");

            migrationBuilder.DropColumn(
                name: "slug",
                table: "news");
        }
    }
}
