using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace ECommerceBackend.Migrations
{
    /// <inheritdoc />
    public partial class AddWarrantyServiceWorkflow : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "warrantyclaims",
                columns: table => new
                {
                    claimid = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    imei = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    customerid = table.Column<int>(type: "integer", nullable: false),
                    assigneduserid = table.Column<int>(type: "integer", nullable: true),
                    faultdescription = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false, defaultValue: "Received"),
                    coverage = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    imageurls = table.Column<string>(type: "text", nullable: true),
                    estimatedcost = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    finalcost = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    conclusion = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    receivedat = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    completedat = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    createdat = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    updatedat = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("warrantyclaims_pkey", x => x.claimid);
                    table.ForeignKey(
                        name: "fk_warrantyclaims_customers",
                        column: x => x.customerid,
                        principalTable: "customers",
                        principalColumn: "customerid",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_warrantyclaims_inventoryitems",
                        column: x => x.imei,
                        principalTable: "inventoryitems",
                        principalColumn: "imei",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_warrantyclaims_users",
                        column: x => x.assigneduserid,
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
                    fromstatus = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    tostatus = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    note = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    createdat = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
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

            migrationBuilder.CreateIndex(
                name: "ix_warrantyclaims_assigneduserid",
                table: "warrantyclaims",
                column: "assigneduserid");

            migrationBuilder.CreateIndex(
                name: "ix_warrantyclaims_customerid",
                table: "warrantyclaims",
                column: "customerid");

            migrationBuilder.CreateIndex(
                name: "ix_warrantyclaims_imei",
                table: "warrantyclaims",
                column: "imei");

            migrationBuilder.CreateIndex(
                name: "ix_warrantyclaims_status",
                table: "warrantyclaims",
                column: "status");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "warrantyclaimhistories");

            migrationBuilder.DropTable(
                name: "warrantyclaims");
        }
    }
}
