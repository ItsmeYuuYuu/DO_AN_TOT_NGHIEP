using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace ECommerceBackend.Migrations
{
    /// <inheritdoc />
    public partial class AddReturnRefundWorkflow : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "returnrequests",
                columns: table => new
                {
                    returnrequestid = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    orderid = table.Column<int>(type: "integer", nullable: false),
                    customerid = table.Column<int>(type: "integer", nullable: true),
                    requestedbyuserid = table.Column<int>(type: "integer", nullable: true),
                    assigneduserid = table.Column<int>(type: "integer", nullable: true),
                    requesttype = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    reason = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    description = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    imageurls = table.Column<string>(type: "text", nullable: true),
                    reviewnote = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    resolution = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    requestedrefundamount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    refundamount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    refundstatus = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    requestedat = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    reviewedat = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    receivedat = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    completedat = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    updatedat = table.Column<DateTime>(type: "timestamp without time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("returnrequests_pkey", x => x.returnrequestid);
                    table.ForeignKey(
                        name: "fk_returnrequests_assigned_users",
                        column: x => x.assigneduserid,
                        principalTable: "users",
                        principalColumn: "userid",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "fk_returnrequests_customers",
                        column: x => x.customerid,
                        principalTable: "customers",
                        principalColumn: "customerid",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "fk_returnrequests_orders",
                        column: x => x.orderid,
                        principalTable: "orders",
                        principalColumn: "orderid",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_returnrequests_requested_users",
                        column: x => x.requestedbyuserid,
                        principalTable: "users",
                        principalColumn: "userid",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "refundtransactions",
                columns: table => new
                {
                    refundtransactionid = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    returnrequestid = table.Column<int>(type: "integer", nullable: false),
                    orderid = table.Column<int>(type: "integer", nullable: false),
                    processedbyuserid = table.Column<int>(type: "integer", nullable: true),
                    amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    provider = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    transactionref = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    note = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    createdat = table.Column<DateTime>(type: "timestamp without time zone", nullable: true, defaultValueSql: "CURRENT_TIMESTAMP"),
                    processedat = table.Column<DateTime>(type: "timestamp without time zone", nullable: true)
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
                name: "returnitems",
                columns: table => new
                {
                    returnitemid = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    returnrequestid = table.Column<int>(type: "integer", nullable: false),
                    orderitemid = table.Column<int>(type: "integer", nullable: false),
                    imei = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    condition = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    disposition = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    replacementimei = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    refundamount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("returnitems_pkey", x => x.returnitemid);
                    table.ForeignKey(
                        name: "fk_returnitems_inventory",
                        column: x => x.imei,
                        principalTable: "inventoryitems",
                        principalColumn: "imei",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_returnitems_orderitems",
                        column: x => x.orderitemid,
                        principalTable: "orderitems",
                        principalColumn: "orderitemid",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_returnitems_replacement_inventory",
                        column: x => x.replacementimei,
                        principalTable: "inventoryitems",
                        principalColumn: "imei",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "fk_returnitems_requests",
                        column: x => x.returnrequestid,
                        principalTable: "returnrequests",
                        principalColumn: "returnrequestid",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "returnrequesthistories",
                columns: table => new
                {
                    historyid = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    returnrequestid = table.Column<int>(type: "integer", nullable: false),
                    userid = table.Column<int>(type: "integer", nullable: true),
                    fromstatus = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    tostatus = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    note = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    createdat = table.Column<DateTime>(type: "timestamp without time zone", nullable: true, defaultValueSql: "CURRENT_TIMESTAMP")
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
                name: "ix_returnitems_imei",
                table: "returnitems",
                column: "imei");

            migrationBuilder.CreateIndex(
                name: "IX_returnitems_orderitemid",
                table: "returnitems",
                column: "orderitemid");

            migrationBuilder.CreateIndex(
                name: "ix_returnitems_replacementimei",
                table: "returnitems",
                column: "replacementimei");

            migrationBuilder.CreateIndex(
                name: "ux_returnitems_request_orderitem",
                table: "returnitems",
                columns: new[] { "returnrequestid", "orderitemid" },
                unique: true);

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
                name: "ix_returnrequests_assigneduserid",
                table: "returnrequests",
                column: "assigneduserid");

            migrationBuilder.CreateIndex(
                name: "ix_returnrequests_customerid",
                table: "returnrequests",
                column: "customerid");

            migrationBuilder.CreateIndex(
                name: "ix_returnrequests_orderid",
                table: "returnrequests",
                column: "orderid");

            migrationBuilder.CreateIndex(
                name: "IX_returnrequests_requestedbyuserid",
                table: "returnrequests",
                column: "requestedbyuserid");

            migrationBuilder.CreateIndex(
                name: "ix_returnrequests_status_updatedat",
                table: "returnrequests",
                columns: new[] { "status", "updatedat" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "refundtransactions");

            migrationBuilder.DropTable(
                name: "returnitems");

            migrationBuilder.DropTable(
                name: "returnrequesthistories");

            migrationBuilder.DropTable(
                name: "returnrequests");
        }
    }
}
