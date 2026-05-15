using Microsoft.EntityFrameworkCore;

namespace ECommerceBackend.Models;

/// <summary>
/// Partial class mở rộng ECommerceContext (scaffolded).
/// Định nghĩa tất cả Database Indexes qua Fluent API.
/// KHÔNG sửa file ECommerceContext.cs gốc để tránh mất khi re-scaffold.
/// </summary>
public partial class ECommerceContext
{
    partial void OnModelCreatingPartial(ModelBuilder modelBuilder)
    {
        // ── USERS ─────────────────────────────────────────────────────────────
        modelBuilder.Entity<User>(entity =>
        {
            // Unique index on username (used as login identifier)
            entity.HasIndex(e => e.Username)
                  .HasDatabaseName("ix_users_username")
                  .IsUnique();

            // Unique index on email
            entity.HasIndex(e => e.Email)
                  .HasDatabaseName("ix_users_email")
                  .IsUnique()
                  .HasFilter("email IS NOT NULL"); // Allow NULL emails on other rows

            // Index on roleid (frequently used in JOIN & filter)
            entity.HasIndex(e => e.Roleid)
                  .HasDatabaseName("ix_users_roleid");

            // Index on isactive (filter for active users)
            entity.HasIndex(e => e.Isactive)
                  .HasDatabaseName("ix_users_isactive");
        });

        // ── PRODUCTS ─────────────────────────────────────────────────────────
        modelBuilder.Entity<Product>(entity =>
        {
            // Index on product name for search
            entity.HasIndex(e => e.Productname)
                  .HasDatabaseName("ix_products_productname");

            // Composite index for category+brand filtering
            entity.HasIndex(e => new { e.Categoryid, e.Brandid })
                  .HasDatabaseName("ix_products_categoryid_brandid");

            // Index on categoryid and brandid individually for FK lookups
            entity.HasIndex(e => e.Categoryid)
                  .HasDatabaseName("ix_products_categoryid");

            entity.HasIndex(e => e.Brandid)
                  .HasDatabaseName("ix_products_brandid");
        });

        // ── PRODUCT VARIANTS ──────────────────────────────────────────────────
        modelBuilder.Entity<Productvariant>(entity =>
        {
            // Unique SKU
            entity.HasIndex(e => e.Sku)
                  .HasDatabaseName("ix_productvariants_sku")
                  .IsUnique()
                  .HasFilter("sku IS NOT NULL");

            // Index on productid (most common JOIN)
            entity.HasIndex(e => e.Productid)
                  .HasDatabaseName("ix_productvariants_productid");

            // Index on base/sale price for price-range queries
            entity.HasIndex(e => e.Baseprice)
                  .HasDatabaseName("ix_productvariants_baseprice");

            entity.HasIndex(e => e.Saleprice)
                  .HasDatabaseName("ix_productvariants_saleprice");
        });

        // ── CATEGORIES ───────────────────────────────────────────────────────
        modelBuilder.Entity<Category>(entity =>
        {
            entity.HasIndex(e => e.Categoryname)
                  .HasDatabaseName("ix_categories_categoryname")
                  .IsUnique();
        });

        // ── BRANDS ───────────────────────────────────────────────────────────
        modelBuilder.Entity<Brand>(entity =>
        {
            entity.HasIndex(e => e.Brandname)
                  .HasDatabaseName("ix_brands_brandname")
                  .IsUnique();
        });

        // ── ORDERS ───────────────────────────────────────────────────────────
        modelBuilder.Entity<Order>(entity =>
        {
            // Index on status for filtering by state (Pending/Shipped/etc)
            entity.HasIndex(e => e.Orderstatus)
                  .HasDatabaseName("ix_orders_orderstatus");

            // Index on orderdate for date-range queries and sorting
            entity.HasIndex(e => e.Orderdate)
                  .HasDatabaseName("ix_orders_orderdate");

            // Composite: customer + date (most common query pattern in reports)
            entity.HasIndex(e => new { e.Customerid, e.Orderdate })
                  .HasDatabaseName("ix_orders_customerid_orderdate");

            entity.HasIndex(e => e.Userid)
                  .HasDatabaseName("ix_orders_userid");
        });

        // ── ORDER ITEMS ───────────────────────────────────────────────────────
        modelBuilder.Entity<Orderitem>(entity =>
        {
            entity.HasIndex(e => e.Orderid)
                  .HasDatabaseName("ix_orderitems_orderid");

            // Orderitem links to inventory via IMEI, not variantid
            entity.HasIndex(e => e.Imei)
                  .HasDatabaseName("ix_orderitems_imei");
        });

        // ── INVENTORY ────────────────────────────────────────────────────────
        modelBuilder.Entity<Inventoryitem>(entity =>
        {
            entity.HasIndex(e => e.Variantid)
                  .HasDatabaseName("ix_inventory_variantid");
        });

        // ── REVIEWS ──────────────────────────────────────────────────────────
        modelBuilder.Entity<Review>(entity =>
        {
            entity.HasIndex(e => e.Variantid)
                  .HasDatabaseName("ix_reviews_variantid");

            entity.HasIndex(e => e.Customerid)
                  .HasDatabaseName("ix_reviews_customerid");
        });

        // ── CUSTOMERS ────────────────────────────────────────────────────────
        modelBuilder.Entity<Customer>(entity =>
        {
            entity.HasIndex(e => e.Email)
                  .HasDatabaseName("ix_customers_email")
                  .HasFilter("email IS NOT NULL");

            entity.HasIndex(e => e.Phone)
                  .HasDatabaseName("ix_customers_phone")
                  .HasFilter("phone IS NOT NULL");
        });

        // ── AUDIT LOGS ────────────────────────────────────────────────────────
        modelBuilder.Entity<Auditlog>(entity =>
        {
            entity.HasIndex(e => e.Userid)
                  .HasDatabaseName("ix_auditlogs_userid");
        });
    }
}
