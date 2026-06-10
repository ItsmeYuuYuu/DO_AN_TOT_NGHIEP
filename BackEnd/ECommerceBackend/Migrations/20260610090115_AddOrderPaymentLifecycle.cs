using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ECommerceBackend.Migrations
{
    /// <inheritdoc />
    public partial class AddOrderPaymentLifecycle : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancellationreason character varying(500);
                ALTER TABLE orders ADD COLUMN IF NOT EXISTS guesttoken character varying(100);
                ALTER TABLE orders ADD COLUMN IF NOT EXISTS paymenttoken character varying(100);
                ALTER TABLE orders ADD COLUMN IF NOT EXISTS reservationexpiresat timestamp without time zone;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                ALTER TABLE orders DROP COLUMN IF EXISTS cancellationreason;
                ALTER TABLE orders DROP COLUMN IF EXISTS guesttoken;
                ALTER TABLE orders DROP COLUMN IF EXISTS paymenttoken;
                ALTER TABLE orders DROP COLUMN IF EXISTS reservationexpiresat;
                """);
        }
    }
}
