using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;

namespace ECommerceBackend.Models;

public partial class ECommerceContext : DbContext
{
    public ECommerceContext()
    {
    }

    public ECommerceContext(DbContextOptions<ECommerceContext> options)
        : base(options)
    {
    }

    public virtual DbSet<Auditlog> Auditlogs { get; set; }

    public virtual DbSet<Brand> Brands { get; set; }

    public virtual DbSet<Category> Categories { get; set; }

    public virtual DbSet<Chatmessage> Chatmessages { get; set; }

    public virtual DbSet<Chatsession> Chatsessions { get; set; }

    public virtual DbSet<Customer> Customers { get; set; }

    public virtual DbSet<Inventoryitem> Inventoryitems { get; set; }

    public virtual DbSet<News> News { get; set; }

    public virtual DbSet<Order> Orders { get; set; }

    public virtual DbSet<Orderitem> Orderitems { get; set; }

    public virtual DbSet<Orderpayment> Orderpayments { get; set; }

    public virtual DbSet<Product> Products { get; set; }

    public virtual DbSet<Productimage> Productimages { get; set; }

    public virtual DbSet<Productseries> Productseries { get; set; }

    public virtual DbSet<Productvariant> Productvariants { get; set; }

    public virtual DbSet<Promotionalcontent> Promotionalcontents { get; set; }

    public virtual DbSet<Review> Reviews { get; set; }

    public virtual DbSet<Role> Roles { get; set; }

    public virtual DbSet<User> Users { get; set; }

    public virtual DbSet<Voucher> Vouchers { get; set; }

    public virtual DbSet<Warrantypackage> Warrantypackages { get; set; }

    public virtual DbSet<Cart> Carts { get; set; }

