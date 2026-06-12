using ECommerceBackend.Models;
using Microsoft.EntityFrameworkCore;

namespace ECommerceBackend.Data;

public static class DbInitializer
{
    public static async Task SeedAsync(IServiceProvider serviceProvider)
    {
        using var scope = serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ECommerceContext>();
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<ECommerceContext>>();

        try
        {
            await context.Database.EnsureCreatedAsync();
            try
            {
                await context.Database.ExecuteSqlRawAsync("CREATE TABLE IF NOT EXISTS \"__EFMigrationsHistory\" (\"MigrationId\" character varying(150) NOT NULL, \"ProductVersion\" character varying(32) NOT NULL, CONSTRAINT \"PK___EFMigrationsHistory\" PRIMARY KEY (\"MigrationId\"));");
                await context.Database.ExecuteSqlRawAsync("INSERT INTO \"__EFMigrationsHistory\" (\"MigrationId\", \"ProductVersion\") VALUES ('20260520143752_InitialCreate', '8.0.0') ON CONFLICT DO NOTHING;");
                await context.Database.ExecuteSqlRawAsync("INSERT INTO \"__EFMigrationsHistory\" (\"MigrationId\", \"ProductVersion\") VALUES ('20260529170615_IncreaseSpecLength', '8.0.0') ON CONFLICT DO NOTHING;");
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Failed to prepopulate migration history. This is expected if database doesn't support the raw SQL.");
            }
            await EnsureProductSeriesSchemaAsync(context);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Database connection failed. Seed skipped.");
            return;
        }

        // ── 1. ROLES ──────────────────────────────────────────────────────────
        var requiredRoles = new[]
        {
            new Role { Roleid = 1, Rolename = "Admin" },
            new Role { Roleid = 3, Rolename = "Customer" },
            new Role { Roleid = 4, Rolename = "Manager" },
            new Role { Roleid = 5, Rolename = "Sales" },
            new Role { Roleid = 6, Rolename = "Warehouse" },
            new Role { Roleid = 7, Rolename = "Warranty" },
            new Role { Roleid = 8, Rolename = "Content" },
            new Role { Roleid = 9, Rolename = "Consultant" }
        };

        var existingRoleIds = await context.Roles
            .Select(role => role.Roleid)
            .ToListAsync();
        var missingRoles = requiredRoles
            .Where(role => !existingRoleIds.Contains(role.Roleid))
            .ToList();
        if (missingRoles.Count > 0)
        {
            context.Roles.AddRange(missingRoles);
            await context.SaveChangesAsync();
        }

        try
        {
            await context.Database.ExecuteSqlRawAsync(
                "ALTER TABLE chatsessions ADD COLUMN IF NOT EXISTS assigneduserid integer NULL;");
            await context.Database.ExecuteSqlRawAsync(
                "ALTER TABLE chatsessions ADD COLUMN IF NOT EXISTS handoffstatus character varying(30) NULL;");
            await context.Database.ExecuteSqlRawAsync(
                "ALTER TABLE chatsessions ADD COLUMN IF NOT EXISTS handoffrequestedat timestamp without time zone NULL;");
            await context.Database.ExecuteSqlRawAsync(
                "CREATE INDEX IF NOT EXISTS ix_chatsessions_handoffstatus ON chatsessions (handoffstatus);");
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Could not initialize chat handoff columns.");
        }

        // ── 2. ADMIN USER (email @gmail.com + BCrypt hash) ───────────────────
        await SeedAdditionalDemoUsersAsync(context);

        var adminUser = await context.Users.FirstOrDefaultAsync(u => u.Username == "admin300475@gmail.com");
        if (adminUser == null)
        {
            string adminRaw = "Admin@300475!";
            adminUser = new User
            {
                Roleid = 1,
                Username = "admin300475@gmail.com",
                Passwordhash = BCrypt.Net.BCrypt.HashPassword(adminRaw),
                Fullname = "Quản trị viên hệ thống",
                Email = "admin300475@gmail.com",
                Phone = "0900000000",
                Createdat = DateTime.Now,
                Isactive = true,
            };
            context.Users.Add(adminUser);
        }
        else
        {
            adminUser.Passwordhash = BCrypt.Net.BCrypt.HashPassword("Admin@300475!");
        }

        var warehouseUser = await context.Users.FirstOrDefaultAsync(u => u.Username == "staff01@gmail.com");
        if (warehouseUser == null)
        {
            const string warehousePassword = "Warehouse@123456!";
            warehouseUser = new User
            {
                Roleid = 6,
                Username = "staff01@gmail.com",
                Passwordhash = BCrypt.Net.BCrypt.HashPassword(warehousePassword),
                Fullname = "Nhân viên kho",
                Email = "staff01@gmail.com",
                Phone = "0911111111",
                Createdat = DateTime.Now,
                Isactive = true,
            };
            context.Users.Add(warehouseUser);
        }
        else
        {
            warehouseUser.Roleid = 6;
            warehouseUser.Fullname = "Nhân viên kho";
            warehouseUser.Passwordhash = BCrypt.Net.BCrypt.HashPassword("Warehouse@123456!");
        }

        await context.SaveChangesAsync();
        try
        {
            await context.Database.ExecuteSqlRawAsync(
                "SELECT setval(pg_get_serial_sequence('users', 'userid'), " +
                "COALESCE((SELECT MAX(userid) FROM users), 1), true);");
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Could not synchronize the user ID sequence.");
        }

        // ── 3. CATEGORIES ────────────────────────────────────────────────────
        if (!context.Categories.Any())
        {
            context.Categories.AddRange(
                new Category { Categoryid = 1, Categoryname = "Điện thoại", Description = "Điện thoại thông minh các loại" },
                new Category { Categoryid = 2, Categoryname = "Laptop", Description = "Máy tính xách tay" },
                new Category { Categoryid = 3, Categoryname = "Máy tính bảng", Description = "Tablet và iPad" },
                new Category { Categoryid = 4, Categoryname = "Tai nghe", Description = "Tai nghe có dây và không dây" },
                new Category { Categoryid = 5, Categoryname = "Đồng hồ thông minh", Description = "Smartwatch & wearables" },
                new Category { Categoryid = 6, Categoryname = "Phụ kiện", Description = "Cáp, sạc, ốp lưng, bàn phím..." }
            );
            await context.SaveChangesAsync();
        }

        // ── 4. BRANDS ────────────────────────────────────────────────────────
        if (!context.Brands.Any())
        {
            context.Brands.AddRange(
                new Brand { Brandid = 1, Brandname = "Google Pixel" },
                new Brand { Brandid = 2, Brandname = "vivo" },
                new Brand { Brandid = 3, Brandname = "iQOO" },
                new Brand { Brandid = 4, Brandname = "Honor" },
                new Brand { Brandid = 5, Brandname = "OnePlus" },
                new Brand { Brandid = 6, Brandname = "OPPO" },
                new Brand { Brandid = 7, Brandname = "Realme" },
                new Brand { Brandid = 8, Brandname = "Xiaomi" },
                new Brand { Brandid = 9, Brandname = "Huawei" },
                new Brand { Brandid = 10, Brandname = "Meizu" },
                new Brand { Brandid = 11, Brandname = "iPhone" },
                new Brand { Brandid = 12, Brandname = "Samsung" },
                new Brand { Brandid = 13, Brandname = "Sony" },
                new Brand { Brandid = 14, Brandname = "Nothing Phone" }
            );
            await context.SaveChangesAsync();
        }

        // ── 4.1. PRODUCT SERIES ──────────────────────────────────────────────
        if (!context.Productseries.Any())
        {
            var brandIds = context.Brands.ToDictionary(b => b.Brandname, b => b.Brandid);
            var series = new List<Productseries>();

            void AddSeries(string brandName, params string[] names)
            {
                if (!brandIds.TryGetValue(brandName, out var brandId)) return;
                for (var index = 0; index < names.Length; index++)
                {
                    series.Add(new Productseries
                    {
                        Brandid = brandId,
                        Seriesname = names[index],
                        Displayorder = index,
                        Isactive = true,
                        Createdat = DateTime.Now
                    });
                }
            }

            AddSeries("Google Pixel", "Pixel", "Pixel Pro", "Pixel Fold");
            AddSeries("iPhone", "iPhone", "iPhone Pro", "iPhone Pro Max");
            AddSeries("Samsung", "Galaxy S", "Galaxy A", "Galaxy Z Fold", "Galaxy Z Flip");
            AddSeries("Xiaomi", "Xiaomi", "Redmi", "Poco");
            AddSeries("OPPO", "Find", "Reno", "A Series");
            AddSeries("vivo", "V Series", "Y Series", "X Series");
            AddSeries("Realme", "Number Series", "GT Series", "C Series");
            AddSeries("OnePlus", "OnePlus", "Nord");

            context.Productseries.AddRange(series);
            await context.SaveChangesAsync();
        }

        // ── 5. PRODUCTS & VARIANTS ───────────────────────────────────────────
        if (!context.Products.Any())
        {
            var products = new[]
            {
                new Product { Productid = 101, Categoryid = 1, Brandid = 1, Seriesid = context.Productseries.FirstOrDefault(s => s.Seriesname == "Pixel Pro" && s.Brand.Brandname == "Google Pixel")?.Seriesid, Productname = "Google Pixel 8 Pro", Description = "Điện thoại Google Pixel cao cấp nhất với chip Tensor G3 và camera AI.", Createdat = DateTime.UtcNow },
                new Product { Productid = 102, Categoryid = 1, Brandid = 11, Seriesid = context.Productseries.FirstOrDefault(s => s.Seriesname == "iPhone Pro Max" && s.Brand.Brandname == "iPhone")?.Seriesid, Productname = "iPhone 15 Pro Max", Description = "Khung Titan, chip A17 Pro, cổng USB-C tiện lợi.", Createdat = DateTime.UtcNow },
                new Product { Productid = 103, Categoryid = 1, Brandid = 12, Seriesid = context.Productseries.FirstOrDefault(s => s.Seriesname == "Galaxy S" && s.Brand.Brandname == "Samsung")?.Seriesid, Productname = "Samsung Galaxy S24 Ultra", Description = "Thiết kế phẳng, khung Titan chắc chắn, tích hợp các tính năng Galaxy AI.", Createdat = DateTime.UtcNow }
            };
            context.Products.AddRange(products);
            await context.SaveChangesAsync();

            var variants = new[]
            {
                new Productvariant { Variantid = 1011, Productid = 101, Condition = "Mới 100%", Sku = "PIX8P-128-NEW", Baseprice = 24990000, Saleprice = 23990000, Specifications = "{\"Màn hình\": \"6.7 inch OLED\", \"Chipset\": \"Google Tensor G3\", \"RAM\": \"12GB\", \"Bộ nhớ\": \"128GB\", \"Pin\": \"5050 mAh\"}" },
                new Productvariant { Variantid = 1012, Productid = 101, Condition = "Like New (99%)", Sku = "PIX8P-256-99", Baseprice = 21990000, Saleprice = null, Specifications = "{\"Màn hình\": \"6.7 inch OLED\", \"Chipset\": \"Google Tensor G3\", \"RAM\": \"12GB\", \"Bộ nhớ\": \"256GB\", \"Pin\": \"5050 mAh\"}" },
                new Productvariant { Variantid = 1021, Productid = 102, Condition = "Mới 100%", Sku = "IPH-15PM-256-NEW", Baseprice = 34990000, Saleprice = 32990000, Specifications = "{\"Màn hình\": \"6.7 inch Super Retina XDR\", \"Chipset\": \"Apple A17 Pro\", \"RAM\": \"8GB\", \"Bộ nhớ\": \"256GB\", \"Pin\": \"4441 mAh\"}" },
                new Productvariant { Variantid = 1022, Productid = 102, Condition = "Cũ đẹp (95%)", Sku = "IPH-15PM-256-95", Baseprice = 27990000, Saleprice = null, Specifications = "{\"Màn hình\": \"6.7 inch Super Retina XDR\", \"Chipset\": \"Apple A17 Pro\", \"RAM\": \"8GB\", \"Bộ nhớ\": \"256GB\", \"Pin\": \"4441 mAh\"}" },
                new Productvariant { Variantid = 1031, Productid = 103, Condition = "Mới 100%", Sku = "SAM-S24U-256-NEW", Baseprice = 33990000, Saleprice = 31990000, Specifications = "{\"Màn hình\": \"6.8 inch Dynamic AMOLED 2X\", \"Chipset\": \"Snapdragon 8 Gen 3 for Galaxy\", \"RAM\": \"12GB\", \"Bộ nhớ\": \"256GB\", \"Pin\": \"5000 mAh\"}" }
            };
            context.Productvariants.AddRange(variants);
            await context.SaveChangesAsync();
        }

        // Attach existing products to a matching series when possible.
        if (context.Products.Any(p => p.Seriesid == null) && context.Productseries.Any())
        {
            var series = context.Productseries
                .Include(s => s.Brand)
                .ToList();
            var productsWithoutSeries = context.Products
                .Include(p => p.Brand)
                .Where(p => p.Seriesid == null)
                .ToList();

            Productseries? FindSeries(Product product, params string[] names)
            {
                return series.FirstOrDefault(item =>
                    item.Brandid == product.Brandid &&
                    names.Any(name => item.Seriesname.Equals(name, StringComparison.OrdinalIgnoreCase)));
            }

            foreach (var product in productsWithoutSeries)
            {
                var name = product.Productname.ToLowerInvariant();
                Productseries? matched = null;

                if (name.Contains("redmi")) matched = FindSeries(product, "Redmi");
                else if (name.Contains("poco")) matched = FindSeries(product, "Poco");
                else if (name.Contains("xiaomi")) matched = FindSeries(product, "Xiaomi");
                else if (name.Contains("fold")) matched = FindSeries(product, "Galaxy Z Fold", "Pixel Fold");
                else if (name.Contains("flip")) matched = FindSeries(product, "Galaxy Z Flip");
                else if (name.Contains("galaxy s")) matched = FindSeries(product, "Galaxy S");
                else if (name.Contains("galaxy a")) matched = FindSeries(product, "Galaxy A");
                else if (name.Contains("pro max")) matched = FindSeries(product, "iPhone Pro Max");
                else if (name.Contains("iphone") && name.Contains("pro")) matched = FindSeries(product, "iPhone Pro");
                else if (name.Contains("iphone")) matched = FindSeries(product, "iPhone");
                else if (name.Contains("pixel") && name.Contains("pro")) matched = FindSeries(product, "Pixel Pro");
                else if (name.Contains("pixel")) matched = FindSeries(product, "Pixel");

                if (matched != null)
                {
                    product.Seriesid = matched.Seriesid;
                }
            }

            await context.SaveChangesAsync();
        }

        // ── 6. CUSTOMERS ─────────────────────────────────────────────────────
        if (!context.Customers.Any())
        {
            context.Customers.AddRange(
                new Customer { Customerid = 1, Fullname = "Nguyễn Văn An", Email = "an.nguyen@gmail.com", Phone = "0901234567", Address = "12 Nguyễn Huệ, Q1, TP.HCM", Createdat = DateTime.UtcNow.AddDays(-60) },
                new Customer { Customerid = 2, Fullname = "Trần Thị Bích", Email = "bich.tran@gmail.com", Phone = "0912345678", Address = "45 Lê Lợi, Q3, TP.HCM", Createdat = DateTime.UtcNow.AddDays(-45) },
                new Customer { Customerid = 3, Fullname = "Lê Minh Cường", Email = "cuong.le@gmail.com", Phone = "0923456789", Address = "78 Trần Hưng Đạo, Hoàn Kiếm, Hà Nội", Createdat = DateTime.UtcNow.AddDays(-30) }
            );
            await context.SaveChangesAsync();
        }

        // ── 7. INVENTORY ITEMS ────────────────────────────────────────────────
        if (!context.Inventoryitems.Any())
        {
            context.Inventoryitems.AddRange(
                new Inventoryitem { Imei = "IMEI-PIX8P-001", Variantid = 1011, Status = "InStock", Importedat = DateTime.UtcNow },
                new Inventoryitem { Imei = "IMEI-PIX8P-002", Variantid = 1011, Status = "InStock", Importedat = DateTime.UtcNow },
                new Inventoryitem { Imei = "IMEI-PIX8P-003", Variantid = 1012, Status = "InStock", Importedat = DateTime.UtcNow },
                new Inventoryitem { Imei = "IMEI-IPH15-001", Variantid = 1021, Status = "Sold", Importedat = DateTime.UtcNow, Warrantystartdate = DateTime.UtcNow.AddDays(-5), Warrantyenddate = DateTime.UtcNow.AddDays(360), Warrantystatus = "Active" },
                new Inventoryitem { Imei = "IMEI-IPH15-002", Variantid = 1021, Status = "InStock", Importedat = DateTime.UtcNow },
                new Inventoryitem { Imei = "IMEI-S24U-001", Variantid = 1031, Status = "InStock", Importedat = DateTime.UtcNow }
            );
            await context.SaveChangesAsync();
        }

        // ── 8. ORDERS & ORDER ITEMS ──────────────────────────────────────────
        if (context.Orders.Count() < 5)
        {
            // Clear existing order items and orders to avoid conflict
            context.Orderitems.RemoveRange(context.Orderitems);
            context.Orders.RemoveRange(context.Orders);
            await context.SaveChangesAsync();

            var today = DateTime.Today;

            // Seed Orders
            var order1 = new Order { Customerid = 1, Userid = 1, Orderdate = today.AddHours(7).AddMinutes(15), Totalamount = 24990000, Discountamount = 0, Finalamount = 24990000, Paymentmethod = "Momo", Orderstatus = "Completed" }; // today 07h
            var order2 = new Order { Customerid = 2, Userid = 1, Orderdate = today.AddHours(13).AddMinutes(30), Totalamount = 34990000, Discountamount = 2000000, Finalamount = 32990000, Paymentmethod = "VNPay", Orderstatus = "Completed", Vouchercode = "GIAM2TR" }; // today 13h
            var order3 = new Order { Customerid = 3, Userid = 1, Orderdate = today.AddHours(15).AddMinutes(45), Totalamount = 33990000, Discountamount = 0, Finalamount = 33990000, Paymentmethod = "Tiền mặt", Orderstatus = "Processing" }; // today 15h
            var order4 = new Order { Customerid = 1, Userid = 1, Orderdate = today.AddHours(16).AddMinutes(10), Totalamount = 21990000, Discountamount = 0, Finalamount = 21990000, Paymentmethod = "Chuyển khoản", Orderstatus = "Pending" }; // today 16h
            var order5 = new Order { Customerid = 2, Userid = 1, Orderdate = today.AddDays(-1).AddHours(10).AddMinutes(20), Totalamount = 34990000, Discountamount = 0, Finalamount = 34990000, Paymentmethod = "VNPay", Orderstatus = "Completed" }; // yesterday 10h
            var order6 = new Order { Customerid = 3, Userid = 1, Orderdate = today.AddDays(-1).AddHours(14).AddMinutes(50), Totalamount = 24990000, Discountamount = 0, Finalamount = 24990000, Paymentmethod = "Momo", Orderstatus = "Cancelled" }; // yesterday 14h (Cancelled)
            var order7 = new Order { Customerid = 1, Userid = 1, Orderdate = today.AddDays(-5).AddHours(11).AddMinutes(0), Totalamount = 21990000, Discountamount = 0, Finalamount = 21990000, Paymentmethod = "VNPay", Orderstatus = "Completed" }; // 5 days ago
            var order8 = new Order { Customerid = 2, Userid = 1, Orderdate = today.AddMonths(-1).AddHours(16).AddMinutes(30), Totalamount = 34990000, Discountamount = 0, Finalamount = 34990000, Paymentmethod = "Tiền mặt", Orderstatus = "Completed" }; // same day last month

            context.Orders.AddRange(order1, order2, order3, order4, order5, order6, order7, order8);
            await context.SaveChangesAsync();

            // Seed OrderItems
            context.Orderitems.AddRange(
                new Orderitem { Orderid = order1.Orderid, Imei = "IMEI-PIX8P-001", Packageid = 1, Sellingprice = 24990000, Warrantyprice = 0 },
                new Orderitem { Orderid = order2.Orderid, Imei = "IMEI-IPH15-001", Packageid = 1, Sellingprice = 34990000, Warrantyprice = 0 },
                new Orderitem { Orderid = order3.Orderid, Imei = "IMEI-S24U-001", Packageid = 2, Sellingprice = 33990000, Warrantyprice = 1000000 },
                new Orderitem { Orderid = order4.Orderid, Imei = "IMEI-PIX8P-003", Packageid = 1, Sellingprice = 21990000, Warrantyprice = 0 },
                new Orderitem { Orderid = order5.Orderid, Imei = "IMEI-IPH15-002", Packageid = 1, Sellingprice = 34990000, Warrantyprice = 0 },
                new Orderitem { Orderid = order7.Orderid, Imei = "IMEI-PIX8P-002", Packageid = 1, Sellingprice = 21990000, Warrantyprice = 0 }
            );

            // Set InventoryItems status as Sold for completed or processing orders
            var soldImeis = new[] { "IMEI-PIX8P-001", "IMEI-IPH15-001", "IMEI-S24U-001", "IMEI-IPH15-002", "IMEI-PIX8P-002" };
            foreach (var imei in soldImeis)
            {
                var item = await context.Inventoryitems.FindAsync(imei);
                if (item != null)
                {
                    item.Status = "Sold";
                    if (imei == "IMEI-IPH15-001")
                    {
                        item.Warrantystartdate = order2.Orderdate;
                        item.Warrantyenddate = order2.Orderdate.Value.AddYears(1);
                        item.Warrantystatus = "Active";
                    }
                }
            }

            await context.SaveChangesAsync();
        }

        // ── 9. PROMOTIONAL CONTENTS ──────────────────────────────────────────
        if (!context.Promotionalcontents.Any())
        {
            context.Promotionalcontents.AddRange(
                new Promotionalcontent { Contentid = 1, Contenttype = "Slider", Title = "iPhone 15 Pro Max - Khung Titan", Imageurl = "https://placehold.co/1400x500/0f172a/00e5ff?text=iPhone+15+Pro+Max", Linkurl = "/products/102", Displayorder = 1, Isactive = true, Createdat = DateTime.UtcNow },
                new Promotionalcontent { Contentid = 2, Contenttype = "Slider", Title = "Samsung Galaxy S24 Ultra - AI Phone", Imageurl = "https://placehold.co/1400x500/1e3a5f/ffffff?text=Samsung+Galaxy+S24+Ultra", Linkurl = "/products/103", Displayorder = 2, Isactive = true, Createdat = DateTime.UtcNow },
                new Promotionalcontent { Contentid = 3, Contenttype = "Banner", Title = "Flash Sale Google Pixel 8 Pro", Imageurl = "https://placehold.co/1200x400/2563eb/white?text=Google+Pixel+8+Pro+Sale", Linkurl = "/products/101", Isactive = true, Createdat = DateTime.UtcNow }
            );
            await context.SaveChangesAsync();
        }

        logger.LogInformation("✅ Seed data completed successfully.");
        try
        {
            await context.Database.ExecuteSqlRawAsync(
                "SELECT setval(pg_get_serial_sequence('productimages', 'imageid'), " +
                "COALESCE(MAX(imageid), 1), MAX(imageid) IS NOT NULL) FROM productimages;");
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Could not synchronize the product image ID sequence.");
        }
    }

