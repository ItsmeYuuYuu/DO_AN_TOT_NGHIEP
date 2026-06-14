using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace ECommerceBackend.Migrations
{
    /// <inheritdoc />
    public partial class AddShipmentWorkflow : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "shipments",
                columns: table => new
                {
                    shipmentid = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    orderid = table.Column<int>(type: "integer", nullable: false),
                    carrier = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    trackingcode = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    shippingfee = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    estimateddeliveryat = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    deliveryattempts = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    createdbyuserid = table.Column<int>(type: "integer", nullable: true),
                    createdat = table.Column<DateTime>(type: "timestamp without time zone", nullable: true, defaultValueSql: "CURRENT_TIMESTAMP"),
                    updatedat = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    pickedupat = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    deliveredat = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    returnedat = table.Column<DateTime>(type: "timestamp without time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("shipments_pkey", x => x.shipmentid);
                    table.ForeignKey(
                        name: "fk_shipments_orders",
                        column: x => x.orderid,
                        principalTable: "orders",
                        principalColumn: "orderid",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_shipments_users",
                        column: x => x.createdbyuserid,
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
                    fromstatus = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    tostatus = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    note = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    createdat = table.Column<DateTime>(type: "timestamp without time zone", nullable: true, defaultValueSql: "CURRENT_TIMESTAMP")
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

            migrationBuilder.CreateIndex(
                name: "ix_shipmenthistories_shipment_createdat",
                table: "shipmenthistories",
                columns: new[] { "shipmentid", "createdat" });

            migrationBuilder.CreateIndex(
                name: "IX_shipmenthistories_userid",
                table: "shipmenthistories",
                column: "userid");

            migrationBuilder.CreateIndex(
                name: "IX_shipments_createdbyuserid",
                table: "shipments",
                column: "createdbyuserid");

            migrationBuilder.CreateIndex(
                name: "ix_shipments_status_updatedat",
                table: "shipments",
                columns: new[] { "status", "updatedat" });

            migrationBuilder.CreateIndex(
                name: "ux_shipments_orderid",
                table: "shipments",
                column: "orderid",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ux_shipments_trackingcode",
                table: "shipments",
                column: "trackingcode",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "shipmenthistories");

            migrationBuilder.DropTable(
                name: "shipments");
        }
    }
}
