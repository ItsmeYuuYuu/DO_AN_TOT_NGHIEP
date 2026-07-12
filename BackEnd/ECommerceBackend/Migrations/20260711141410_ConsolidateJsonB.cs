using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace ECommerceBackend.Migrations
{
    /// <inheritdoc />
    public partial class ConsolidateJsonB : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_products_productseries",
                table: "products");

            migrationBuilder.DropTable(
                name: "cartitems");

            migrationBuilder.DropTable(
                name: "orderassignments");

            migrationBuilder.DropTable(
                name: "productimages");

            migrationBuilder.DropTable(
                name: "productseries");

            migrationBuilder.DropTable(
                name: "promotionalcontents");

            migrationBuilder.DropTable(
                name: "refundtransactions");

            migrationBuilder.DropTable(
                name: "returnrequesthistories");

            migrationBuilder.DropTable(
                name: "shipmenthistories");

            migrationBuilder.DropTable(
                name: "warrantyclaimhistories");

            migrationBuilder.DropIndex(
                name: "IX_products_seriesid",
                table: "products");

            migrationBuilder.DropColumn(
                name: "seriesid",
                table: "products");

            migrationBuilder.AddColumn<string>(
                name: "Imageurls",
                table: "productvariants",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "seriesname",
                table: "products",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "Salesconfirmedat",
                table: "orders",
                type: "timestamp without time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Salesuserid",
                table: "orders",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "Warehousecompletedat",
                table: "orders",
                type: "timestamp without time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Warehouseuserid",
                table: "orders",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Returnrequestid",
                table: "orderpayments",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Transactiontype",
                table: "orderpayments",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Cartcontent",
                table: "carts",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Productids",
                table: "homepageproductsections",
                type: "jsonb",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Type",
                table: "homepageproductsections",
                type: "character varying(50)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Bannercontent",
                table: "homepageproductsections",
                type: "jsonb",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "statuslogs",
                columns: table => new
                {
                    logid = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    entitytype = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    entityid = table.Column<int>(type: "integer", nullable: false),
                    fromstatus = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    tostatus = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    note = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    userid = table.Column<int>(type: "integer", nullable: true),
                    createdat = table.Column<DateTime>(type: "timestamp without time zone", nullable: true, defaultValueSql: "CURRENT_TIMESTAMP"),
                    Shipmentid = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("statuslogs_pkey", x => x.logid);
                    table.ForeignKey(
                        name: "FK_statuslogs_shipments_Shipmentid",
                        column: x => x.Shipmentid,
                        principalTable: "shipments",
                        principalColumn: "shipmentid");
                    table.ForeignKey(
                        name: "fk_statuslogs_users",
                        column: x => x.userid,
                        principalTable: "users",
                        principalColumn: "userid",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "ix_statuslogs_entity",
                table: "statuslogs",
                columns: new[] { "entitytype", "entityid" });

            migrationBuilder.CreateIndex(
                name: "IX_statuslogs_Shipmentid",
                table: "statuslogs",
                column: "Shipmentid");

            migrationBuilder.CreateIndex(
                name: "IX_statuslogs_userid",
                table: "statuslogs",
                column: "userid");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Productids",
                table: "homepageproductsections");

            migrationBuilder.DropColumn(
                name: "Type",
                table: "homepageproductsections");

            migrationBuilder.DropColumn(
                name: "Bannercontent",
                table: "homepageproductsections");

            migrationBuilder.DropTable(
                name: "statuslogs");

            migrationBuilder.DropColumn(
                name: "Imageurls",
                table: "productvariants");

            migrationBuilder.DropColumn(
                name: "seriesname",
                table: "products");

            migrationBuilder.DropColumn(
                name: "Salesconfirmedat",
                table: "orders");

            migrationBuilder.DropColumn(
                name: "Salesuserid",
                table: "orders");

            migrationBuilder.DropColumn(
                name: "Warehousecompletedat",
                table: "orders");

            migrationBuilder.DropColumn(
                name: "Warehouseuserid",
                table: "orders");

            migrationBuilder.DropColumn(
                name: "Returnrequestid",
                table: "orderpayments");

            migrationBuilder.DropColumn(
                name: "Transactiontype",
                table: "orderpayments");

            migrationBuilder.DropColumn(
                name: "Cartcontent",
                table: "carts");

            migrationBuilder.AddColumn<int>(
                name: "seriesid",
                table: "products",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "cartitems",
                columns: table => new
                {
                    cartitemid = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    cartid = table.Column<int>(type: "integer", nullable: false),
                    variantid = table.Column<int>(type: "integer", nullable: false),
                    createdat = table.Column<DateTime>(type: "timestamp without time zone", nullable: true, defaultValueSql: "CURRENT_TIMESTAMP"),
                    quantity = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("cartitems_pkey", x => x.cartitemid);
                    table.ForeignKey(
                        name: "fk_cartitems_carts",
                        column: x => x.cartid,
                        principalTable: "carts",
                        principalColumn: "cartid",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_cartitems_productvariants",
                        column: x => x.variantid,
                        principalTable: "productvariants",
                        principalColumn: "variantid",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "orderassignments",
                columns: table => new
                {
                    assignmentid = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    assignedbyuserid = table.Column<int>(type: "integer", nullable: true),
                    assigneduserid = table.Column<int>(type: "integer", nullable: true),
                    orderid = table.Column<int>(type: "integer", nullable: false),
                    assignedat = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    completedat = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    department = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    note = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false, defaultValue: "Pending")
                },
                constraints: table =>
                {
                    table.PrimaryKey("orderassignments_pkey", x => x.assignmentid);
                    table.ForeignKey(
                        name: "fk_orderassignments_assigned_users",
                        column: x => x.assigneduserid,
                        principalTable: "users",
                        principalColumn: "userid",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "fk_orderassignments_assignedby_users",
                        column: x => x.assignedbyuserid,
                        principalTable: "users",
                        principalColumn: "userid",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "fk_orderassignments_orders",
                        column: x => x.orderid,
                        principalTable: "orders",
                        principalColumn: "orderid",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "productimages",
                columns: table => new
                {
                    imageid = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    variantid = table.Column<int>(type: "integer", nullable: true),
                    imageurl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    ismain = table.Column<bool>(type: "boolean", nullable: true, defaultValue: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("productimages_pkey", x => x.imageid);
                    table.ForeignKey(
                        name: "fk_images_variants",
                        column: x => x.variantid,
                        principalTable: "productvariants",
                        principalColumn: "variantid");
                });

            migrationBuilder.CreateTable(
                name: "productseries",
                columns: table => new
                {
                    seriesid = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    brandid = table.Column<int>(type: "integer", nullable: false),
                    createdat = table.Column<DateTime>(type: "timestamp without time zone", nullable: true, defaultValueSql: "CURRENT_TIMESTAMP"),
                    displayorder = table.Column<int>(type: "integer", nullable: true, defaultValue: 0),
                    isactive = table.Column<bool>(type: "boolean", nullable: true, defaultValue: true),
                    seriesname = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false)
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

            migrationBuilder.CreateTable(
                name: "promotionalcontents",
                columns: table => new
                {
                    contentid = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    contenttype = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    createdat = table.Column<DateTime>(type: "timestamp without time zone", nullable: true, defaultValueSql: "CURRENT_TIMESTAMP"),
                    displayorder = table.Column<int>(type: "integer", nullable: true, defaultValue: 0),
                    imageurl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    isactive = table.Column<bool>(type: "boolean", nullable: true, defaultValue: true),
                    linkurl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("promotionalcontents_pkey", x => x.contentid);
                });

            migrationBuilder.CreateTable(
                name: "refundtransactions",
                columns: table => new
                {
                    refundtransactionid = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    orderid = table.Column<int>(type: "integer", nullable: false),
                    processedbyuserid = table.Column<int>(type: "integer", nullable: true),
                    returnrequestid = table.Column<int>(type: "integer", nullable: false),
                    amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    createdat = table.Column<DateTime>(type: "timestamp without time zone", nullable: true, defaultValueSql: "CURRENT_TIMESTAMP"),
                    note = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    processedat = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    provider = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    transactionref = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("refundtransactions_pkey", x => x.refundtransactionid);
                    table.ForeignKey(
                        name: "fk_refundtransactions_orders",
                        column: x => x.orderid,
                        principalTable: "orders",
                        principalColumn: "orderid",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_refundtransactions_requests",
                        column: x => x.returnrequestid,
                        principalTable: "returnrequests",
                        principalColumn: "returnrequestid",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_refundtransactions_users",
                        column: x => x.processedbyuserid,
                        principalTable: "users",
                        principalColumn: "userid",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "returnrequesthistories",
                columns: table => new
                {
                    historyid = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    returnrequestid = table.Column<int>(type: "integer", nullable: false),
                    userid = table.Column<int>(type: "integer", nullable: true),
                    createdat = table.Column<DateTime>(type: "timestamp without time zone", nullable: true, defaultValueSql: "CURRENT_TIMESTAMP"),
                    fromstatus = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    note = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    tostatus = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("returnrequesthistories_pkey", x => x.historyid);
                    table.ForeignKey(
                        name: "fk_returnrequesthistories_requests",
                        column: x => x.returnrequestid,
                        principalTable: "returnrequests",
                        principalColumn: "returnrequestid",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_returnrequesthistories_users",
                        column: x => x.userid,
                        principalTable: "users",
                        principalColumn: "userid",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "shipmenthistories",
                columns: table => new
                {
                    historyid = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    shipmentid = table.Column<int>(type: "integer", nullable: false),
                    userid = table.Column<int>(type: "integer", nullable: true),
                    createdat = table.Column<DateTime>(type: "timestamp without time zone", nullable: true, defaultValueSql: "CURRENT_TIMESTAMP"),
                    fromstatus = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    note = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    tostatus = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("shipmenthistories_pkey", x => x.historyid);
                    table.ForeignKey(
                        name: "fk_shipmenthistories_shipments",
                        column: x => x.shipmentid,
                        principalTable: "shipments",
                        principalColumn: "shipmentid",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_shipmenthistories_users",
                        column: x => x.userid,
                        principalTable: "users",
                        principalColumn: "userid",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "warrantyclaimhistories",
                columns: table => new
                {
                    historyid = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    claimid = table.Column<int>(type: "integer", nullable: false),
                    userid = table.Column<int>(type: "integer", nullable: true),
                    createdat = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    fromstatus = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    note = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    tostatus = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("warrantyclaimhistories_pkey", x => x.historyid);
                    table.ForeignKey(
                        name: "fk_warrantyclaimhistories_claims",
                        column: x => x.claimid,
                        principalTable: "warrantyclaims",
                        principalColumn: "claimid",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_warrantyclaimhistories_users",
                        column: x => x.userid,
                        principalTable: "users",
                        principalColumn: "userid",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_products_seriesid",
                table: "products",
                column: "seriesid");

            migrationBuilder.CreateIndex(
                name: "IX_cartitems_cartid",
                table: "cartitems",
                column: "cartid");

            migrationBuilder.CreateIndex(
                name: "IX_cartitems_variantid",
                table: "cartitems",
                column: "variantid");

            migrationBuilder.CreateIndex(
                name: "IX_orderassignments_assignedbyuserid",
                table: "orderassignments",
                column: "assignedbyuserid");

            migrationBuilder.CreateIndex(
                name: "ix_orderassignments_assigneduserid",
                table: "orderassignments",
                column: "assigneduserid");

            migrationBuilder.CreateIndex(
                name: "ix_orderassignments_department_status",
                table: "orderassignments",
                columns: new[] { "department", "status" });

            migrationBuilder.CreateIndex(
                name: "ux_orderassignments_order_department",
                table: "orderassignments",
                columns: new[] { "orderid", "department" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_productimages_variantid",
                table: "productimages",
                column: "variantid");

            migrationBuilder.CreateIndex(
                name: "ix_productseries_brandid_seriesname",
                table: "productseries",
                columns: new[] { "brandid", "seriesname" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_refundtransactions_orderid",
                table: "refundtransactions",
                column: "orderid");

            migrationBuilder.CreateIndex(
                name: "IX_refundtransactions_processedbyuserid",
                table: "refundtransactions",
                column: "processedbyuserid");

            migrationBuilder.CreateIndex(
                name: "ix_refundtransactions_requestid",
                table: "refundtransactions",
                column: "returnrequestid");

            migrationBuilder.CreateIndex(
                name: "ix_returnrequesthistories_createdat",
                table: "returnrequesthistories",
                column: "createdat");

            migrationBuilder.CreateIndex(
                name: "ix_returnrequesthistories_requestid",
                table: "returnrequesthistories",
                column: "returnrequestid");

            migrationBuilder.CreateIndex(
                name: "IX_returnrequesthistories_userid",
                table: "returnrequesthistories",
                column: "userid");

            migrationBuilder.CreateIndex(
                name: "ix_shipmenthistories_shipment_createdat",
                table: "shipmenthistories",
                columns: new[] { "shipmentid", "createdat" });

            migrationBuilder.CreateIndex(
                name: "IX_shipmenthistories_userid",
                table: "shipmenthistories",
                column: "userid");

            migrationBuilder.CreateIndex(
                name: "ix_warrantyclaimhistories_claimid",
                table: "warrantyclaimhistories",
                column: "claimid");

            migrationBuilder.CreateIndex(
                name: "ix_warrantyclaimhistories_createdat",
                table: "warrantyclaimhistories",
                column: "createdat");

            migrationBuilder.CreateIndex(
                name: "IX_warrantyclaimhistories_userid",
                table: "warrantyclaimhistories",
                column: "userid");

            migrationBuilder.AddForeignKey(
                name: "fk_products_productseries",
                table: "products",
                column: "seriesid",
                principalTable: "productseries",
                principalColumn: "seriesid",
                onDelete: ReferentialAction.SetNull);
        }
    }
}