    private static async Task EnsureProductSeriesSchemaAsync(ECommerceContext context)
    {
        await context.Database.ExecuteSqlRawAsync("""
            CREATE TABLE IF NOT EXISTS productseries (
                seriesid integer GENERATED BY DEFAULT AS IDENTITY,
                brandid integer NOT NULL,
                seriesname character varying(100) NOT NULL,
                displayorder integer DEFAULT 0,
                isactive boolean DEFAULT true,
                createdat timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT productseries_pkey PRIMARY KEY (seriesid)
            );
            """);

        await context.Database.ExecuteSqlRawAsync("""
            ALTER TABLE products ADD COLUMN IF NOT EXISTS seriesid integer;
            ALTER TABLE chatsessions ADD COLUMN IF NOT EXISTS assigneduserid integer;
            ALTER TABLE chatsessions ADD COLUMN IF NOT EXISTS handoffrequestedat timestamp without time zone;
            ALTER TABLE chatsessions ADD COLUMN IF NOT EXISTS handoffstatus character varying(30);
            ALTER TABLE orders ADD COLUMN IF NOT EXISTS checkouttype character varying(20) DEFAULT 'Registered';
            ALTER TABLE orders ADD COLUMN IF NOT EXISTS paymentstatus character varying(50) DEFAULT 'Unpaid';
            ALTER TABLE orders ADD COLUMN IF NOT EXISTS requiredpayment numeric(18,2) DEFAULT 0;
            ALTER TABLE orders ADD COLUMN IF NOT EXISTS paidamount numeric(18,2) DEFAULT 0;
            ALTER TABLE orders ADD COLUMN IF NOT EXISTS depositpercentage numeric(5,2);
            ALTER TABLE orders ADD COLUMN IF NOT EXISTS shippingname character varying(100);
            ALTER TABLE orders ADD COLUMN IF NOT EXISTS shippingphone character varying(20);
            ALTER TABLE orders ADD COLUMN IF NOT EXISTS shippingemail character varying(100);
            ALTER TABLE orders ADD COLUMN IF NOT EXISTS shippingaddress character varying(500);
            ALTER TABLE orders ADD COLUMN IF NOT EXISTS customernote character varying(500);
            ALTER TABLE orders ADD COLUMN IF NOT EXISTS reservationexpiresat timestamp without time zone;
            ALTER TABLE orders ADD COLUMN IF NOT EXISTS paymenttoken character varying(100);
            ALTER TABLE orders ADD COLUMN IF NOT EXISTS guesttoken character varying(100);
            ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancellationreason character varying(500);
            CREATE UNIQUE INDEX IF NOT EXISTS ix_productseries_brandid_seriesname ON productseries (brandid, seriesname);
            CREATE INDEX IF NOT EXISTS "IX_products_seriesid" ON products (seriesid);
            """);

        await context.Database.ExecuteSqlRawAsync("""
            CREATE TABLE IF NOT EXISTS orderpayments (
                paymentid integer GENERATED BY DEFAULT AS IDENTITY,
                orderid integer NOT NULL,
                provider character varying(50) NOT NULL,
                paymenttype character varying(30) NOT NULL,
                amount numeric(18,2) NOT NULL,
                status character varying(30) NOT NULL,
                transactionref character varying(100),
                createdat timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
                paidat timestamp without time zone,
                CONSTRAINT orderpayments_pkey PRIMARY KEY (paymentid)
            );
            CREATE INDEX IF NOT EXISTS "IX_orderpayments_orderid" ON orderpayments (orderid);

            CREATE TABLE IF NOT EXISTS orderassignments (
                assignmentid integer GENERATED BY DEFAULT AS IDENTITY,
                orderid integer NOT NULL,
                department character varying(30) NOT NULL,
                assigneduserid integer,
                assignedbyuserid integer,
                status character varying(30) NOT NULL DEFAULT 'Pending',
                assignedat timestamp without time zone,
                completedat timestamp without time zone,
                note character varying(500),
                CONSTRAINT orderassignments_pkey PRIMARY KEY (assignmentid)
            );
            CREATE UNIQUE INDEX IF NOT EXISTS ux_orderassignments_order_department
                ON orderassignments (orderid, department);
            CREATE INDEX IF NOT EXISTS ix_orderassignments_department_status
                ON orderassignments (department, status);
            CREATE INDEX IF NOT EXISTS ix_orderassignments_assigneduserid
                ON orderassignments (assigneduserid);

            CREATE TABLE IF NOT EXISTS inventorytransactions (
                transactionid integer GENERATED BY DEFAULT AS IDENTITY,
                imei character varying(50) NOT NULL,
                orderid integer,
                userid integer,
                transactiontype character varying(30) NOT NULL,
                fromstatus character varying(50),
                tostatus character varying(50) NOT NULL,
                note character varying(500),
                createdat timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT inventorytransactions_pkey PRIMARY KEY (transactionid)
            );
            CREATE INDEX IF NOT EXISTS ix_inventorytransactions_imei
                ON inventorytransactions (imei);
            CREATE INDEX IF NOT EXISTS ix_inventorytransactions_orderid
                ON inventorytransactions (orderid);
            CREATE INDEX IF NOT EXISTS ix_inventorytransactions_userid
                ON inventorytransactions (userid);
            CREATE INDEX IF NOT EXISTS ix_inventorytransactions_createdat
                ON inventorytransactions (createdat);

            CREATE TABLE IF NOT EXISTS chatproductrecommendations (
                recommendationid integer GENERATED BY DEFAULT AS IDENTITY,
                messageid integer NOT NULL,
                productid integer NOT NULL,
                variantid integer NOT NULL,
                rank integer NOT NULL,
                createdat timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
                addedtocartat timestamp without time zone,
                CONSTRAINT chatproductrecommendations_pkey PRIMARY KEY (recommendationid)
            );
            CREATE UNIQUE INDEX IF NOT EXISTS chatproductrecommendations_messageid_variantid_key
                ON chatproductrecommendations (messageid, variantid);
            CREATE INDEX IF NOT EXISTS ix_chatproductrecommendations_productid
                ON chatproductrecommendations (productid);
            CREATE INDEX IF NOT EXISTS ix_chatproductrecommendations_variantid
                ON chatproductrecommendations (variantid);
            CREATE INDEX IF NOT EXISTS ix_chatproductrecommendations_addedtocartat
                ON chatproductrecommendations (addedtocartat);

            INSERT INTO inventorytransactions (
                imei, transactiontype, fromstatus, tostatus, note, createdat
            )
            SELECT
                inventory.imei,
                'Baseline',
                NULL,
                COALESCE(inventory.status, 'InStock'),
                'Initial history entry for existing inventory.',
                COALESCE(inventory.importedat, CURRENT_TIMESTAMP)
            FROM inventoryitems AS inventory
            WHERE NOT EXISTS (
                SELECT 1 FROM inventorytransactions AS history
                WHERE history.imei = inventory.imei
            );
            """);

        await context.Database.ExecuteSqlRawAsync("""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint WHERE conname = 'fk_productseries_brands'
                ) THEN
                    ALTER TABLE productseries
                    ADD CONSTRAINT fk_productseries_brands
                    FOREIGN KEY (brandid) REFERENCES brands (brandid) ON DELETE CASCADE;
                END IF;

                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint WHERE conname = 'fk_products_productseries'
                ) THEN
                    ALTER TABLE products
                    ADD CONSTRAINT fk_products_productseries
                    FOREIGN KEY (seriesid) REFERENCES productseries (seriesid) ON DELETE SET NULL;
                END IF;

                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint WHERE conname = 'fk_orderpayments_orders'
                ) THEN
                    ALTER TABLE orderpayments
                    ADD CONSTRAINT fk_orderpayments_orders
                    FOREIGN KEY (orderid) REFERENCES orders (orderid) ON DELETE CASCADE;
                END IF;

                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint WHERE conname = 'fk_orderassignments_orders'
                ) THEN
                    ALTER TABLE orderassignments
                    ADD CONSTRAINT fk_orderassignments_orders
                    FOREIGN KEY (orderid) REFERENCES orders (orderid) ON DELETE CASCADE;
                END IF;

                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint WHERE conname = 'fk_orderassignments_assigned_users'
                ) THEN
                    ALTER TABLE orderassignments
                    ADD CONSTRAINT fk_orderassignments_assigned_users
                    FOREIGN KEY (assigneduserid) REFERENCES users (userid) ON DELETE SET NULL;
                END IF;

                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint WHERE conname = 'fk_orderassignments_assignedby_users'
                ) THEN
                    ALTER TABLE orderassignments
                    ADD CONSTRAINT fk_orderassignments_assignedby_users
                    FOREIGN KEY (assignedbyuserid) REFERENCES users (userid) ON DELETE SET NULL;
                END IF;

                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint WHERE conname = 'fk_inventorytransactions_inventory'
                ) THEN
                    ALTER TABLE inventorytransactions
                    ADD CONSTRAINT fk_inventorytransactions_inventory
                    FOREIGN KEY (imei) REFERENCES inventoryitems (imei) ON DELETE RESTRICT;
                END IF;

                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint WHERE conname = 'fk_inventorytransactions_orders'
                ) THEN
                    ALTER TABLE inventorytransactions
                    ADD CONSTRAINT fk_inventorytransactions_orders
                    FOREIGN KEY (orderid) REFERENCES orders (orderid) ON DELETE SET NULL;
                END IF;

                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint WHERE conname = 'fk_inventorytransactions_users'
                ) THEN
                    ALTER TABLE inventorytransactions
                    ADD CONSTRAINT fk_inventorytransactions_users
                    FOREIGN KEY (userid) REFERENCES users (userid) ON DELETE SET NULL;
                END IF;

                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint WHERE conname = 'fk_chatproductrecommendations_messages'
                ) THEN
                    ALTER TABLE chatproductrecommendations
                    ADD CONSTRAINT fk_chatproductrecommendations_messages
                    FOREIGN KEY (messageid) REFERENCES chatmessages (messageid) ON DELETE CASCADE;
                END IF;

                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint WHERE conname = 'fk_chatproductrecommendations_products'
                ) THEN
                    ALTER TABLE chatproductrecommendations
                    ADD CONSTRAINT fk_chatproductrecommendations_products
                    FOREIGN KEY (productid) REFERENCES products (productid) ON DELETE CASCADE;
                END IF;

                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint WHERE conname = 'fk_chatproductrecommendations_variants'
                ) THEN
                    ALTER TABLE chatproductrecommendations
                    ADD CONSTRAINT fk_chatproductrecommendations_variants
                    FOREIGN KEY (variantid) REFERENCES productvariants (variantid) ON DELETE CASCADE;
                END IF;
            END $$;
            """);
    }

