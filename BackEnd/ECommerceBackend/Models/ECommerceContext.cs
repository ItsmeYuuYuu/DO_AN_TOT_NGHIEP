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

    public virtual DbSet<Inventorytransaction> Inventorytransactions { get; set; }

    public virtual DbSet<Content> Contents { get; set; }

    public virtual DbSet<Order> Orders { get; set; }

    public virtual DbSet<Orderitem> Orderitems { get; set; }

    public virtual DbSet<Orderpayment> Orderpayments { get; set; }

    public virtual DbSet<Product> Products { get; set; }

    public virtual DbSet<Productvariant> Productvariants { get; set; }

    public virtual DbSet<Review> Reviews { get; set; }

    public virtual DbSet<Returnrequest> Returnrequests { get; set; }

    public virtual DbSet<Returnitem> Returnitems { get; set; }

    public virtual DbSet<Shipment> Shipments { get; set; }

    public virtual DbSet<Role> Roles { get; set; }

    public virtual DbSet<Permission> Permissions { get; set; }

    public virtual DbSet<Rolepermission> Rolepermissions { get; set; }

    public virtual DbSet<Userrole> Userroles { get; set; }

    public virtual DbSet<User> Users { get; set; }

    public virtual DbSet<Voucher> Vouchers { get; set; }

    public virtual DbSet<Warrantypackage> Warrantypackages { get; set; }

    public virtual DbSet<Warrantyclaim> Warrantyclaims { get; set; }

    public virtual DbSet<Cart> Carts { get; set; }

    public virtual DbSet<Statuslog> Statuslogs { get; set; }

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
            entity.Property(e => e.Recommendations)
                .HasColumnType("jsonb")
                .HasColumnName("recommendations");
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
                .HasColumnType("jsonb")
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

        

        modelBuilder.Entity<Content>(entity =>
        {
            entity.HasKey(e => e.Contentid).HasName("contents_pkey");
            entity.ToTable("contents");
            entity.HasIndex(e => e.Slug, "ux_contents_slug").IsUnique();
            entity.HasIndex(e => new { e.Contenttype, e.Isactive, e.Displayorder }, "ix_contents_listing");
            entity.Property(e => e.Contentid).HasColumnName("contentid");
            entity.Property(e => e.Contenttype).HasMaxLength(30).HasColumnName("contenttype");
            entity.Property(e => e.Title).HasMaxLength(255).HasColumnName("title");
            entity.Property(e => e.Slug).HasMaxLength(220).HasColumnName("slug");
            entity.Property(e => e.Summary).HasMaxLength(500).HasColumnName("summary");
            entity.Property(e => e.Htmlcontent).HasColumnName("htmlcontent");
            entity.Property(e => e.Thumbnailurl).HasMaxLength(500).HasColumnName("thumbnailurl");
            entity.Property(e => e.Linkurl).HasMaxLength(500).HasColumnName("linkurl");
            entity.Property(e => e.Contentdata).HasColumnType("jsonb").HasColumnName("contentdata");
            entity.Property(e => e.Createdat)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp without time zone")
                .HasColumnName("createdat");
            entity.Property(e => e.Isactive)
                .HasDefaultValue(true)
                .HasColumnName("isactive");
            entity.Property(e => e.Displayorder).HasColumnName("displayorder");
            entity.Property(e => e.Createdbyuserid).HasColumnName("createdbyuserid");
            entity.HasOne(d => d.Createdbyuser).WithMany(p => p.Contents)
                .HasForeignKey(d => d.Createdbyuserid)
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
            entity.Property(e => e.Shippingfee)
                .HasPrecision(18, 2)
                .HasDefaultValueSql("0")
                .HasColumnName("shippingfee");
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
            entity.HasIndex(e => new { e.Transactiontype, e.Transactionref }, "ux_orderpayments_active_refund_reference")
                .IsUnique()
                .HasFilter("\"Transactiontype\" = 'Refund' AND status <> 'Failed' AND transactionref IS NOT NULL");
            entity.HasIndex(e => new { e.Provider, e.Transactionref }, "ux_orderpayments_sepay_transaction_reference")
                .IsUnique()
                .HasFilter("provider = 'SEPAY' AND status = 'Success' AND transactionref IS NOT NULL");

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
            entity.Property(e => e.Reasoncategory).HasMaxLength(30).HasColumnName("reasoncategory");
            entity.Property(e => e.Description).HasMaxLength(2000).HasColumnName("description");
            entity.Property(e => e.Status).HasMaxLength(30).HasColumnName("status");
            entity.Property(e => e.Imageurls).HasColumnType("jsonb").HasColumnName("imageurls");
            entity.Property(e => e.Reviewnote).HasMaxLength(1000).HasColumnName("reviewnote");
            entity.Property(e => e.Resolution).HasMaxLength(2000).HasColumnName("resolution");
            entity.Property(e => e.Requestedrefundamount).HasPrecision(18, 2).HasColumnName("requestedrefundamount");
            entity.Property(e => e.Approvedrefundamount).HasPrecision(18, 2).HasColumnName("approvedrefundamount");
            entity.Property(e => e.Refundamount).HasPrecision(18, 2).HasColumnName("refundamount");
            entity.Property(e => e.Refundstatus).HasMaxLength(30).HasColumnName("refundstatus");
            entity.Property(e => e.Refundinfo).HasColumnType("jsonb").HasColumnName("refundinfo");
            entity.Property(e => e.Policyversion).HasMaxLength(20).HasColumnName("policyversion");
            entity.Property(e => e.Refundcalculation).HasColumnType("jsonb").HasColumnName("refundcalculation");
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
            entity.HasIndex(e => e.Resalevariantid, "ix_returnitems_resalevariantid");

            entity.Property(e => e.Returnitemid).HasColumnName("returnitemid");
            entity.Property(e => e.Returnrequestid).HasColumnName("returnrequestid");
            entity.Property(e => e.Orderitemid).HasColumnName("orderitemid");
            entity.Property(e => e.Imei).HasMaxLength(50).HasColumnName("imei");
            entity.Property(e => e.Condition).HasMaxLength(1000).HasColumnName("condition");
            entity.Property(e => e.Disposition).HasMaxLength(30).HasColumnName("disposition");
            entity.Property(e => e.Replacementimei).HasMaxLength(50).HasColumnName("replacementimei");
            entity.Property(e => e.Refundamount).HasPrecision(18, 2).HasColumnName("refundamount");
            entity.Property(e => e.Originalpaidamount).HasPrecision(18, 2).HasColumnName("originalpaidamount");
            entity.Property(e => e.Inspectiongrade).HasMaxLength(20).HasColumnName("inspectiongrade");
            entity.Property(e => e.Faultresponsibility).HasMaxLength(20).HasColumnName("faultresponsibility");
            entity.Property(e => e.Deductionamount).HasPrecision(18, 2).HasColumnName("deductionamount");
            entity.Property(e => e.Resalevariantid).HasColumnName("resalevariantid");

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
            entity.HasOne(e => e.Resalevariant).WithMany()
                .HasForeignKey(e => e.Resalevariantid)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("fk_returnitems_resale_variants");
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
            entity.Property(e => e.Seriesname).HasMaxLength(100).HasColumnName("seriesname");
            entity.Property(e => e.Createdat)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp without time zone")
                .HasColumnName("createdat");
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.Isactive)
                .HasDefaultValue(true)
                .HasColumnName("isactive");
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
            entity.Property(e => e.Imageurls).HasColumnType("jsonb").HasColumnName("Imageurls");

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

        modelBuilder.Entity<Permission>(entity =>
        {
            entity.HasKey(e => e.Permissionid).HasName("permissions_pkey");
            entity.ToTable("permissions");
            entity.HasIndex(e => e.Code, "permissions_code_key").IsUnique();
            entity.Property(e => e.Permissionid).HasColumnName("permissionid");
            entity.Property(e => e.Code).HasMaxLength(100).HasColumnName("code");
            entity.Property(e => e.Name).HasMaxLength(150).HasColumnName("name");
            entity.Property(e => e.Groupname).HasMaxLength(100).HasColumnName("groupname");
            entity.Property(e => e.Description).HasMaxLength(500).HasColumnName("description");
        });

        modelBuilder.Entity<Rolepermission>(entity =>
        {
            entity.HasKey(e => new { e.Roleid, e.Permissionid }).HasName("rolepermissions_pkey");
            entity.ToTable("rolepermissions");
            entity.Property(e => e.Roleid).HasColumnName("roleid");
            entity.Property(e => e.Permissionid).HasColumnName("permissionid");
            entity.HasOne(e => e.Role).WithMany(e => e.Rolepermissions)
                .HasForeignKey(e => e.Roleid).OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("fk_rolepermissions_roles");
            entity.HasOne(e => e.Permission).WithMany(e => e.Rolepermissions)
                .HasForeignKey(e => e.Permissionid).OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("fk_rolepermissions_permissions");
        });

        modelBuilder.Entity<Userrole>(entity =>
        {
            entity.HasKey(e => new { e.Userid, e.Roleid }).HasName("userroles_pkey");
            entity.ToTable("userroles");
            entity.Property(e => e.Userid).HasColumnName("userid");
            entity.Property(e => e.Roleid).HasColumnName("roleid");
            entity.HasOne(e => e.User).WithMany(e => e.Userroles)
                .HasForeignKey(e => e.Userid).OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("fk_userroles_users");
            entity.HasOne(e => e.Role).WithMany(e => e.Userroles)
                .HasForeignKey(e => e.Roleid).OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("fk_userroles_roles");
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
            entity.Property(e => e.Cartcontent).HasColumnType("jsonb").HasColumnName("Cartcontent");

            entity.HasOne(d => d.User).WithOne(p => p.Cart)
                .HasForeignKey<Cart>(d => d.Userid)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("fk_carts_users");
        });

        

                modelBuilder.Entity<Statuslog>(entity =>
        {
            entity.HasKey(e => e.Logid).HasName("statuslogs_pkey");
            entity.ToTable("statuslogs");

            entity.HasIndex(e => new { e.Entitytype, e.Entityid }, "ix_statuslogs_entity");

            entity.Property(e => e.Logid).HasColumnName("logid");
            entity.Property(e => e.Entitytype).HasMaxLength(50).HasColumnName("entitytype");
            entity.Property(e => e.Entityid).HasColumnName("entityid");
            entity.Property(e => e.Actiontype).HasMaxLength(50).HasDefaultValue("StatusChanged").HasColumnName("actiontype");
            entity.Property(e => e.Fromstatus).HasMaxLength(50).HasColumnName("fromstatus");
            entity.Property(e => e.Tostatus).HasMaxLength(50).HasColumnName("tostatus");
            entity.Property(e => e.Note).HasMaxLength(1000).HasColumnName("note");
            entity.Property(e => e.Metadata).HasColumnType("jsonb").HasColumnName("metadata");
            entity.Property(e => e.Userid).HasColumnName("userid");
            entity.Property(e => e.Createdat)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp without time zone")
                .HasColumnName("createdat");

            entity.HasOne(d => d.User).WithMany(p => p.Statuslogs)
                .HasForeignKey(d => d.Userid)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("fk_statuslogs_users");
        });

        OnModelCreatingPartial(modelBuilder);

    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}