    public virtual DbSet<Cartitem> Cartitems { get; set; }


    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {
        // Connection string is configured in Program.cs via Dependency Injection.
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {


        modelBuilder.Entity<Auditlog>(entity =>
        {
            entity.HasKey(e => e.Logid).HasName("auditlogs_pkey");

            entity.ToTable("auditlogs");

            entity.Property(e => e.Logid).HasColumnName("logid");
            entity.Property(e => e.Action)
                .HasMaxLength(100)
                .HasColumnName("action");
            entity.Property(e => e.Createdat)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp without time zone")
                .HasColumnName("createdat");
            entity.Property(e => e.Recordid)
                .HasMaxLength(50)
                .HasColumnName("recordid");
            entity.Property(e => e.Tablename)
                .HasMaxLength(50)
                .HasColumnName("tablename");
            entity.Property(e => e.Userid).HasColumnName("userid");

            entity.HasOne(d => d.User).WithMany(p => p.Auditlogs)
                .HasForeignKey(d => d.Userid)
                .HasConstraintName("fk_auditlogs_users");
        });



        modelBuilder.Entity<Brand>(entity =>
        {
            entity.HasKey(e => e.Brandid).HasName("brands_pkey");

            entity.ToTable("brands");

            entity.Property(e => e.Brandid).HasColumnName("brandid");
            entity.Property(e => e.Brandname)
                .HasMaxLength(100)
                .HasColumnName("brandname");
        });

        modelBuilder.Entity<Category>(entity =>
        {
            entity.HasKey(e => e.Categoryid).HasName("categories_pkey");

            entity.ToTable("categories");

            entity.Property(e => e.Categoryid).HasColumnName("categoryid");
            entity.Property(e => e.Categoryname)
                .HasMaxLength(100)
                .HasColumnName("categoryname");
            entity.Property(e => e.Description).HasColumnName("description");
        });

        modelBuilder.Entity<Chatmessage>(entity =>
        {
            entity.HasKey(e => e.Messageid).HasName("chatmessages_pkey");

            entity.ToTable("chatmessages");

            entity.Property(e => e.Messageid).HasColumnName("messageid");
            entity.Property(e => e.Messagecontent).HasColumnName("messagecontent");
            entity.Property(e => e.Sendertype)
                .HasMaxLength(50)
                .HasColumnName("sendertype");
            entity.Property(e => e.Sentat)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp without time zone")
                .HasColumnName("sentat");
            entity.Property(e => e.Sessionid).HasColumnName("sessionid");

            entity.HasOne(d => d.Session).WithMany(p => p.Chatmessages)
                .HasForeignKey(d => d.Sessionid)
                .HasConstraintName("fk_chatmessages_chatsessions");
        });

        modelBuilder.Entity<Chatsession>(entity =>
        {
            entity.HasKey(e => e.Sessionid).HasName("chatsessions_pkey");

            entity.ToTable("chatsessions");

            entity.Property(e => e.Sessionid).HasColumnName("sessionid");
            entity.Property(e => e.Customerid).HasColumnName("customerid");
            entity.Property(e => e.Endtime)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("endtime");
            entity.Property(e => e.Guestsessiontoken)
                .HasMaxLength(255)
                .HasColumnName("guestsessiontoken");
            entity.Property(e => e.Starttime)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp without time zone")
                .HasColumnName("starttime");
            entity.Property(e => e.Status)
                .HasMaxLength(50)
                .HasDefaultValueSql("'Active'")
                .HasColumnName("status");
            entity.Property(e => e.Assigneduserid).HasColumnName("assigneduserid");
            entity.Property(e => e.Handoffstatus)
                .HasMaxLength(30)
                .HasColumnName("handoffstatus");
            entity.Property(e => e.Handoffrequestedat)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("handoffrequestedat");

            entity.HasOne(d => d.Customer).WithMany(p => p.Chatsessions)
                .HasForeignKey(d => d.Customerid)
                .HasConstraintName("fk_chatsessions_customers");
        });

        modelBuilder.Entity<Customer>(entity =>
        {
            entity.HasKey(e => e.Customerid).HasName("customers_pkey");

            entity.ToTable("customers");

            entity.HasIndex(e => e.Phone, "customers_phone_key").IsUnique();

            entity.Property(e => e.Customerid).HasColumnName("customerid");
            entity.Property(e => e.Address)
                .HasMaxLength(255)
                .HasColumnName("address");
            entity.Property(e => e.Createdat)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp without time zone")
                .HasColumnName("createdat");
            entity.Property(e => e.Email)
                .HasMaxLength(100)
                .HasColumnName("email");
            entity.Property(e => e.Fullname)
                .HasMaxLength(100)
                .HasColumnName("fullname");
            entity.Property(e => e.Phone)
                .HasMaxLength(20)
                .HasColumnName("phone");
        });

        modelBuilder.Entity<Inventoryitem>(entity =>
        {
            entity.HasKey(e => e.Imei).HasName("inventoryitems_pkey");

            entity.ToTable("inventoryitems");

            entity.Property(e => e.Imei)
                .HasMaxLength(50)
                .HasColumnName("imei");
            entity.Property(e => e.Importedat)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp without time zone")
                .HasColumnName("importedat");
            entity.Property(e => e.Status)
                .HasMaxLength(50)
                .HasDefaultValueSql("'InStock'")
                .HasColumnName("status");
            entity.Property(e => e.Variantid).HasColumnName("variantid");
            entity.Property(e => e.Warrantystartdate)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("warrantystartdate");
            entity.Property(e => e.Warrantyenddate)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("warrantyenddate");
            entity.Property(e => e.Warrantystatus)
                .HasMaxLength(50)
                .HasColumnName("warrantystatus");

            entity.HasOne(d => d.Variant).WithMany(p => p.Inventoryitems)
                .HasForeignKey(d => d.Variantid)
                .HasConstraintName("fk_inventory_variants");
        });

        modelBuilder.Entity<News>(entity =>
        {
            entity.HasKey(e => e.Postid).HasName("news_pkey");

            entity.ToTable("news");

            entity.Property(e => e.Postid).HasColumnName("postid");
            entity.Property(e => e.Content).HasColumnName("content");
            entity.Property(e => e.Createdat)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp without time zone")
                .HasColumnName("createdat");
            entity.Property(e => e.Isactive)
                .HasDefaultValue(true)
                .HasColumnName("isactive");
            entity.Property(e => e.Summary)
                .HasMaxLength(500)
                .HasColumnName("summary");
            entity.Property(e => e.Thumbnail)
                .HasMaxLength(500)
                .HasColumnName("thumbnail");
            entity.Property(e => e.Title)
                .HasMaxLength(255)
                .HasColumnName("title");
            entity.Property(e => e.Userid).HasColumnName("userid");

            entity.HasOne(d => d.User).WithMany(p => p.News)
                .HasForeignKey(d => d.Userid)
                .HasConstraintName("fk_news_users");
        });

        modelBuilder.Entity<Order>(entity =>
        {
            entity.HasKey(e => e.Orderid).HasName("orders_pkey");

            entity.ToTable("orders");

            entity.Property(e => e.Orderid).HasColumnName("orderid");
            entity.Property(e => e.Customerid).HasColumnName("customerid");
            entity.Property(e => e.Discountamount)
                .HasPrecision(18, 2)
                .HasDefaultValueSql("0")
                .HasColumnName("discountamount");
            entity.Property(e => e.Finalamount)
                .HasPrecision(18, 2)
                .HasColumnName("finalamount");
            entity.Property(e => e.Orderdate)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp without time zone")
                .HasColumnName("orderdate");
            entity.Property(e => e.Orderstatus)
                .HasMaxLength(50)
                .HasColumnName("orderstatus");
            entity.Property(e => e.Paymentmethod)
                .HasMaxLength(50)
                .HasColumnName("paymentmethod");
            entity.Property(e => e.Checkouttype)
                .HasMaxLength(20)
                .HasDefaultValue("Registered")
                .HasColumnName("checkouttype");
            entity.Property(e => e.Paymentstatus)
                .HasMaxLength(50)
                .HasDefaultValue("Unpaid")
                .HasColumnName("paymentstatus");
            entity.Property(e => e.Requiredpayment)
                .HasPrecision(18, 2)
                .HasDefaultValueSql("0")
                .HasColumnName("requiredpayment");
            entity.Property(e => e.Paidamount)
                .HasPrecision(18, 2)
                .HasDefaultValueSql("0")
                .HasColumnName("paidamount");
            entity.Property(e => e.Depositpercentage)
                .HasPrecision(5, 2)
                .HasColumnName("depositpercentage");
            entity.Property(e => e.Shippingname)
                .HasMaxLength(100)
                .HasColumnName("shippingname");
            entity.Property(e => e.Shippingphone)
                .HasMaxLength(20)
                .HasColumnName("shippingphone");
            entity.Property(e => e.Shippingemail)
                .HasMaxLength(100)
                .HasColumnName("shippingemail");
            entity.Property(e => e.Shippingaddress)
                .HasMaxLength(500)
                .HasColumnName("shippingaddress");
            entity.Property(e => e.Customernote)
                .HasMaxLength(500)
                .HasColumnName("customernote");
            entity.Property(e => e.Totalamount)
                .HasPrecision(18, 2)
                .HasColumnName("totalamount");
            entity.Property(e => e.Userid).HasColumnName("userid");
            entity.Property(e => e.Vouchercode)
                .HasMaxLength(50)
                .HasColumnName("vouchercode");

            entity.HasOne(d => d.Customer).WithMany(p => p.Orders)
                .HasForeignKey(d => d.Customerid)
                .HasConstraintName("fk_orders_customers");

            entity.HasOne(d => d.User).WithMany(p => p.Orders)
                .HasForeignKey(d => d.Userid)
                .HasConstraintName("fk_orders_users");

            entity.HasOne(d => d.VouchercodeNavigation).WithMany(p => p.Orders)
                .HasForeignKey(d => d.Vouchercode)
                .HasConstraintName("fk_orders_vouchers");
        });

        modelBuilder.Entity<Orderpayment>(entity =>
        {
            entity.HasKey(e => e.Paymentid).HasName("orderpayments_pkey");

            entity.ToTable("orderpayments");

            entity.Property(e => e.Paymentid).HasColumnName("paymentid");
            entity.Property(e => e.Orderid).HasColumnName("orderid");
            entity.Property(e => e.Provider)
                .HasMaxLength(50)
                .HasColumnName("provider");
            entity.Property(e => e.Paymenttype)
                .HasMaxLength(30)
                .HasColumnName("paymenttype");
            entity.Property(e => e.Amount)
                .HasPrecision(18, 2)
                .HasColumnName("amount");
            entity.Property(e => e.Status)
                .HasMaxLength(30)
                .HasColumnName("status");
            entity.Property(e => e.Transactionref)
                .HasMaxLength(100)
                .HasColumnName("transactionref");
            entity.Property(e => e.Createdat)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp without time zone")
                .HasColumnName("createdat");
            entity.Property(e => e.Paidat)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("paidat");

            entity.HasOne(d => d.Order).WithMany(p => p.Orderpayments)
                .HasForeignKey(d => d.Orderid)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("fk_orderpayments_orders");
        });

        modelBuilder.Entity<Orderitem>(entity =>
        {
            entity.HasKey(e => e.Orderitemid).HasName("orderitems_pkey");

            entity.ToTable("orderitems");

            entity.Property(e => e.Orderitemid).HasColumnName("orderitemid");
            entity.Property(e => e.Imei)
                .HasMaxLength(50)
                .HasColumnName("imei");
            entity.Property(e => e.Orderid).HasColumnName("orderid");
            entity.Property(e => e.Packageid).HasColumnName("packageid");
            entity.Property(e => e.Sellingprice)
                .HasPrecision(18, 2)
                .HasColumnName("sellingprice");
            entity.Property(e => e.Warrantyprice)
                .HasPrecision(18, 2)
                .HasDefaultValueSql("0")
                .HasColumnName("warrantyprice");

            entity.HasOne(d => d.ImeiNavigation).WithMany(p => p.Orderitems)
                .HasForeignKey(d => d.Imei)
                .HasConstraintName("fk_orderitems_inventory");

            entity.HasOne(d => d.Order).WithMany(p => p.Orderitems)
                .HasForeignKey(d => d.Orderid)
                .HasConstraintName("fk_orderitems_orders");

            entity.HasOne(d => d.Package).WithMany(p => p.Orderitems)
                .HasForeignKey(d => d.Packageid)
                .HasConstraintName("fk_orderitems_packages");
        });

        modelBuilder.Entity<Product>(entity =>
        {
            entity.HasKey(e => e.Productid).HasName("products_pkey");

            entity.ToTable("products");

            entity.Property(e => e.Productid).HasColumnName("productid");
            entity.Property(e => e.Brandid).HasColumnName("brandid");
            entity.Property(e => e.Categoryid).HasColumnName("categoryid");
            entity.Property(e => e.Seriesid).HasColumnName("seriesid");
            entity.Property(e => e.Createdat)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp without time zone")
                .HasColumnName("createdat");
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.Productname)
                .HasMaxLength(200)
                .HasColumnName("productname");

            entity.HasOne(d => d.Brand).WithMany(p => p.Products)
                .HasForeignKey(d => d.Brandid)
                .HasConstraintName("fk_products_brands");

            entity.HasOne(d => d.Category).WithMany(p => p.Products)
                .HasForeignKey(d => d.Categoryid)
                .HasConstraintName("fk_products_categories");

            entity.HasOne(d => d.Series).WithMany(p => p.Products)
                .HasForeignKey(d => d.Seriesid)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("fk_products_productseries");
        });

        modelBuilder.Entity<Productseries>(entity =>
        {
            entity.HasKey(e => e.Seriesid).HasName("productseries_pkey");

            entity.ToTable("productseries");

            entity.HasIndex(e => new { e.Brandid, e.Seriesname }, "ix_productseries_brandid_seriesname").IsUnique();

            entity.Property(e => e.Seriesid).HasColumnName("seriesid");
            entity.Property(e => e.Brandid).HasColumnName("brandid");
            entity.Property(e => e.Seriesname)
                .HasMaxLength(100)
                .HasColumnName("seriesname");
            entity.Property(e => e.Displayorder)
                .HasDefaultValue(0)
                .HasColumnName("displayorder");
            entity.Property(e => e.Isactive)
                .HasDefaultValue(true)
                .HasColumnName("isactive");
            entity.Property(e => e.Createdat)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp without time zone")
                .HasColumnName("createdat");

            entity.HasOne(d => d.Brand).WithMany(p => p.Productseries)
                .HasForeignKey(d => d.Brandid)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("fk_productseries_brands");
        });



        modelBuilder.Entity<Productimage>(entity =>
        {
            entity.HasKey(e => e.Imageid).HasName("productimages_pkey");

            entity.ToTable("productimages");

            entity.Property(e => e.Imageid).HasColumnName("imageid");
            entity.Property(e => e.Imageurl)
                .HasMaxLength(500)
                .HasColumnName("imageurl");
            entity.Property(e => e.Ismain)
                .HasDefaultValue(false)
                .HasColumnName("ismain");
            entity.Property(e => e.Variantid).HasColumnName("variantid");

            entity.HasOne(d => d.Variant).WithMany(p => p.Productimages)
                .HasForeignKey(d => d.Variantid)
                .HasConstraintName("fk_images_variants");
        });

        modelBuilder.Entity<Productvariant>(entity =>
        {
            entity.HasKey(e => e.Variantid).HasName("productvariants_pkey");

            entity.ToTable("productvariants");

            entity.HasIndex(e => e.Sku, "productvariants_sku_key").IsUnique();

            entity.Property(e => e.Variantid).HasColumnName("variantid");
            entity.Property(e => e.Baseprice)
                .HasPrecision(18, 2)
                .HasColumnName("baseprice");
            entity.Property(e => e.Productid).HasColumnName("productid");
            entity.Property(e => e.Saleprice)
                .HasPrecision(18, 2)
                .HasColumnName("saleprice");
            entity.Property(e => e.Sku)
                .HasMaxLength(50)
                .HasColumnName("sku");
            entity.Property(e => e.Condition)
                .HasMaxLength(50)
                .HasColumnName("condition");
            entity.Property(e => e.Specifications)
                .HasColumnType("text")
                .HasColumnName("specifications");

            entity.HasOne(d => d.Product).WithMany(p => p.Productvariants)
                .HasForeignKey(d => d.Productid)
                .HasConstraintName("fk_variants_products");
        });



        modelBuilder.Entity<Review>(entity =>
        {
            entity.HasKey(e => e.Reviewid).HasName("reviews_pkey");

            entity.ToTable("reviews");

            entity.Property(e => e.Reviewid).HasColumnName("reviewid");
            entity.Property(e => e.Comment).HasColumnName("comment");
            entity.Property(e => e.Createdat)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp without time zone")
                .HasColumnName("createdat");
            entity.Property(e => e.Customerid).HasColumnName("customerid");
            entity.Property(e => e.Rating).HasColumnName("rating");
            entity.Property(e => e.Variantid).HasColumnName("variantid");

            entity.HasOne(d => d.Customer).WithMany(p => p.Reviews)
                .HasForeignKey(d => d.Customerid)
                .HasConstraintName("fk_reviews_customers");

            entity.HasOne(d => d.Variant).WithMany(p => p.Reviews)
                .HasForeignKey(d => d.Variantid)
                .HasConstraintName("fk_reviews_variants");
        });

        modelBuilder.Entity<Role>(entity =>
        {
            entity.HasKey(e => e.Roleid).HasName("roles_pkey");

            entity.ToTable("roles");

            entity.Property(e => e.Roleid).HasColumnName("roleid");
            entity.Property(e => e.Rolename)
                .HasMaxLength(50)
                .HasColumnName("rolename");
        });



        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.Userid).HasName("users_pkey");