    private static async Task SeedAdditionalDemoUsersAsync(ECommerceContext context)
    {
        var demoUsers = new[]
        {
            new DemoUserSeed(1, "admin02@gmail.com", "Admin@123456!", "Quản trị viên dự phòng", "0900000001"),
            new DemoUserSeed(3, "customer01@gmail.com", "Customer@123456!", "Khách hàng Demo 01", "0900000003"),
            new DemoUserSeed(3, "customer02@gmail.com", "Customer@123456!", "Khách hàng Demo 02", "0900000004"),
            new DemoUserSeed(4, "manager01@gmail.com", "Manager@123456!", "Quản lý Demo 01", "0900000005"),
            new DemoUserSeed(4, "manager02@gmail.com", "Manager@123456!", "Quản lý Demo 02", "0900000006"),
            new DemoUserSeed(5, "sales01@gmail.com", "Sales@123456!", "Nhân viên Sales 01", "0900000007"),
            new DemoUserSeed(5, "sales02@gmail.com", "Sales@123456!", "Nhân viên Sales 02", "0900000008"),
            new DemoUserSeed(6, "warehouse02@gmail.com", "Warehouse@123456!", "Nhân viên kho 02", "0900000010"),
            new DemoUserSeed(7, "warranty01@gmail.com", "Warranty@123456!", "Kỹ thuật bảo hành 01", "0900000011"),
            new DemoUserSeed(7, "warranty02@gmail.com", "Warranty@123456!", "Kỹ thuật bảo hành 02", "0900000012"),
            new DemoUserSeed(8, "content01@gmail.com", "Content@123456!", "Nhân viên nội dung 01", "0900000013"),
            new DemoUserSeed(8, "content02@gmail.com", "Content@123456!", "Nhân viên nội dung 02", "0900000014"),
            new DemoUserSeed(9, "consultant01@gmail.com", "Consultant@123456!", "Tư vấn viên 01", "0900000015"),
            new DemoUserSeed(9, "consultant02@gmail.com", "Consultant@123456!", "Tư vấn viên 02", "0900000016")
        };

        var usernames = demoUsers.Select(item => item.Username).ToList();
        var existingUsers = await context.Users
            .Where(user => usernames.Contains(user.Username))
            .ToDictionaryAsync(user => user.Username);

        foreach (var seed in demoUsers)
        {
            if (!existingUsers.TryGetValue(seed.Username, out var user))
            {
                user = new User
                {
                    Username = seed.Username,
                    Createdat = DateTime.Now
                };
                context.Users.Add(user);
            }

            user.Roleid = seed.Roleid;
            user.Passwordhash = BCrypt.Net.BCrypt.HashPassword(seed.Password);
            user.Fullname = seed.Fullname;
            user.Email = seed.Username;
            user.Phone = seed.Phone;
            user.Isactive = true;
        }

        await context.SaveChangesAsync();

        foreach (var seed in demoUsers.Where(item => item.Roleid == 3))
        {
            var customer = await context.Customers.FirstOrDefaultAsync(item =>
                item.Email == seed.Username || item.Phone == seed.Phone);
            if (customer == null)
            {
                context.Customers.Add(new Customer
                {
                    Fullname = seed.Fullname,
                    Email = seed.Username,
                    Phone = seed.Phone,
                    Address = "Địa chỉ khách hàng demo",
                    Createdat = DateTime.Now
                });
            }
            else
            {
                customer.Fullname = seed.Fullname;
                customer.Email = seed.Username;
                customer.Phone = seed.Phone;
                customer.Address ??= "Địa chỉ khách hàng demo";
            }
        }

        await context.SaveChangesAsync();
    }

    private sealed record DemoUserSeed(
        int Roleid,
        string Username,
        string Password,
        string Fullname,
        string Phone);
}
