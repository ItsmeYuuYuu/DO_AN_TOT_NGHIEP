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

    public virtual DbSet<Chatproductrecommendation> Chatproductrecommendations { get; set; }

    public virtual DbSet<Chatsession> Chatsessions { get; set; }

    public virtual DbSet<Customer> Customers { get; set; }

    public virtual DbSet<Homepageproductsection> Homepageproductsections { get; set; }

    public virtual DbSet<Homepageproductsectionitem> Homepageproductsectionitems { get; set; }

    public virtual DbSet<Inventoryitem> Inventoryitems { get; set; }

    public virtual DbSet<Inventorytransaction> Inventorytransactions { get; set; }

    public virtual DbSet<News> News { get; set; }

    public virtual DbSet<Order> Orders { get; set; }

    public virtual DbSet<Orderassignment> Orderassignments { get; set; }

    public virtual DbSet<Orderitem> Orderitems { get; set; }

    public virtual DbSet<Orderpayment> Orderpayments { get; set; }

    public virtual DbSet<Product> Products { get; set; }

    public virtual DbSet<Productimage> Productimages { get; set; }

    public virtual DbSet<Productseries> Productseries { get; set; }

    public virtual DbSet<Productvariant> Productvariants { get; set; }

    public virtual DbSet<Promotionalcontent> Promotionalcontents { get; set; }

    public virtual DbSet<Review> Reviews { get; set; }

    public virtual DbSet<Returnrequest> Returnrequests { get; set; }

    public virtual DbSet<Returnitem> Returnitems { get; set; }

    public virtual DbSet<Returnrequesthistory> Returnrequesthistories { get; set; }

    public virtual DbSet<Refundtransaction> Refundtransactions { get; set; }

    public virtual DbSet<Shipment> Shipments { get; set; }

    public virtual DbSet<Shipmenthistory> Shipmenthistories { get; set; }

    public virtual DbSet<Role> Roles { get; set; }

    public virtual DbSet<User> Users { get; set; }

    public virtual DbSet<Voucher> Vouchers { get; set; }

    public virtual DbSet<Warrantypackage> Warrantypackages { get; set; }

    public virtual DbSet<Warrantyclaim> Warrantyclaims { get; set; }

    public virtual DbSet<Warrantyclaimhistory> Warrantyclaimhistories { get; set; }

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
            entity.Property(e => e.Quickreplies)
                .HasColumnType("jsonb")
                .HasColumnName("quickreplies");
            entity.Property(e => e.Responsetype)
                .HasMaxLength(30)
                .HasColumnName("responsetype");
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

        modelBuilder.Entity<Chatproductrecommendation>(entity =>
        {
            entity.HasKey(e => e.Recommendationid)
                .HasName("chatproductrecommendations_pkey");

            entity.ToTable("chatproductrecommendations");

            entity.HasIndex(e => new { e.Messageid, e.Variantid },
                    "chatproductrecommendations_messageid_variantid_key")
                .IsUnique();
            entity.HasIndex(e => e.Productid, "ix_chatproductrecommendations_productid");
            entity.HasIndex(e => e.Variantid, "ix_chatproductrecommendations_variantid");
            entity.HasIndex(e => e.Addedtocartat, "ix_chatproductrecommendations_addedtocartat");
            entity.HasIndex(e => e.Orderedat, "ix_chatproductrecommendations_orderedat");
            entity.HasIndex(e => e.Orderid, "ix_chatproductrecommendations_orderid");

            entity.Property(e => e.Recommendationid).HasColumnName("recommendationid");
            entity.Property(e => e.Messageid).HasColumnName("messageid");
            entity.Property(e => e.Productid).HasColumnName("productid");
            entity.Property(e => e.Variantid).HasColumnName("variantid");
            entity.Property(e => e.Rank).HasColumnName("rank");
            entity.Property(e => e.Createdat)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp without time zone")
                .HasColumnName("createdat");
            entity.Property(e => e.Addedtocartat)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("addedtocartat");
            entity.Property(e => e.Orderedat)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("orderedat");
            entity.Property(e => e.Orderid).HasColumnName("orderid");

            entity.HasOne(e => e.Message)
                .WithMany(e => e.Chatproductrecommendations)
                .HasForeignKey(e => e.Messageid)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("fk_chatproductrecommendations_messages");
            entity.HasOne(e => e.Product)
                .WithMany(e => e.Chatproductrecommendations)
                .HasForeignKey(e => e.Productid)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("fk_chatproductrecommendations_products");
            entity.HasOne(e => e.Variant)
                .WithMany(e => e.Chatproductrecommendations)
                .HasForeignKey(e => e.Variantid)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("fk_chatproductrecommendations_variants");
            entity.HasOne(e => e.Order)
                .WithMany(e => e.Chatproductrecommendations)
                .HasForeignKey(e => e.Orderid)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("fk_chatproductrecommendations_orders");
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

        modelBuilder.Entity<Homepageproductsection>(entity =>
        {
            entity.HasKey(e => e.Sectionid).HasName("homepageproductsections_pkey");

            entity.ToTable("homepageproductsections");

            entity.HasIndex(e => e.Sectionkey, "homepageproductsections_sectionkey_key").IsUnique();
            entity.HasIndex(e => new { e.Isactive, e.Displayorder }, "ix_homepageproductsections_active_order");

            entity.Property(e => e.Sectionid).HasColumnName("sectionid");
            entity.Property(e => e.Sectionkey)
                .HasMaxLength(50)
                .HasColumnName("sectionkey");
            entity.Property(e => e.Title)
                .HasMaxLength(120)
                .HasColumnName("title");
            entity.Property(e => e.Subtitle)
                .HasMaxLength(300)
                .HasColumnName("subtitle");
            entity.Property(e => e.Theme)
                .HasMaxLength(30)
                .HasDefaultValue("LightBlue")
                .HasColumnName("theme");
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

        modelBuilder.Entity<Homepageproductsectionitem>(entity =>
        {
            entity.HasKey(e => e.Itemid).HasName("homepageproductsectionitems_pkey");

            entity.ToTable("homepageproductsectionitems");

            entity.HasIndex(e => new { e.Sectionid, e.Productid }, "homepageproductsectionitems_sectionid_productid_key").IsUnique();
            entity.HasIndex(e => e.Productid, "ix_homepageproductsectionitems_productid");
            entity.HasIndex(e => new { e.Sectionid, e.Isactive, e.Displayorder }, "ix_homepageproductsectionitems_section_active_order");

            entity.Property(e => e.Itemid).HasColumnName("itemid");
            entity.Property(e => e.Sectionid).HasColumnName("sectionid");
            entity.Property(e => e.Productid).HasColumnName("productid");
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

            entity.HasOne(e => e.Section).WithMany(e => e.Items)
                .HasForeignKey(e => e.Sectionid)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("fk_homepageproductsectionitems_sections");

            entity.HasOne(e => e.Product).WithMany(e => e.Homepageproductsectionitems)
                .HasForeignKey(e => e.Productid)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("fk_homepageproductsectionitems_products");
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

        modelBuilder.Entity<Inventorytransaction>(entity =>
        {
            entity.HasKey(e => e.Transactionid).HasName("inventorytransactions_pkey");

            entity.ToTable("inventorytransactions");

            entity.HasIndex(e => e.Imei, "ix_inventorytransactions_imei");
            entity.HasIndex(e => e.Orderid, "ix_inventorytransactions_orderid");
            entity.HasIndex(e => e.Userid, "ix_inventorytransactions_userid");
            entity.HasIndex(e => e.Createdat, "ix_inventorytransactions_createdat");

            entity.Property(e => e.Transactionid).HasColumnName("transactionid");
            entity.Property(e => e.Imei)
                .HasMaxLength(50)
                .HasColumnName("imei");
            entity.Property(e => e.Orderid).HasColumnName("orderid");
            entity.Property(e => e.Userid).HasColumnName("userid");
            entity.Property(e => e.Transactiontype)
                .HasMaxLength(30)
                .HasColumnName("transactiontype");
            entity.Property(e => e.Fromstatus)
                .HasMaxLength(50)
                .HasColumnName("fromstatus");
            entity.Property(e => e.Tostatus)
                .HasMaxLength(50)
                .HasColumnName("tostatus");
            entity.Property(e => e.Note)
                .HasMaxLength(500)
                .HasColumnName("note");
            entity.Property(e => e.Createdat)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp without time zone")
                .HasColumnName("createdat");

            entity.HasOne(d => d.Inventoryitem).WithMany(p => p.Inventorytransactions)
                .HasForeignKey(d => d.Imei)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("fk_inventorytransactions_inventory");

            entity.HasOne(d => d.Order).WithMany(p => p.Inventorytransactions)
                .HasForeignKey(d => d.Orderid)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("fk_inventorytransactions_orders");

            entity.HasOne(d => d.User).WithMany(p => p.Inventorytransactions)
                .HasForeignKey(d => d.Userid)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("fk_inventorytransactions_users");
        });

        modelBuilder.Entity<Warrantyclaim>(entity =>
        {
            entity.HasKey(e => e.Claimid).HasName("warrantyclaims_pkey");

            entity.ToTable("warrantyclaims");

            entity.HasIndex(e => e.Imei, "ix_warrantyclaims_imei");
            entity.HasIndex(e => e.Customerid, "ix_warrantyclaims_customerid");
            entity.HasIndex(e => e.Assigneduserid, "ix_warrantyclaims_assigneduserid");
            entity.HasIndex(e => e.Status, "ix_warrantyclaims_status");

            entity.Property(e => e.Claimid).HasColumnName("claimid");
            entity.Property(e => e.Imei)
                .HasMaxLength(50)
                .HasColumnName("imei");
            entity.Property(e => e.Customerid).HasColumnName("customerid");
            entity.Property(e => e.Assigneduserid).HasColumnName("assigneduserid");
            entity.Property(e => e.Faultdescription)
                .HasMaxLength(2000)
                .HasColumnName("faultdescription");
            entity.Property(e => e.Status)
                .HasMaxLength(30)
                .HasDefaultValue("Received")
                .HasColumnName("status");
            entity.Property(e => e.Coverage)
                .HasMaxLength(30)
                .HasColumnName("coverage");
            entity.Property(e => e.Imageurls)
                .HasColumnType("text")
                .HasColumnName("imageurls");
            entity.Property(e => e.Estimatedcost)
                .HasPrecision(18, 2)
                .HasColumnName("estimatedcost");
            entity.Property(e => e.Finalcost)
                .HasPrecision(18, 2)
                .HasColumnName("finalcost");
            entity.Property(e => e.Conclusion)
                .HasMaxLength(2000)
                .HasColumnName("conclusion");
            entity.Property(e => e.Receivedat)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("receivedat");
            entity.Property(e => e.Completedat)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("completedat");
            entity.Property(e => e.Createdat)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp without time zone")
                .HasColumnName("createdat");
            entity.Property(e => e.Updatedat)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp without time zone")
                .HasColumnName("updatedat");

            entity.HasOne(e => e.Inventoryitem).WithMany(e => e.Warrantyclaims)
                .HasForeignKey(e => e.Imei)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("fk_warrantyclaims_inventoryitems");

            entity.HasOne(e => e.Customer).WithMany(e => e.Warrantyclaims)
                .HasForeignKey(e => e.Customerid)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("fk_warrantyclaims_customers");

            entity.HasOne(e => e.Assigneduser).WithMany(e => e.AssignedWarrantyclaims)
                .HasForeignKey(e => e.Assigneduserid)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("fk_warrantyclaims_users");
        });

        modelBuilder.Entity<Warrantyclaimhistory>(entity =>
        {
            entity.HasKey(e => e.Historyid).HasName("warrantyclaimhistories_pkey");

            entity.ToTable("warrantyclaimhistories");

            entity.HasIndex(e => e.Claimid, "ix_warrantyclaimhistories_claimid");
            entity.HasIndex(e => e.Createdat, "ix_warrantyclaimhistories_createdat");

            entity.Property(e => e.Historyid).HasColumnName("historyid");
            entity.Property(e => e.Claimid).HasColumnName("claimid");
            entity.Property(e => e.Userid).HasColumnName("userid");
            entity.Property(e => e.Fromstatus)
                .HasMaxLength(30)
                .HasColumnName("fromstatus");
            entity.Property(e => e.Tostatus)
                .HasMaxLength(30)
                .HasColumnName("tostatus");
            entity.Property(e => e.Note)
                .HasMaxLength(1000)
                .HasColumnName("note");
            entity.Property(e => e.Createdat)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp without time zone")
                .HasColumnName("createdat");

            entity.HasOne(e => e.Claim).WithMany(e => e.Histories)
                .HasForeignKey(e => e.Claimid)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("fk_warrantyclaimhistories_claims");

            entity.HasOne(e => e.User).WithMany(e => e.Warrantyclaimhistories)
                .HasForeignKey(e => e.Userid)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("fk_warrantyclaimhistories_users");
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
            entity.Property(e => e.Reservationexpiresat)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("reservationexpiresat");
            entity.Property(e => e.Paymenttoken)
                .HasMaxLength(100)
                .HasColumnName("paymenttoken");
            entity.Property(e => e.Guesttoken)
                .HasMaxLength(100)
                .HasColumnName("guesttoken");
            entity.Property(e => e.Cancellationreason)
                .HasMaxLength(500)
                .HasColumnName("cancellationreason");
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

        modelBuilder.Entity<Shipment>(entity =>
        {
            entity.HasKey(e => e.Shipmentid).HasName("shipments_pkey");
            entity.ToTable("shipments");

            entity.HasIndex(e => e.Orderid, "ux_shipments_orderid").IsUnique();
            entity.HasIndex(e => e.Trackingcode, "ux_shipments_trackingcode").IsUnique();
            entity.HasIndex(e => new { e.Status, e.Updatedat }, "ix_shipments_status_updatedat");

            entity.Property(e => e.Shipmentid).HasColumnName("shipmentid");
            entity.Property(e => e.Orderid).HasColumnName("orderid");
            entity.Property(e => e.Carrier).HasMaxLength(30).HasColumnName("carrier");
            entity.Property(e => e.Trackingcode).HasMaxLength(100).HasColumnName("trackingcode");
            entity.Property(e => e.Shippingfee).HasPrecision(18, 2).HasColumnName("shippingfee");
            entity.Property(e => e.Status).HasMaxLength(30).HasColumnName("status");
            entity.Property(e => e.Estimateddeliveryat).HasColumnType("timestamp without time zone").HasColumnName("estimateddeliveryat");
            entity.Property(e => e.Deliveryattempts).HasDefaultValue(0).HasColumnName("deliveryattempts");
            entity.Property(e => e.Createdbyuserid).HasColumnName("createdbyuserid");
            entity.Property(e => e.Createdat).HasDefaultValueSql("CURRENT_TIMESTAMP").HasColumnType("timestamp without time zone").HasColumnName("createdat");
            entity.Property(e => e.Updatedat).HasColumnType("timestamp without time zone").HasColumnName("updatedat");
            entity.Property(e => e.Pickedupat).HasColumnType("timestamp without time zone").HasColumnName("pickedupat");
            entity.Property(e => e.Deliveredat).HasColumnType("timestamp without time zone").HasColumnName("deliveredat");
            entity.Property(e => e.Returnedat).HasColumnType("timestamp without time zone").HasColumnName("returnedat");

            entity.HasOne(e => e.Order).WithOne(e => e.Shipment)
                .HasForeignKey<Shipment>(e => e.Orderid)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("fk_shipments_orders");
            entity.HasOne(e => e.Createdbyuser).WithMany(e => e.CreatedShipments)
                .HasForeignKey(e => e.Createdbyuserid)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("fk_shipments_users");
        });

        modelBuilder.Entity<Shipmenthistory>(entity =>
        {
            entity.HasKey(e => e.Historyid).HasName("shipmenthistories_pkey");
            entity.ToTable("shipmenthistories");

            entity.HasIndex(e => new { e.Shipmentid, e.Createdat }, "ix_shipmenthistories_shipment_createdat");

            entity.Property(e => e.Historyid).HasColumnName("historyid");
            entity.Property(e => e.Shipmentid).HasColumnName("shipmentid");
            entity.Property(e => e.Userid).HasColumnName("userid");
            entity.Property(e => e.Fromstatus).HasMaxLength(30).HasColumnName("fromstatus");
            entity.Property(e => e.Tostatus).HasMaxLength(30).HasColumnName("tostatus");
            entity.Property(e => e.Note).HasMaxLength(1000).HasColumnName("note");
            entity.Property(e => e.Createdat).HasDefaultValueSql("CURRENT_TIMESTAMP").HasColumnType("timestamp without time zone").HasColumnName("createdat");

            entity.HasOne(e => e.Shipment).WithMany(e => e.Histories)
                .HasForeignKey(e => e.Shipmentid)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("fk_shipmenthistories_shipments");
            entity.HasOne(e => e.User).WithMany(e => e.Shipmenthistories)
                .HasForeignKey(e => e.Userid)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("fk_shipmenthistories_users");
        });

        modelBuilder.Entity<Returnrequest>(entity =>
        {
            entity.HasKey(e => e.Returnrequestid).HasName("returnrequests_pkey");
            entity.ToTable("returnrequests");

            entity.HasIndex(e => e.Orderid, "ix_returnrequests_orderid");
            entity.HasIndex(e => e.Customerid, "ix_returnrequests_customerid");
            entity.HasIndex(e => e.Assigneduserid, "ix_returnrequests_assigneduserid");
            entity.HasIndex(e => new { e.Status, e.Updatedat }, "ix_returnrequests_status_updatedat");

            entity.Property(e => e.Returnrequestid).HasColumnName("returnrequestid");
            entity.Property(e => e.Orderid).HasColumnName("orderid");
            entity.Property(e => e.Customerid).HasColumnName("customerid");
            entity.Property(e => e.Requestedbyuserid).HasColumnName("requestedbyuserid");
            entity.Property(e => e.Assigneduserid).HasColumnName("assigneduserid");
            entity.Property(e => e.Requesttype).HasMaxLength(20).HasColumnName("requesttype");
            entity.Property(e => e.Reason).HasMaxLength(200).HasColumnName("reason");
            entity.Property(e => e.Description).HasMaxLength(2000).HasColumnName("description");
            entity.Property(e => e.Status).HasMaxLength(30).HasColumnName("status");
            entity.Property(e => e.Imageurls).HasColumnType("text").HasColumnName("imageurls");
            entity.Property(e => e.Reviewnote).HasMaxLength(1000).HasColumnName("reviewnote");
            entity.Property(e => e.Resolution).HasMaxLength(2000).HasColumnName("resolution");
            entity.Property(e => e.Requestedrefundamount).HasPrecision(18, 2).HasColumnName("requestedrefundamount");
            entity.Property(e => e.Refundamount).HasPrecision(18, 2).HasColumnName("refundamount");
            entity.Property(e => e.Refundstatus).HasMaxLength(30).HasColumnName("refundstatus");
            entity.Property(e => e.Requestedat).HasColumnType("timestamp without time zone").HasColumnName("requestedat");
            entity.Property(e => e.Reviewedat).HasColumnType("timestamp without time zone").HasColumnName("reviewedat");
            entity.Property(e => e.Receivedat).HasColumnType("timestamp without time zone").HasColumnName("receivedat");
            entity.Property(e => e.Completedat).HasColumnType("timestamp without time zone").HasColumnName("completedat");
            entity.Property(e => e.Updatedat).HasColumnType("timestamp without time zone").HasColumnName("updatedat");

            entity.HasOne(e => e.Order).WithMany(e => e.Returnrequests)
                .HasForeignKey(e => e.Orderid)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("fk_returnrequests_orders");
            entity.HasOne(e => e.Customer).WithMany(e => e.Returnrequests)
                .HasForeignKey(e => e.Customerid)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("fk_returnrequests_customers");
            entity.HasOne(e => e.Requestedbyuser).WithMany(e => e.RequestedReturnrequests)
                .HasForeignKey(e => e.Requestedbyuserid)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("fk_returnrequests_requested_users");
            entity.HasOne(e => e.Assigneduser).WithMany(e => e.AssignedReturnrequests)
                .HasForeignKey(e => e.Assigneduserid)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("fk_returnrequests_assigned_users");
        });

        modelBuilder.Entity<Returnitem>(entity =>
        {
            entity.HasKey(e => e.Returnitemid).HasName("returnitems_pkey");
            entity.ToTable("returnitems");

            entity.HasIndex(e => new { e.Returnrequestid, e.Orderitemid }, "ux_returnitems_request_orderitem")
                .IsUnique();
            entity.HasIndex(e => e.Imei, "ix_returnitems_imei");
            entity.HasIndex(e => e.Replacementimei, "ix_returnitems_replacementimei");

            entity.Property(e => e.Returnitemid).HasColumnName("returnitemid");
            entity.Property(e => e.Returnrequestid).HasColumnName("returnrequestid");
            entity.Property(e => e.Orderitemid).HasColumnName("orderitemid");
            entity.Property(e => e.Imei).HasMaxLength(50).HasColumnName("imei");
            entity.Property(e => e.Condition).HasMaxLength(1000).HasColumnName("condition");
            entity.Property(e => e.Disposition).HasMaxLength(30).HasColumnName("disposition");
            entity.Property(e => e.Replacementimei).HasMaxLength(50).HasColumnName("replacementimei");
            entity.Property(e => e.Refundamount).HasPrecision(18, 2).HasColumnName("refundamount");

            entity.HasOne(e => e.Returnrequest).WithMany(e => e.Returnitems)
                .HasForeignKey(e => e.Returnrequestid)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("fk_returnitems_requests");
            entity.HasOne(e => e.Orderitem).WithMany(e => e.Returnitems)
                .HasForeignKey(e => e.Orderitemid)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("fk_returnitems_orderitems");
            entity.HasOne(e => e.Inventoryitem).WithMany(e => e.Returnitems)
                .HasForeignKey(e => e.Imei)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("fk_returnitems_inventory");
            entity.HasOne(e => e.Replacementinventoryitem).WithMany(e => e.ReplacementReturnitems)
                .HasForeignKey(e => e.Replacementimei)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("fk_returnitems_replacement_inventory");
        });

        modelBuilder.Entity<Returnrequesthistory>(entity =>
        {
            entity.HasKey(e => e.Historyid).HasName("returnrequesthistories_pkey");
            entity.ToTable("returnrequesthistories");

            entity.HasIndex(e => e.Returnrequestid, "ix_returnrequesthistories_requestid");
            entity.HasIndex(e => e.Createdat, "ix_returnrequesthistories_createdat");

            entity.Property(e => e.Historyid).HasColumnName("historyid");
            entity.Property(e => e.Returnrequestid).HasColumnName("returnrequestid");
            entity.Property(e => e.Userid).HasColumnName("userid");
            entity.Property(e => e.Fromstatus).HasMaxLength(30).HasColumnName("fromstatus");
            entity.Property(e => e.Tostatus).HasMaxLength(30).HasColumnName("tostatus");
            entity.Property(e => e.Note).HasMaxLength(1000).HasColumnName("note");
            entity.Property(e => e.Createdat)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp without time zone")
                .HasColumnName("createdat");

            entity.HasOne(e => e.Returnrequest).WithMany(e => e.Histories)
                .HasForeignKey(e => e.Returnrequestid)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("fk_returnrequesthistories_requests");
            entity.HasOne(e => e.User).WithMany(e => e.Returnrequesthistories)
                .HasForeignKey(e => e.Userid)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("fk_returnrequesthistories_users");
        });

        modelBuilder.Entity<Refundtransaction>(entity =>
        {
            entity.HasKey(e => e.Refundtransactionid).HasName("refundtransactions_pkey");
            entity.ToTable("refundtransactions");

            entity.HasIndex(e => e.Returnrequestid, "ix_refundtransactions_requestid");
            entity.HasIndex(e => e.Orderid, "ix_refundtransactions_orderid");

            entity.Property(e => e.Refundtransactionid).HasColumnName("refundtransactionid");
            entity.Property(e => e.Returnrequestid).HasColumnName("returnrequestid");
            entity.Property(e => e.Orderid).HasColumnName("orderid");
            entity.Property(e => e.Processedbyuserid).HasColumnName("processedbyuserid");
            entity.Property(e => e.Amount).HasPrecision(18, 2).HasColumnName("amount");
            entity.Property(e => e.Provider).HasMaxLength(50).HasColumnName("provider");
            entity.Property(e => e.Status).HasMaxLength(30).HasColumnName("status");
            entity.Property(e => e.Transactionref).HasMaxLength(100).HasColumnName("transactionref");
            entity.Property(e => e.Note).HasMaxLength(1000).HasColumnName("note");
            entity.Property(e => e.Createdat)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp without time zone")
                .HasColumnName("createdat");
            entity.Property(e => e.Processedat)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("processedat");

            entity.HasOne(e => e.Returnrequest).WithMany(e => e.Refundtransactions)
                .HasForeignKey(e => e.Returnrequestid)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("fk_refundtransactions_requests");
            entity.HasOne(e => e.Order).WithMany(e => e.Refundtransactions)
                .HasForeignKey(e => e.Orderid)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("fk_refundtransactions_orders");
            entity.HasOne(e => e.Processedbyuser).WithMany(e => e.Refundtransactions)
                .HasForeignKey(e => e.Processedbyuserid)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("fk_refundtransactions_users");
        });

        modelBuilder.Entity<Orderassignment>(entity =>
        {
            entity.HasKey(e => e.Assignmentid).HasName("orderassignments_pkey");

            entity.ToTable("orderassignments");

            entity.HasIndex(
                    e => new { e.Orderid, e.Department },
                    "ux_orderassignments_order_department")
                .IsUnique();

            entity.HasIndex(e => new { e.Department, e.Status }, "ix_orderassignments_department_status");
            entity.HasIndex(e => e.Assigneduserid, "ix_orderassignments_assigneduserid");

            entity.Property(e => e.Assignmentid).HasColumnName("assignmentid");
            entity.Property(e => e.Orderid).HasColumnName("orderid");
            entity.Property(e => e.Department)
                .HasMaxLength(30)
                .HasColumnName("department");
            entity.Property(e => e.Assigneduserid).HasColumnName("assigneduserid");
            entity.Property(e => e.Assignedbyuserid).HasColumnName("assignedbyuserid");
            entity.Property(e => e.Status)
                .HasMaxLength(30)
                .HasDefaultValue("Pending")
                .HasColumnName("status");
            entity.Property(e => e.Assignedat)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("assignedat");
            entity.Property(e => e.Completedat)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("completedat");
            entity.Property(e => e.Note)
                .HasMaxLength(500)
                .HasColumnName("note");

            entity.HasOne(d => d.Order).WithMany(p => p.Orderassignments)
                .HasForeignKey(d => d.Orderid)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("fk_orderassignments_orders");

            entity.HasOne(d => d.Assigneduser).WithMany(p => p.AssignedOrderassignments)
                .HasForeignKey(d => d.Assigneduserid)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("fk_orderassignments_assigned_users");

            entity.HasOne(d => d.Assignedbyuser).WithMany(p => p.CreatedOrderassignments)
                .HasForeignKey(d => d.Assignedbyuserid)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("fk_orderassignments_assignedby_users");
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

            entity.HasIndex(e => e.Slug, "products_slug_key").IsUnique();

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
            entity.Property(e => e.Slug)
                .HasMaxLength(220)
                .HasColumnName("slug");

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
