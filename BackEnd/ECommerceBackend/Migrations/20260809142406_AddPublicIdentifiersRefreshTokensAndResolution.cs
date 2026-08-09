using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ECommerceBackend.Migrations
{
    /// <inheritdoc />
    public partial class AddPublicIdentifiersRefreshTokensAndResolution : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "createdbyuserid",
                table: "users",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "publicid",
                table: "customers",
                type: "uuid",
                nullable: false,
                defaultValueSql: "gen_random_uuid()");

            migrationBuilder.AddColumn<string>(
                name: "resolutioncode",
                table: "chatsessions",
                type: "character varying(40)",
                maxLength: 40,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "resolvedat",
                table: "chatsessions",
                type: "timestamp without time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "resolvedbyuserid",
                table: "chatsessions",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "refreshtokens",
                columns: table => new
                {
                    refreshtokenid = table.Column<Guid>(type: "uuid", nullable: false),
                    userid = table.Column<int>(type: "integer", nullable: false),
                    tokenhash = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    sessionid = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    createdat = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    expiresat = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    revokedat = table.Column<DateTime>(type: "timestamp without time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("refreshtokens_pkey", x => x.refreshtokenid);
                    table.ForeignKey(
                        name: "fk_refreshtokens_users",
                        column: x => x.userid,
                        principalTable: "users",
                        principalColumn: "userid",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_users_createdbyuserid",
                table: "users",
                column: "createdbyuserid");

            migrationBuilder.CreateIndex(
                name: "customers_publicid_key",
                table: "customers",
                column: "publicid",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_refreshtokens_user_session",
                table: "refreshtokens",
                columns: new[] { "userid", "sessionid" });

            migrationBuilder.CreateIndex(
                name: "refreshtokens_tokenhash_key",
                table: "refreshtokens",
                column: "tokenhash",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "fk_users_createdby",
                table: "users",
                column: "createdbyuserid",
                principalTable: "users",
                principalColumn: "userid",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_users_createdby",
                table: "users");

            migrationBuilder.DropTable(
                name: "refreshtokens");

            migrationBuilder.DropIndex(
                name: "IX_users_createdbyuserid",
                table: "users");

            migrationBuilder.DropIndex(
                name: "customers_publicid_key",
                table: "customers");

            migrationBuilder.DropColumn(
                name: "createdbyuserid",
                table: "users");

            migrationBuilder.DropColumn(
                name: "publicid",
                table: "customers");

            migrationBuilder.DropColumn(
                name: "resolutioncode",
                table: "chatsessions");

            migrationBuilder.DropColumn(
                name: "resolvedat",
                table: "chatsessions");

            migrationBuilder.DropColumn(
                name: "resolvedbyuserid",
                table: "chatsessions");
        }
    }
}
