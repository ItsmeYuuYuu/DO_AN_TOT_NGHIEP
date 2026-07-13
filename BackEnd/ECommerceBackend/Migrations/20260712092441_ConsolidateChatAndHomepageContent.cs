using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace ECommerceBackend.Migrations
{
    /// <inheritdoc />
    public partial class ConsolidateChatAndHomepageContent : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "recommendations",
                table: "chatmessages",
                type: "jsonb",
                nullable: true);

            migrationBuilder.Sql("""
                UPDATE chatmessages AS message
                SET recommendations = source.items
                FROM (
                    SELECT recommendation.messageid,
                           jsonb_agg(
                               jsonb_build_object(
                                   'Recommendationid', recommendation.recommendationid,
                                   'Productid', recommendation.productid,
                                   'Variantid', recommendation.variantid,
                                   'Rank', recommendation.rank,
                                   'Createdat', recommendation.createdat,
                                   'Addedtocartat', recommendation.addedtocartat,
                                   'Orderedat', recommendation.orderedat,
                                   'Orderid', recommendation.orderid
                               ) ORDER BY recommendation.rank, recommendation.recommendationid
                           ) AS items
                    FROM chatproductrecommendations AS recommendation
                    GROUP BY recommendation.messageid
                ) AS source
                WHERE message.messageid = source.messageid;

                INSERT INTO contents
                    (contenttype, title, summary, contentdata, displayorder, isactive, createdat)
                SELECT
                    'HomepageProductSection',
                    section.title,
                    section.subtitle,
                    jsonb_build_object(
                        'Sectionkey', section.sectionkey,
                        'Subtitle', section.subtitle,
                        'Theme', section.theme,
                        'Productids', COALESCE(section."Productids"::jsonb, '[]'::jsonb)
                    ),
                    section.displayorder,
                    section.isactive,
                    section.createdat
                FROM homepageproductsections AS section;
                """);

            migrationBuilder.DropTable(
                name: "chatproductrecommendations");

            migrationBuilder.DropTable(
                name: "homepageproductsections");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "chatproductrecommendations",
                columns: table => new
                {
                    recommendationid = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    messageid = table.Column<int>(type: "integer", nullable: false),
                    orderid = table.Column<int>(type: "integer", nullable: true),
                    productid = table.Column<int>(type: "integer", nullable: false),
                    variantid = table.Column<int>(type: "integer", nullable: false),
                    addedtocartat = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    createdat = table.Column<DateTime>(type: "timestamp without time zone", nullable: true, defaultValueSql: "CURRENT_TIMESTAMP"),
                    orderedat = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    rank = table.Column<int>(type: "integer", nullable: false)
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
                        name: "fk_chatproductrecommendations_orders",
                        column: x => x.orderid,
                        principalTable: "orders",
                        principalColumn: "orderid",
                        onDelete: ReferentialAction.SetNull);
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

            migrationBuilder.CreateTable(
                name: "homepageproductsections",
                columns: table => new
                {
                    sectionid = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Bannercontent = table.Column<string>(type: "text", nullable: true),
                    createdat = table.Column<DateTime>(type: "timestamp without time zone", nullable: true, defaultValueSql: "CURRENT_TIMESTAMP"),
                    displayorder = table.Column<int>(type: "integer", nullable: true, defaultValue: 0),
                    isactive = table.Column<bool>(type: "boolean", nullable: true, defaultValue: true),
                    Productids = table.Column<string>(type: "text", nullable: true),
                    sectionkey = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    subtitle = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    theme = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false, defaultValue: "LightBlue"),
                    title = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    Type = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("homepageproductsections_pkey", x => x.sectionid);
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
                name: "ix_chatproductrecommendations_orderedat",
                table: "chatproductrecommendations",
                column: "orderedat");

            migrationBuilder.CreateIndex(
                name: "ix_chatproductrecommendations_orderid",
                table: "chatproductrecommendations",
                column: "orderid");

            migrationBuilder.CreateIndex(
                name: "ix_chatproductrecommendations_productid",
                table: "chatproductrecommendations",
                column: "productid");

            migrationBuilder.CreateIndex(
                name: "ix_chatproductrecommendations_variantid",
                table: "chatproductrecommendations",
                column: "variantid");

            migrationBuilder.CreateIndex(
                name: "homepageproductsections_sectionkey_key",
                table: "homepageproductsections",
                column: "sectionkey",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_homepageproductsections_active_order",
                table: "homepageproductsections",
                columns: new[] { "isactive", "displayorder" });

            migrationBuilder.Sql("""
                INSERT INTO chatproductrecommendations
                    (recommendationid, messageid, productid, variantid, rank, createdat, addedtocartat, orderedat, orderid)
                SELECT
                    item."Recommendationid",
                    message.messageid,
                    item."Productid",
                    item."Variantid",
                    item."Rank",
                    item."Createdat",
                    item."Addedtocartat",
                    item."Orderedat",
                    item."Orderid"
                FROM chatmessages AS message
                CROSS JOIN LATERAL jsonb_to_recordset(COALESCE(message.recommendations, '[]'::jsonb)) AS item(
                    "Recommendationid" integer,
                    "Productid" integer,
                    "Variantid" integer,
                    "Rank" integer,
                    "Createdat" timestamp without time zone,
                    "Addedtocartat" timestamp without time zone,
                    "Orderedat" timestamp without time zone,
                    "Orderid" integer
                );

                SELECT setval(
                    pg_get_serial_sequence('chatproductrecommendations', 'recommendationid'),
                    COALESCE((SELECT MAX(recommendationid) FROM chatproductrecommendations), 1),
                    true);

                INSERT INTO homepageproductsections
                    (sectionkey, title, subtitle, theme, displayorder, isactive, createdat, "Productids")
                SELECT
                    content.contentdata->>'Sectionkey',
                    content.title,
                    COALESCE(content.contentdata->>'Subtitle', content.summary),
                    COALESCE(content.contentdata->>'Theme', 'LightBlue'),
                    content.displayorder,
                    content.isactive,
                    content.createdat,
                    COALESCE(content.contentdata->'Productids', '[]'::jsonb)::text
                FROM contents AS content
                WHERE content.contenttype = 'HomepageProductSection';

                DELETE FROM contents WHERE contenttype = 'HomepageProductSection';
                """);

            migrationBuilder.DropColumn(
                name: "recommendations",
                table: "chatmessages");
        }
    }
}
