using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ECommerceBackend.Migrations
{
    /// <inheritdoc />
    public partial class IncreaseSpecLength : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "status",
                table: "inventoryitems",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true,
                defaultValueSql: "'InStock'",
                oldClrType: typeof(string),
                oldType: "character varying(50)",
                oldMaxLength: 50,
                oldNullable: true,
                oldDefaultValueSql: "'InStock'::character varying");

            migrationBuilder.AlterColumn<string>(
                name: "status",
                table: "chatsessions",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true,
                defaultValueSql: "'Active'",
                oldClrType: typeof(string),
                oldType: "character varying(50)",
                oldMaxLength: 50,
                oldNullable: true,
                oldDefaultValueSql: "'Active'::character varying");

            migrationBuilder.AlterColumn<string>(
                name: "valuename",
                table: "attributevalues",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(50)",
                oldMaxLength: 50);

            migrationBuilder.AlterColumn<string>(
                name: "attributename",
                table: "attributes",
                type: "character varying(255)",
                maxLength: 255,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(50)",
                oldMaxLength: 50);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "status",
                table: "inventoryitems",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true,
                defaultValueSql: "'InStock'::character varying",
                oldClrType: typeof(string),
                oldType: "character varying(50)",
                oldMaxLength: 50,
                oldNullable: true,
                oldDefaultValueSql: "'InStock'");

            migrationBuilder.AlterColumn<string>(
                name: "status",
                table: "chatsessions",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true,
                defaultValueSql: "'Active'::character varying",
                oldClrType: typeof(string),
                oldType: "character varying(50)",
                oldMaxLength: 50,
                oldNullable: true,
                oldDefaultValueSql: "'Active'");

            migrationBuilder.AlterColumn<string>(
                name: "valuename",
                table: "attributevalues",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(1000)",
                oldMaxLength: 1000);

            migrationBuilder.AlterColumn<string>(
                name: "attributename",
                table: "attributes",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(255)",
                oldMaxLength: 255);
        }
    }
}
