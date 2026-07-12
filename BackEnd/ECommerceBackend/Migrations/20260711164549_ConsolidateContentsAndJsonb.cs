using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace ECommerceBackend.Migrations
{
    /// <inheritdoc />
    public partial class ConsolidateContentsAndJsonb : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "contents",
                columns: table => new
                {
                    contentid = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    contenttype = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    title = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    slug = table.Column<string>(type: "character varying(220)", maxLength: 220, nullable: true),
                    summary = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    htmlcontent = table.Column<string>(type: "text", nullable: true),
                    thumbnailurl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    linkurl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    contentdata = table.Column<string>(type: "jsonb", nullable: true),
                    displayorder = table.Column<int>(type: "integer", nullable: true),
                    isactive = table.Column<bool>(type: "boolean", nullable: true, defaultValue: true),
                    createdbyuserid = table.Column<int>(type: "integer", nullable: true),
                    createdat = table.Column<DateTime>(type: "timestamp without time zone", nullable: true, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("contents_pkey", x => x.contentid);
                    table.ForeignKey(
                        name: "fk_news_users",
                        column: x => x.createdbyuserid,
                        principalTable: "users",
                        principalColumn: "userid");
                });

            migrationBuilder.CreateIndex(
                name: "IX_contents_createdbyuserid",
                table: "contents",
                column: "createdbyuserid");

            migrationBuilder.CreateIndex(
                name: "ix_contents_listing",
                table: "contents",
                columns: new[] { "contenttype", "isactive", "displayorder" });

            migrationBuilder.CreateIndex(
                name: "ux_contents_slug",
                table: "contents",
                column: "slug",
                unique: true);

            migrationBuilder.Sql("""
                INSERT INTO contents (contentid, contenttype, title, slug, summary, htmlcontent, thumbnailurl, isactive, createdbyuserid, createdat)
                SELECT postid, 'News', title, slug, summary, content, thumbnail, isactive, userid, createdat
                FROM news;
                SELECT setval(pg_get_serial_sequence('contents', 'contentid'), COALESCE((SELECT MAX(contentid) FROM contents), 1), true);
                """);

            migrationBuilder.DropTable(name: "news");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "contents");

            migrationBuilder.CreateTable(
                name: "news",
                columns: table => new
                {
                    postid = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    userid = table.Column<int>(type: "integer", nullable: true),
                    content = table.Column<string>(type: "text", nullable: true),
                    createdat = table.Column<DateTime>(type: "timestamp without time zone", nullable: true, defaultValueSql: "CURRENT_TIMESTAMP"),
                    isactive = table.Column<bool>(type: "boolean", nullable: true, defaultValue: true),
                    slug = table.Column<string>(type: "character varying(220)", maxLength: 220, nullable: true),
                    summary = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    thumbnail = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    title = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("news_pkey", x => x.postid);
                    table.ForeignKey(
                        name: "fk_news_users",
                        column: x => x.userid,
                        principalTable: "users",
                        principalColumn: "userid");
                });

            migrationBuilder.CreateIndex(
                name: "IX_news_userid",
                table: "news",
                column: "userid");

            migrationBuilder.CreateIndex(
                name: "news_slug_key",
                table: "news",
                column: "slug",
                unique: true);
        }
    }
}