            entity.ToTable("users");

            entity.HasIndex(e => e.Username, "users_username_key").IsUnique();

            entity.Property(e => e.Userid).HasColumnName("userid");
            entity.Property(e => e.Createdat)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp without time zone")
                .HasColumnName("createdat");
            entity.Property(e => e.Email)
                .HasMaxLength(100)
                .HasColumnName("email");
            entity.Property(e => e.Fullname)
                .HasMaxLength(100)
                .HasColumnName("fullname");
            entity.Property(e => e.Isactive)
                .HasDefaultValue(true)
                .HasColumnName("isactive");
            entity.Property(e => e.Passwordhash)
                .HasMaxLength(255)
                .HasColumnName("passwordhash");
            entity.Property(e => e.Phone)
                .HasMaxLength(20)
                .HasColumnName("phone");
            entity.Property(e => e.Roleid).HasColumnName("roleid");
            entity.Property(e => e.Username)
                .HasMaxLength(50)
                .HasColumnName("username");

            entity.HasOne(d => d.Role).WithMany(p => p.Users)
                .HasForeignKey(d => d.Roleid)
                .HasConstraintName("fk_users_roles");
        });

        modelBuilder.Entity<Voucher>(entity =>
        {
            entity.HasKey(e => e.Vouchercode).HasName("vouchers_pkey");

            entity.ToTable("vouchers");

            entity.Property(e => e.Vouchercode)
                .HasMaxLength(50)
                .HasColumnName("vouchercode");
            entity.Property(e => e.Discountamount)
                .HasPrecision(18, 2)
                .HasColumnName("discountamount");
            entity.Property(e => e.Discountpercentage).HasColumnName("discountpercentage");
            entity.Property(e => e.Isactive)
                .HasDefaultValue(true)
                .HasColumnName("isactive");
            entity.Property(e => e.Validfrom)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("validfrom");
            entity.Property(e => e.Validto)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("validto");
        });

        modelBuilder.Entity<Promotionalcontent>(entity =>
        {
            entity.HasKey(e => e.Contentid).HasName("promotionalcontents_pkey");

            entity.ToTable("promotionalcontents");

            entity.Property(e => e.Contentid).HasColumnName("contentid");
            entity.Property(e => e.Contenttype)
                .HasMaxLength(50)
                .HasColumnName("contenttype");
            entity.Property(e => e.Title)
                .HasMaxLength(200)
                .HasColumnName("title");
            entity.Property(e => e.Imageurl)
                .HasMaxLength(500)
                .HasColumnName("imageurl");
            entity.Property(e => e.Linkurl)
                .HasMaxLength(500)
                .HasColumnName("linkurl");
            entity.Property(e => e.Displayorder)
                .HasDefaultValue(0)
                .HasColumnName("displayorder");
            entity.Property(e => e.Isactive)
                .HasDefaultValue(true)
                .HasColumnName("isactive");
            entity.Property(e => e.Createdat)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp without time zone")
                .HasColumnName("createdat");
        });

        modelBuilder.Entity<Warrantypackage>(entity =>
        {
            entity.HasKey(e => e.Packageid).HasName("warrantypackages_pkey");

            entity.ToTable("warrantypackages");

            entity.Property(e => e.Packageid).HasColumnName("packageid");
            entity.Property(e => e.Durationmonths).HasColumnName("durationmonths");
            entity.Property(e => e.Packagename)
                .HasMaxLength(100)
                .HasColumnName("packagename");
            entity.Property(e => e.Price)
                .HasPrecision(18, 2)
                .HasColumnName("price");
        });

        modelBuilder.Entity<Cart>(entity =>
        {
            entity.HasKey(e => e.Cartid).HasName("carts_pkey");

            entity.ToTable("carts");

            entity.HasIndex(e => e.Userid, "carts_userid_key").IsUnique();

            entity.Property(e => e.Cartid).HasColumnName("cartid");
            entity.Property(e => e.Userid).HasColumnName("userid");
            entity.Property(e => e.Createdat)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp without time zone")
                .HasColumnName("createdat");
            entity.Property(e => e.Updatedat)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp without time zone")
                .HasColumnName("updatedat");

            entity.HasOne(d => d.User).WithOne(p => p.Cart)
                .HasForeignKey<Cart>(d => d.Userid)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("fk_carts_users");
        });

        modelBuilder.Entity<Cartitem>(entity =>
        {
            entity.HasKey(e => e.Cartitemid).HasName("cartitems_pkey");

            entity.ToTable("cartitems");

            entity.Property(e => e.Cartitemid).HasColumnName("cartitemid");
            entity.Property(e => e.Cartid).HasColumnName("cartid");
            entity.Property(e => e.Variantid).HasColumnName("variantid");
            entity.Property(e => e.Quantity).HasColumnName("quantity");
            entity.Property(e => e.Createdat)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp without time zone")
                .HasColumnName("createdat");

            entity.HasOne(d => d.Cart).WithMany(p => p.Cartitems)
                .HasForeignKey(d => d.Cartid)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("fk_cartitems_carts");

            entity.HasOne(d => d.Variant).WithMany(p => p.Cartitems)
                .HasForeignKey(d => d.Variantid)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("fk_cartitems_productvariants");
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
