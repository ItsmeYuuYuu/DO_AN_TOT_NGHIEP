using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace ECommerceBackend.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "attributes",
                columns: table => new
                {
                    attributeid = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    attributename = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("attributes_pkey", x => x.attributeid);
                });

            migrationBuilder.CreateTable(
                name: "banners",
                columns: table => new
                {
                    bannerid = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    position = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    imageurl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    linkurl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    isactive = table.Column<bool>(type: "boolean", nullable: true, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("banners_pkey", x => x.bannerid);
                });

            migrationBuilder.CreateTable(
                name: "brands",
                columns: table => new
                {
                    brandid = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    brandname = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("brands_pkey", x => x.brandid);
                });

            migrationBuilder.CreateTable(
                name: "categories",
                columns: table => new
                {
                    categoryid = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    categoryname = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    description = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("categories_pkey", x => x.categoryid);
                });

            migrationBuilder.CreateTable(
                name: "customers",
                columns: table => new
                {
                    customerid = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    fullname = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    phone = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    email = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    address = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    createdat = table.Column<DateTime>(type: "timestamp without time zone", nullable: true, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("customers_pkey", x => x.customerid);
                });

            migrationBuilder.CreateTable(
                name: "productconditions",
                columns: table => new
                {
                    conditionid = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    conditionname = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    description = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("productconditions_pkey", x => x.conditionid);
                });

            migrationBuilder.CreateTable(
                name: "roles",
                columns: table => new
                {
                    roleid = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    rolename = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("roles_pkey", x => x.roleid);
                });

            migrationBuilder.CreateTable(
                name: "sliders",
                columns: table => new
                {
                    sliderid = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    imageurl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    linkurl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    displayorder = table.Column<int>(type: "integer", nullable: true, defaultValue: 0),
                    isactive = table.Column<bool>(type: "boolean", nullable: true, defaultValue: true),
                    createdat = table.Column<DateTime>(type: "timestamp without time zone", nullable: true, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("sliders_pkey", x => x.sliderid);
                });

            migrationBuilder.CreateTable(
                name: "suppliers",
                columns: table => new
                {
                    supplierid = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    suppliername = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    contactphone = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    address = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("suppliers_pkey", x => x.supplierid);
                });

            migrationBuilder.CreateTable(
                name: "vouchers",
                columns: table => new
                {
                    vouchercode = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    discountamount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    discountpercentage = table.Column<double>(type: "double precision", nullable: true),
                    validfrom = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    validto = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    isactive = table.Column<bool>(type: "boolean", nullable: true, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("vouchers_pkey", x => x.vouchercode);
                });

            migrationBuilder.CreateTable(
                name: "warrantypackages",
                columns: table => new
                {
                    packageid = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    packagename = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    durationmonths = table.Column<int>(type: "integer", nullable: false),
                    price = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("warrantypackages_pkey", x => x.packageid);
                });

            migrationBuilder.CreateTable(
                name: "attributevalues",
                columns: table => new
                {
                    valueid = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    attributeid = table.Column<int>(type: "integer", nullable: true),
                    valuename = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("attributevalues_pkey", x => x.valueid);
                    table.ForeignKey(
                        name: "fk_attrvalues_attributes",
                        column: x => x.attributeid,
                        principalTable: "attributes",
                        principalColumn: "attributeid");
                });

            migrationBuilder.CreateTable(
                name: "products",
                columns: table => new
                {
                    productid = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    categoryid = table.Column<int>(type: "integer", nullable: true),
                    brandid = table.Column<int>(type: "integer", nullable: true),
                    productname = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    description = table.Column<string>(type: "text", nullable: true),
                    createdat = table.Column<DateTime>(type: "timestamp without time zone", nullable: true, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("products_pkey", x => x.productid);
                    table.ForeignKey(
                        name: "fk_products_brands",
                        column: x => x.brandid,
                        principalTable: "brands",
                        principalColumn: "brandid");
                    table.ForeignKey(
                        name: "fk_products_categories",
                        column: x => x.categoryid,
                        principalTable: "categories",
                        principalColumn: "categoryid");
                });

            migrationBuilder.CreateTable(
                name: "chatsessions",
                columns: table => new
                {
                    sessionid = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    customerid = table.Column<int>(type: "integer", nullable: true),
                    guestsessiontoken = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    starttime = table.Column<DateTime>(type: "timestamp without time zone", nullable: true, defaultValueSql: "CURRENT_TIMESTAMP"),
                    endtime = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true, defaultValueSql: "'Active'::character varying")
                },
                constraints: table =>
                {
                    table.PrimaryKey("chatsessions_pkey", x => x.sessionid);
                    table.ForeignKey(
                        name: "fk_chatsessions_customers",
                        column: x => x.customerid,
                        principalTable: "customers",
                        principalColumn: "customerid");
                });

            migrationBuilder.CreateTable(
                name: "users",
                columns: table => new
                {
                    userid = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    roleid = table.Column<int>(type: "integer", nullable: true),
                    username = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    passwordhash = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    fullname = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    email = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    phone = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    createdat = table.Column<DateTime>(type: "timestamp without time zone", nullable: true, defaultValueSql: "CURRENT_TIMESTAMP"),
                    isactive = table.Column<bool>(type: "boolean", nullable: true, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("users_pkey", x => x.userid);
                    table.ForeignKey(
                        name: "fk_users_roles",
                        column: x => x.roleid,
                        principalTable: "roles",
                        principalColumn: "roleid");
                });

            migrationBuilder.CreateTable(
                name: "productvariants",
                columns: table => new
                {
                    variantid = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    productid = table.Column<int>(type: "integer", nullable: true),
                    conditionid = table.Column<int>(type: "integer", nullable: true),
                    sku = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    baseprice = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    saleprice = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("productvariants_pkey", x => x.variantid);
                    table.ForeignKey(
                        name: "fk_variants_conditions",
                        column: x => x.conditionid,
                        principalTable: "productconditions",
                        principalColumn: "conditionid");
                    table.ForeignKey(
                        name: "fk_variants_products",
                        column: x => x.productid,
                        principalTable: "products",
                        principalColumn: "productid");
                });

            migrationBuilder.CreateTable(
                name: "chatmessages",
                columns: table => new
                {
                    messageid = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    sessionid = table.Column<int>(type: "integer", nullable: true),
                    sendertype = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    messagecontent = table.Column<string>(type: "text", nullable: false),
                    sentat = table.Column<DateTime>(type: "timestamp without time zone", nullable: true, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("chatmessages_pkey", x => x.messageid);
                    table.ForeignKey(
                        name: "fk_chatmessages_chatsessions",
                        column: x => x.sessionid,
                        principalTable: "chatsessions",
                        principalColumn: "sessionid");
                });

            migrationBuilder.CreateTable(
                name: "auditlogs",
                columns: table => new
                {
                    logid = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    userid = table.Column<int>(type: "integer", nullable: true),
                    action = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    tablename = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    recordid = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    createdat = table.Column<DateTime>(type: "timestamp without time zone", nullable: true, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("auditlogs_pkey", x => x.logid);
                    table.ForeignKey(
                        name: "fk_auditlogs_users",
                        column: x => x.userid,
                        principalTable: "users",
                        principalColumn: "userid");
                });

            migrationBuilder.CreateTable(
                name: "news",
                columns: table => new
                {
                    postid = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    userid = table.Column<int>(type: "integer", nullable: true),
                    title = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    summary = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    content = table.Column<string>(type: "text", nullable: true),
                    thumbnail = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    createdat = table.Column<DateTime>(type: "timestamp without time zone", nullable: true, defaultValueSql: "CURRENT_TIMESTAMP"),
                    isactive = table.Column<bool>(type: "boolean", nullable: true, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("news_pkey", x => x.postid);
                    table.ForeignKey(
                        name: "fk_news_users",
                        column: x => x.userid,
                        principalTable: "users",
                        principalColumn: "userid");
                });

            migrationBuilder.CreateTable(
                name: "orders",
                columns: table => new
                {
                    orderid = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    customerid = table.Column<int>(type: "integer", nullable: true),
                    userid = table.Column<int>(type: "integer", nullable: true),
                    vouchercode = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    orderdate = table.Column<DateTime>(type: "timestamp without time zone", nullable: true, defaultValueSql: "CURRENT_TIMESTAMP"),
                    totalamount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    discountamount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true, defaultValueSql: "0"),
                    finalamount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    paymentmethod = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    orderstatus = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("orders_pkey", x => x.orderid);
                    table.ForeignKey(
                        name: "fk_orders_customers",
                        column: x => x.customerid,
                        principalTable: "customers",
                        principalColumn: "customerid");
                    table.ForeignKey(
                        name: "fk_orders_users",
                        column: x => x.userid,
                        principalTable: "users",
                        principalColumn: "userid");
                    table.ForeignKey(
                        name: "fk_orders_vouchers",
                        column: x => x.vouchercode,
                        principalTable: "vouchers",
                        principalColumn: "vouchercode");
                });

            migrationBuilder.CreateTable(
                name: "purchaseorders",
                columns: table => new
                {
                    poid = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    supplierid = table.Column<int>(type: "integer", nullable: true),
                    userid = table.Column<int>(type: "integer", nullable: true),
                    importdate = table.Column<DateTime>(type: "timestamp without time zone", nullable: true, defaultValueSql: "CURRENT_TIMESTAMP"),
                    totalamount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    taxfee = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true, defaultValueSql: "0"),
                    shippingfee = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true, defaultValueSql: "0"),
                    status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("purchaseorders_pkey", x => x.poid);
                    table.ForeignKey(
                        name: "fk_po_suppliers",
                        column: x => x.supplierid,
                        principalTable: "suppliers",
                        principalColumn: "supplierid");
                    table.ForeignKey(
                        name: "fk_po_users",
                        column: x => x.userid,
                        principalTable: "users",
                        principalColumn: "userid");
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
                name: "reviews",
                columns: table => new
                {
                    reviewid = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    variantid = table.Column<int>(type: "integer", nullable: true),
                    customerid = table.Column<int>(type: "integer", nullable: true),
                    rating = table.Column<int>(type: "integer", nullable: true),
                    comment = table.Column<string>(type: "text", nullable: true),
                    createdat = table.Column<DateTime>(type: "timestamp without time zone", nullable: true, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("reviews_pkey", x => x.reviewid);
                    table.ForeignKey(
                        name: "fk_reviews_customers",
                        column: x => x.customerid,
                        principalTable: "customers",
                        principalColumn: "customerid");
                    table.ForeignKey(
                        name: "fk_reviews_variants",
                        column: x => x.variantid,
                        principalTable: "productvariants",
                        principalColumn: "variantid");
                });

            migrationBuilder.CreateTable(
                name: "variantattributevalues",
                columns: table => new
                {
                    variantid = table.Column<int>(type: "integer", nullable: false),
                    valueid = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("variantattributevalues_pkey", x => new { x.variantid, x.valueid });
                    table.ForeignKey(
                        name: "fk_varattr_attrvalues",
                        column: x => x.valueid,
                        principalTable: "attributevalues",
                        principalColumn: "valueid");
                    table.ForeignKey(
                        name: "fk_varattr_variants",
                        column: x => x.variantid,
                        principalTable: "productvariants",
                        principalColumn: "variantid");
                });

            migrationBuilder.CreateTable(
                name: "purchaseorderdetails",
                columns: table => new
                {
                    podetailid = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    poid = table.Column<int>(type: "integer", nullable: true),
                    variantid = table.Column<int>(type: "integer", nullable: true),
                    quantity = table.Column<int>(type: "integer", nullable: false),
                    importprice = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("purchaseorderdetails_pkey", x => x.podetailid);
                    table.ForeignKey(
                        name: "fk_podetails_po",
                        column: x => x.poid,
                        principalTable: "purchaseorders",
                        principalColumn: "poid");
                    table.ForeignKey(
                        name: "fk_podetails_variants",
                        column: x => x.variantid,
                        principalTable: "productvariants",
                        principalColumn: "variantid");
                });

            migrationBuilder.CreateTable(
                name: "inventoryitems",
                columns: table => new
                {
                    imei = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    variantid = table.Column<int>(type: "integer", nullable: true),
                    podetailid = table.Column<int>(type: "integer", nullable: true),
                    status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true, defaultValueSql: "'InStock'::character varying"),
                    importedat = table.Column<DateTime>(type: "timestamp without time zone", nullable: true, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("inventoryitems_pkey", x => x.imei);
                    table.ForeignKey(
                        name: "fk_inventory_podetails",
                        column: x => x.podetailid,
                        principalTable: "purchaseorderdetails",
                        principalColumn: "podetailid");
                    table.ForeignKey(
                        name: "fk_inventory_variants",
                        column: x => x.variantid,
                        principalTable: "productvariants",
                        principalColumn: "variantid");
                });

            migrationBuilder.CreateTable(
                name: "orderitems",
                columns: table => new
                {
                    orderitemid = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    orderid = table.Column<int>(type: "integer", nullable: true),
                    imei = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    packageid = table.Column<int>(type: "integer", nullable: true),
                    sellingprice = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    warrantyprice = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true, defaultValueSql: "0")
                },
                constraints: table =>
                {
                    table.PrimaryKey("orderitems_pkey", x => x.orderitemid);
                    table.ForeignKey(
                        name: "fk_orderitems_inventory",
                        column: x => x.imei,
                        principalTable: "inventoryitems",
                        principalColumn: "imei");
                    table.ForeignKey(
                        name: "fk_orderitems_orders",
                        column: x => x.orderid,
                        principalTable: "orders",
                        principalColumn: "orderid");
                    table.ForeignKey(
                        name: "fk_orderitems_packages",
                        column: x => x.packageid,
                        principalTable: "warrantypackages",
                        principalColumn: "packageid");
                });

            migrationBuilder.CreateTable(
                name: "warranties",
                columns: table => new
                {
                    warrantyid = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    imei = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    customerid = table.Column<int>(type: "integer", nullable: true),
                    startdate = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    enddate = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("warranties_pkey", x => x.warrantyid);
                    table.ForeignKey(
                        name: "fk_warranties_customers",
                        column: x => x.customerid,
                        principalTable: "customers",
                        principalColumn: "customerid");
                    table.ForeignKey(
                        name: "fk_warranties_inventory",
                        column: x => x.imei,
                        principalTable: "inventoryitems",
                        principalColumn: "imei");
                });

            migrationBuilder.CreateIndex(
                name: "IX_attributevalues_attributeid",
                table: "attributevalues",
                column: "attributeid");

            migrationBuilder.CreateIndex(
                name: "ix_auditlogs_userid",
                table: "auditlogs",
                column: "userid");

            migrationBuilder.CreateIndex(
                name: "ix_brands_brandname",
                table: "brands",
                column: "brandname",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_categories_categoryname",
                table: "categories",
                column: "categoryname",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_chatmessages_sessionid",
                table: "chatmessages",
                column: "sessionid");

            migrationBuilder.CreateIndex(
                name: "IX_chatsessions_customerid",
                table: "chatsessions",
                column: "customerid");

            migrationBuilder.CreateIndex(
                name: "customers_phone_key",
                table: "customers",
                column: "phone",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_customers_email",
                table: "customers",
                column: "email",
                filter: "email IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "ix_customers_phone",
                table: "customers",
                column: "phone",
                filter: "phone IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "ix_inventory_variantid",
                table: "inventoryitems",
                column: "variantid");

            migrationBuilder.CreateIndex(
                name: "IX_inventoryitems_podetailid",
                table: "inventoryitems",
                column: "podetailid");

            migrationBuilder.CreateIndex(
                name: "IX_news_userid",
                table: "news",
                column: "userid");

            migrationBuilder.CreateIndex(
                name: "ix_orderitems_imei",
                table: "orderitems",
                column: "imei");

            migrationBuilder.CreateIndex(
                name: "ix_orderitems_orderid",
                table: "orderitems",
                column: "orderid");

            migrationBuilder.CreateIndex(
                name: "IX_orderitems_packageid",
                table: "orderitems",
                column: "packageid");

            migrationBuilder.CreateIndex(
                name: "ix_orders_customerid_orderdate",
                table: "orders",
                columns: new[] { "customerid", "orderdate" });

            migrationBuilder.CreateIndex(
                name: "ix_orders_orderdate",
                table: "orders",
                column: "orderdate");

            migrationBuilder.CreateIndex(
                name: "ix_orders_orderstatus",
                table: "orders",
                column: "orderstatus");

            migrationBuilder.CreateIndex(
                name: "ix_orders_userid",
                table: "orders",
                column: "userid");

            migrationBuilder.CreateIndex(
                name: "IX_orders_vouchercode",
                table: "orders",
                column: "vouchercode");

            migrationBuilder.CreateIndex(
                name: "IX_productimages_variantid",
                table: "productimages",
                column: "variantid");

            migrationBuilder.CreateIndex(
                name: "ix_products_brandid",
                table: "products",
                column: "brandid");

            migrationBuilder.CreateIndex(
                name: "ix_products_categoryid",
                table: "products",
                column: "categoryid");

            migrationBuilder.CreateIndex(
                name: "ix_products_categoryid_brandid",
                table: "products",
                columns: new[] { "categoryid", "brandid" });

            migrationBuilder.CreateIndex(
                name: "ix_products_productname",
                table: "products",
                column: "productname");

            migrationBuilder.CreateIndex(
                name: "ix_productvariants_baseprice",
                table: "productvariants",
                column: "baseprice");

            migrationBuilder.CreateIndex(
                name: "IX_productvariants_conditionid",
                table: "productvariants",
                column: "conditionid");

            migrationBuilder.CreateIndex(
                name: "ix_productvariants_productid",
                table: "productvariants",
                column: "productid");

            migrationBuilder.CreateIndex(
                name: "ix_productvariants_saleprice",
                table: "productvariants",
                column: "saleprice");

            migrationBuilder.CreateIndex(
                name: "ix_productvariants_sku",
                table: "productvariants",
                column: "sku",
                unique: true,
                filter: "sku IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "productvariants_sku_key",
                table: "productvariants",
                column: "sku",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_purchaseorderdetails_poid",
                table: "purchaseorderdetails",
                column: "poid");

            migrationBuilder.CreateIndex(
                name: "IX_purchaseorderdetails_variantid",
                table: "purchaseorderdetails",
                column: "variantid");

            migrationBuilder.CreateIndex(
                name: "IX_purchaseorders_supplierid",
                table: "purchaseorders",
                column: "supplierid");

            migrationBuilder.CreateIndex(
                name: "IX_purchaseorders_userid",
                table: "purchaseorders",
                column: "userid");

            migrationBuilder.CreateIndex(
                name: "ix_reviews_customerid",
                table: "reviews",
                column: "customerid");

            migrationBuilder.CreateIndex(
                name: "ix_reviews_variantid",
                table: "reviews",
                column: "variantid");

            migrationBuilder.CreateIndex(
                name: "ix_users_email",
                table: "users",
                column: "email",
                unique: true,
                filter: "email IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "ix_users_isactive",
                table: "users",
                column: "isactive");

            migrationBuilder.CreateIndex(
                name: "ix_users_roleid",
                table: "users",
                column: "roleid");

            migrationBuilder.CreateIndex(
                name: "ix_users_username",
                table: "users",
                column: "username",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "users_username_key",
                table: "users",
                column: "username",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_variantattributevalues_valueid",
                table: "variantattributevalues",
                column: "valueid");

            migrationBuilder.CreateIndex(
                name: "IX_warranties_customerid",
                table: "warranties",
                column: "customerid");

            migrationBuilder.CreateIndex(
                name: "IX_warranties_imei",
                table: "warranties",
                column: "imei");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "auditlogs");

            migrationBuilder.DropTable(
                name: "banners");

            migrationBuilder.DropTable(
                name: "chatmessages");

            migrationBuilder.DropTable(
                name: "news");

            migrationBuilder.DropTable(
                name: "orderitems");

            migrationBuilder.DropTable(
                name: "productimages");

            migrationBuilder.DropTable(
                name: "reviews");

            migrationBuilder.DropTable(
                name: "sliders");

            migrationBuilder.DropTable(
                name: "variantattributevalues");

            migrationBuilder.DropTable(
                name: "warranties");

            migrationBuilder.DropTable(
                name: "chatsessions");

            migrationBuilder.DropTable(
                name: "orders");

            migrationBuilder.DropTable(
                name: "warrantypackages");

            migrationBuilder.DropTable(
                name: "attributevalues");

            migrationBuilder.DropTable(
                name: "inventoryitems");

            migrationBuilder.DropTable(
                name: "customers");

            migrationBuilder.DropTable(
                name: "vouchers");

            migrationBuilder.DropTable(
                name: "attributes");

            migrationBuilder.DropTable(
                name: "purchaseorderdetails");

            migrationBuilder.DropTable(
                name: "purchaseorders");

            migrationBuilder.DropTable(
                name: "productvariants");

            migrationBuilder.DropTable(
                name: "suppliers");

            migrationBuilder.DropTable(
                name: "users");

            migrationBuilder.DropTable(
                name: "productconditions");

            migrationBuilder.DropTable(
                name: "products");

            migrationBuilder.DropTable(
                name: "roles");

            migrationBuilder.DropTable(
                name: "brands");

            migrationBuilder.DropTable(
                name: "categories");
        }
    }
}
