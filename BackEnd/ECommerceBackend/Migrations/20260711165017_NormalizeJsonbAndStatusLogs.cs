using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ECommerceBackend.Migrations
{
    /// <inheritdoc />
    public partial class NormalizeJsonbAndStatusLogs : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "actiontype",
                table: "statuslogs",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "StatusChanged");

            migrationBuilder.AddColumn<string>(
                name: "metadata",
                table: "statuslogs",
                type: "jsonb",
                nullable: true);

            migrationBuilder.Sql("""
                ALTER TABLE warrantyclaims ALTER COLUMN imageurls TYPE jsonb USING imageurls::jsonb;
                ALTER TABLE returnrequests ALTER COLUMN imageurls TYPE jsonb USING imageurls::jsonb;
                ALTER TABLE productvariants ALTER COLUMN "Imageurls" TYPE jsonb USING "Imageurls"::jsonb;
                ALTER TABLE carts ALTER COLUMN "Cartcontent" TYPE jsonb USING "Cartcontent"::jsonb;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "actiontype",
                table: "statuslogs");

            migrationBuilder.DropColumn(
                name: "metadata",
                table: "statuslogs");

            migrationBuilder.AlterColumn<string>(
                name: "imageurls",
                table: "warrantyclaims",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "jsonb",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "imageurls",
                table: "returnrequests",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "jsonb",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Imageurls",
                table: "productvariants",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "jsonb",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Cartcontent",
                table: "carts",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "jsonb",
                oldNullable: true);
        }
    }
}
