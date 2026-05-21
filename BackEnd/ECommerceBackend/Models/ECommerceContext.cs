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

    public virtual DbSet<Attribute> Attributes { get; set; }

    public virtual DbSet<Attributevalue> Attributevalues { get; set; }

    public virtual DbSet<Auditlog> Auditlogs { get; set; }

    public virtual DbSet<Banner> Banners { get; set; }

    public virtual DbSet<Brand> Brands { get; set; }

    public virtual DbSet<Category> Categories { get; set; }

    public virtual DbSet<Chatmessage> Chatmessages { get; set; }

    public virtual DbSet<Chatsession> Chatsessions { get; set; }

    public virtual DbSet<Customer> Customers { get; set; }

    public virtual DbSet<Inventoryitem> Inventoryitems { get; set; }

    public virtual DbSet<News> News { get; set; }

    public virtual DbSet<Order> Orders { get; set; }

    public virtual DbSet<Orderitem> Orderitems { get; set; }

    public virtual DbSet<Product> Products { get; set; }

    public virtual DbSet<Productcondition> Productconditions { get; set; }

    public virtual DbSet<Productimage> Productimages { get; set; }

    public virtual DbSet<Productvariant> Productvariants { get; set; }

    public virtual DbSet<Purchaseorder> Purchaseorders { get; set; }

    public virtual DbSet<Purchaseorderdetail> Purchaseorderdetails { get; set; }

    public virtual DbSet<Review> Reviews { get; set; }

    public virtual DbSet<Role> Roles { get; set; }

    public virtual DbSet<Slider> Sliders { get; set; }

    public virtual DbSet<Supplier> Suppliers { get; set; }

    public virtual DbSet<User> Users { get; set; }

    public virtual DbSet<Voucher> Vouchers { get; set; }

    public virtual DbSet<Warranty> Warranties { get; set; }

    public virtual DbSet<Warrantypackage> Warrantypackages { get; set; }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {
        // Connection string is configured in Program.cs via Dependency Injection.
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Attribute>(entity =>
        {
            entity.HasKey(e => e.Attributeid).HasName("attributes_pkey");

            entity.ToTable("attributes");

            entity.Property(e => e.Attributeid).HasColumnName("attributeid");
            entity.Property(e => e.Attributename)
                .HasMaxLength(50)
                .HasColumnName("attributename");
        });

        modelBuilder.Entity<Attributevalue>(entity =>
        {
            entity.HasKey(e => e.Valueid).HasName("attributevalues_pkey");

            entity.ToTable("attributevalues");

            entity.Property(e => e.Valueid).HasColumnName("valueid");
            entity.Property(e => e.Attributeid).HasColumnName("attributeid");
            entity.Property(e => e.Valuename)
                .HasMaxLength(50)
                .HasColumnName("valuename");

            entity.HasOne(d => d.Attribute).WithMany(p => p.Attributevalues)
                .HasForeignKey(d => d.Attributeid)
                .HasConstraintName("fk_attrvalues_attributes");
        });

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

        modelBuilder.Entity<Banner>(entity =>
        {
            entity.HasKey(e => e.Bannerid).HasName("banners_pkey");

            entity.ToTable("banners");

            entity.Property(e => e.Bannerid).HasColumnName("bannerid");
            entity.Property(e => e.Imageurl)
                .HasMaxLength(500)
                .HasColumnName("imageurl");
            entity.Property(e => e.Isactive)
                .HasDefaultValue(true)
                .HasColumnName("isactive");
            entity.Property(e => e.Linkurl)
                .HasMaxLength(500)
                .HasColumnName("linkurl");
            entity.Property(e => e.Position)
                .HasMaxLength(50)
                .HasColumnName("position");
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
            entity.Property(e => e.Podetailid).HasColumnName("podetailid");
            entity.Property(e => e.Status)
                .HasMaxLength(50)
                .HasDefaultValueSql("'InStock'")
                .HasColumnName("status");
            entity.Property(e => e.Variantid).HasColumnName("variantid");

            entity.HasOne(d => d.Podetail).WithMany(p => p.Inventoryitems)
                .HasForeignKey(d => d.Podetailid)
                .HasConstraintName("fk_inventory_podetails");

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
        });

        modelBuilder.Entity<Productcondition>(entity =>
        {
            entity.HasKey(e => e.Conditionid).HasName("productconditions_pkey");

            entity.ToTable("productconditions");

            entity.Property(e => e.Conditionid).HasColumnName("conditionid");
            entity.Property(e => e.Conditionname)
                .HasMaxLength(50)
                .HasColumnName("conditionname");
            entity.Property(e => e.Description)
                .HasMaxLength(255)
                .HasColumnName("description");
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
            entity.Property(e => e.Conditionid).HasColumnName("conditionid");
            entity.Property(e => e.Productid).HasColumnName("productid");
            entity.Property(e => e.Saleprice)
                .HasPrecision(18, 2)
                .HasColumnName("saleprice");
            entity.Property(e => e.Sku)
                .HasMaxLength(50)
                .HasColumnName("sku");

            entity.HasOne(d => d.Condition).WithMany(p => p.Productvariants)
                .HasForeignKey(d => d.Conditionid)
                .HasConstraintName("fk_variants_conditions");

            entity.HasOne(d => d.Product).WithMany(p => p.Productvariants)
                .HasForeignKey(d => d.Productid)
                .HasConstraintName("fk_variants_products");

            entity.HasMany(d => d.Values).WithMany(p => p.Variants)
                .UsingEntity<Dictionary<string, object>>(
                    "Variantattributevalue",
                    r => r.HasOne<Attributevalue>().WithMany()
                        .HasForeignKey("Valueid")
                        .OnDelete(DeleteBehavior.ClientSetNull)
                        .HasConstraintName("fk_varattr_attrvalues"),
                    l => l.HasOne<Productvariant>().WithMany()
                        .HasForeignKey("Variantid")
                        .OnDelete(DeleteBehavior.ClientSetNull)
                        .HasConstraintName("fk_varattr_variants"),
                    j =>
                    {
                        j.HasKey("Variantid", "Valueid").HasName("variantattributevalues_pkey");
                        j.ToTable("variantattributevalues");
                        j.IndexerProperty<int>("Variantid").HasColumnName("variantid");
                        j.IndexerProperty<int>("Valueid").HasColumnName("valueid");
                    });
        });

        modelBuilder.Entity<Purchaseorder>(entity =>
        {
            entity.HasKey(e => e.Poid).HasName("purchaseorders_pkey");

            entity.ToTable("purchaseorders");

            entity.Property(e => e.Poid).HasColumnName("poid");
            entity.Property(e => e.Importdate)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp without time zone")
                .HasColumnName("importdate");
            entity.Property(e => e.Shippingfee)
                .HasPrecision(18, 2)
                .HasDefaultValueSql("0")
                .HasColumnName("shippingfee");
            entity.Property(e => e.Status)
                .HasMaxLength(50)
                .HasColumnName("status");
            entity.Property(e => e.Supplierid).HasColumnName("supplierid");
            entity.Property(e => e.Taxfee)
                .HasPrecision(18, 2)
                .HasDefaultValueSql("0")
                .HasColumnName("taxfee");
            entity.Property(e => e.Totalamount)
                .HasPrecision(18, 2)
                .HasColumnName("totalamount");
            entity.Property(e => e.Userid).HasColumnName("userid");

            entity.HasOne(d => d.Supplier).WithMany(p => p.Purchaseorders)
                .HasForeignKey(d => d.Supplierid)
                .HasConstraintName("fk_po_suppliers");

            entity.HasOne(d => d.User).WithMany(p => p.Purchaseorders)
                .HasForeignKey(d => d.Userid)
                .HasConstraintName("fk_po_users");
        });

        modelBuilder.Entity<Purchaseorderdetail>(entity =>
        {
            entity.HasKey(e => e.Podetailid).HasName("purchaseorderdetails_pkey");

            entity.ToTable("purchaseorderdetails");

            entity.Property(e => e.Podetailid).HasColumnName("podetailid");
            entity.Property(e => e.Importprice)
                .HasPrecision(18, 2)
                .HasColumnName("importprice");
            entity.Property(e => e.Poid).HasColumnName("poid");
            entity.Property(e => e.Quantity).HasColumnName("quantity");
            entity.Property(e => e.Variantid).HasColumnName("variantid");

            entity.HasOne(d => d.Po).WithMany(p => p.Purchaseorderdetails)
                .HasForeignKey(d => d.Poid)
                .HasConstraintName("fk_podetails_po");

            entity.HasOne(d => d.Variant).WithMany(p => p.Purchaseorderdetails)
                .HasForeignKey(d => d.Variantid)
                .HasConstraintName("fk_podetails_variants");
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

        modelBuilder.Entity<Slider>(entity =>
        {
            entity.HasKey(e => e.Sliderid).HasName("sliders_pkey");

            entity.ToTable("sliders");

            entity.Property(e => e.Sliderid).HasColumnName("sliderid");
            entity.Property(e => e.Createdat)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp without time zone")
                .HasColumnName("createdat");
            entity.Property(e => e.Displayorder)
                .HasDefaultValue(0)
                .HasColumnName("displayorder");
            entity.Property(e => e.Imageurl)
                .HasMaxLength(500)
                .HasColumnName("imageurl");
            entity.Property(e => e.Isactive)
                .HasDefaultValue(true)
                .HasColumnName("isactive");
            entity.Property(e => e.Linkurl)
                .HasMaxLength(500)
                .HasColumnName("linkurl");
            entity.Property(e => e.Title)
                .HasMaxLength(200)
                .HasColumnName("title");
        });

        modelBuilder.Entity<Supplier>(entity =>
        {
            entity.HasKey(e => e.Supplierid).HasName("suppliers_pkey");

            entity.ToTable("suppliers");

            entity.Property(e => e.Supplierid).HasColumnName("supplierid");
            entity.Property(e => e.Address)
                .HasMaxLength(255)
                .HasColumnName("address");
            entity.Property(e => e.Contactphone)
                .HasMaxLength(20)
                .HasColumnName("contactphone");
            entity.Property(e => e.Suppliername)
                .HasMaxLength(150)
                .HasColumnName("suppliername");
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

        modelBuilder.Entity<Warranty>(entity =>
        {
            entity.HasKey(e => e.Warrantyid).HasName("warranties_pkey");

            entity.ToTable("warranties");

            entity.Property(e => e.Warrantyid).HasColumnName("warrantyid");
            entity.Property(e => e.Customerid).HasColumnName("customerid");
            entity.Property(e => e.Enddate)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("enddate");
            entity.Property(e => e.Imei)
                .HasMaxLength(50)
                .HasColumnName("imei");
            entity.Property(e => e.Startdate)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("startdate");
            entity.Property(e => e.Status)
                .HasMaxLength(50)
                .HasColumnName("status");

            entity.HasOne(d => d.Customer).WithMany(p => p.Warranties)
                .HasForeignKey(d => d.Customerid)
                .HasConstraintName("fk_warranties_customers");

            entity.HasOne(d => d.ImeiNavigation).WithMany(p => p.Warranties)
                .HasForeignKey(d => d.Imei)
                .HasConstraintName("fk_warranties_inventory");
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

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
