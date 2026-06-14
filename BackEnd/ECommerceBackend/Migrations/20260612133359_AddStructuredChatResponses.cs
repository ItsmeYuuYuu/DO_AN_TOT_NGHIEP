using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ECommerceBackend.Migrations
{
    /// <inheritdoc />
    public partial class AddStructuredChatResponses : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "quickreplies",
                table: "chatmessages",
                type: "jsonb",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "responsetype",
                table: "chatmessages",
                type: "character varying(30)",
                maxLength: 30,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "quickreplies",
                table: "chatmessages");

            migrationBuilder.DropColumn(
                name: "responsetype",
                table: "chatmessages");
        }
    }
}
