using ECommerceBackend.Models;
using ECommerceBackend.Services;
using ECommerceBackend.Services.Chat;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

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
            await EnsureHomepageProductSectionsSchemaAsync(context);
            await EnsureProductSlugSchemaAsync(context);
            await EnsureNewsSlugSchemaAsync(context);
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
                new Brand { Brandid = 2, Brandname = "Vivo" },
                new Brand { Brandid = 3, Brandname = "IQOO" },
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
                new Brand { Brandid = 14, Brandname = "Nothing Phone" },
                new Brand { Brandid = 15, Brandname = "ASUS ROG" },
                new Brand { Brandid = 16, Brandname = "REDMAGIC" }
            );
            await context.SaveChangesAsync();
        }
        else
        {
            var requestedBrandNames = new[]
            {
                "Google Pixel", "Xiaomi", "Vivo", "IQOO", "Honor", "OnePlus", "OPPO",
                "iPhone", "Samsung", "Sony", "Huawei", "ASUS ROG", "REDMAGIC"
            };
            var existingBrands = await context.Brands.ToListAsync();
            foreach (var brandName in requestedBrandNames)
            {
                var brand = existingBrands.FirstOrDefault(item =>
                    item.Brandname.Equals(brandName, StringComparison.OrdinalIgnoreCase));
                if (brand == null)
                {
                    brand = new Brand { Brandname = brandName };
                    context.Brands.Add(brand);
                    existingBrands.Add(brand);
                }
                else
                {
                    brand.Brandname = brandName;
                }
            }

            await context.SaveChangesAsync();
        }

        // ── 4.1. PRODUCT SERIES ──────────────────────────────────────────────
        var requestedSeries = new Dictionary<string, string[]>(StringComparer.OrdinalIgnoreCase)
        {
            ["Google Pixel"] = new[]
            {
                "Pixel 10 series", "Pixel 11 series", "Pixel XL", "Pixel 9 series",
                "Pixel Fold", "Pixel 8 series", "Pixel Pro XL"
            },
            ["Xiaomi"] = new[]
            {
                "POCO", "REDMI", "Xiaomi 11 series", "Xiaomi 12 series",
                "Xiaomi 13 series", "Xiaomi 14 series", "Xiaomi 15 Series",
                "Xiaomi 17 Series", "Xiaomi Ultra"
            },
            ["Vivo"] = new[]
            {
                "S30 Series", "S50 Series", "V Series", "vivo X100 Series",
                "vivo X200 Series", "vivo X300 Series", "vivo Y300 Pro+",
                "X Fold 5", "X Series"
            },
            ["IQOO"] = new[]
            {
                "iQOO 12", "iQOO 12 Pro", "iQOO 13", "iQOO 15",
                "iQOO 15 Ultra", "iQOO 15T", "iQOO Z9 Turbo",
                "Neo 10 Series", "Neo11", "Neo9", "Z10 Series",
                "Z11 Series", "Z9"
            },
            ["Honor"] = new[]
            {
                "Honor 100 Series", "Honor 200 Series", "Honor 300 Series",
                "Honor 400 Series", "Honor 500 Series", "Honor 600 Series",
                "GT Series", "Magic 5 Series", "Magic 6 Series",
                "Magic 7 Series", "Magic 8 Series", "Magic V2", "Magic V5",
                "Power Series", "WIN Series", "X Series"
            },
            ["OnePlus"] = new[]
            {
                "Ace 2 Series", "Ace 3 Series", "Ace 5 Series", "Ace 6 Series",
                "Nord 4 Series", "Nord 5 Series", "OnePlus 13 Series",
                "OnePlus 15 Series", "Turbo Series", "Oneplus 10T",
                "Oneplus 11", "OnePlus 12"
            },
            ["OPPO"] = new[]
            {
                "A Series", "Find X8 Series", "Find X9 Series", "K Series",
                "Reno Series", "Find X7 Ultra"
            },
            ["iPhone"] = new[] { "iPhone", "iPhone Pro", "iPhone Pro Max", "iPhone 17 Pro Max" },
            ["Samsung"] = new[] { "Galaxy S", "Galaxy S Ultra", "Galaxy A", "Galaxy Z Fold", "Galaxy Z Flip" },
            ["Sony"] = new[] { "Xperia 1 Series" },
            ["Huawei"] = new[] { "Pura Ultra", "Pura Series" },
            ["ASUS ROG"] = new[] { "ROG Phone" },
            ["REDMAGIC"] = new[] { "RedMagic 11 Series" }
        };

        var brandsByName = await context.Brands.ToDictionaryAsync(
            brand => brand.Brandname,
            brand => brand,
            StringComparer.OrdinalIgnoreCase);
        var existingSeries = await context.Productseries.ToListAsync();
        foreach (var (brandName, seriesNames) in requestedSeries)
        {
            if (!brandsByName.TryGetValue(brandName, out var brand))
                continue;

            for (var index = 0; index < seriesNames.Length; index++)
            {
                var seriesName = seriesNames[index];
                var series = existingSeries.FirstOrDefault(item =>
                    item.Brandid == brand.Brandid &&
                    item.Seriesname.Equals(seriesName, StringComparison.OrdinalIgnoreCase));
                if (series == null)
                {
                    series = new Productseries
                    {
                        Brandid = brand.Brandid,
                        Seriesname = seriesName,
                        Createdat = DateTime.Now
                    };
                    context.Productseries.Add(series);
                    existingSeries.Add(series);
                }

                series.Seriesname = seriesName;
                series.Displayorder = index;
                series.Isactive = true;
            }
        }
        await context.SaveChangesAsync();

        // ── 5. PRODUCTS & VARIANTS ───────────────────────────────────────────
        if (!context.Products.Any())
        {
            var products = new[]
            {
                new Product { Productid = 101, Categoryid = 1, Brandid = 1, Seriesid = context.Productseries.FirstOrDefault(s => s.Seriesname == "Pixel 8 series" && s.Brand.Brandname == "Google Pixel")?.Seriesid, Productname = "Google Pixel 8 Pro", Description = "Điện thoại Google Pixel cao cấp nhất với chip Tensor G3 và camera AI.", Createdat = DateTime.UtcNow },
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

        await SeedDemoCatalogAsync(context);
        await EnsureProductSlugsAsync(context);
        await EnsureNewsSlugsAsync(context);
        await SeedHomepageProductSectionsAsync(context);
        await SeedDemoChatScenariosAsync(context);

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

                if (name.Contains("redmi")) matched = FindSeries(product, "REDMI");
                else if (name.Contains("poco")) matched = FindSeries(product, "POCO");
                else if (name.Contains("xiaomi 17")) matched = FindSeries(product, "Xiaomi 17 Series");
                else if (name.Contains("xiaomi 15")) matched = FindSeries(product, "Xiaomi 15 Series");
                else if (name.Contains("xiaomi 14")) matched = FindSeries(product, "Xiaomi 14 series");
                else if (name.Contains("xiaomi 13")) matched = FindSeries(product, "Xiaomi 13 series");
                else if (name.Contains("xiaomi 12")) matched = FindSeries(product, "Xiaomi 12 series");
                else if (name.Contains("xiaomi 11")) matched = FindSeries(product, "Xiaomi 11 series");
                else if (name.Contains("fold")) matched = FindSeries(product, "Galaxy Z Fold", "Pixel Fold");
                else if (name.Contains("flip")) matched = FindSeries(product, "Galaxy Z Flip");
                else if (name.Contains("galaxy s")) matched = FindSeries(product, "Galaxy S");
                else if (name.Contains("galaxy a")) matched = FindSeries(product, "Galaxy A");
                else if (name.Contains("pro max")) matched = FindSeries(product, "iPhone Pro Max");
                else if (name.Contains("iphone") && name.Contains("pro")) matched = FindSeries(product, "iPhone Pro");
                else if (name.Contains("iphone")) matched = FindSeries(product, "iPhone");
                else if (name.Contains("pixel 11")) matched = FindSeries(product, "Pixel 11 series");
                else if (name.Contains("pixel 10")) matched = FindSeries(product, "Pixel 10 series");
                else if (name.Contains("pixel 9")) matched = FindSeries(product, "Pixel 9 series");
                else if (name.Contains("pixel 8")) matched = FindSeries(product, "Pixel 8 series");
                else if (name.Contains("pixel") && name.Contains("xl")) matched = FindSeries(product, "Pixel XL");

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

        try
        {
            await context.Database.ExecuteSqlRawAsync(
                "SELECT setval(pg_get_serial_sequence('promotionalcontents', 'contentid'), " +
                "COALESCE(MAX(contentid), 1), MAX(contentid) IS NOT NULL) FROM promotionalcontents;");
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Could not synchronize the promotional content ID sequence.");
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

    private static async Task EnsureHomepageProductSectionsSchemaAsync(ECommerceContext context)
    {
        await context.Database.ExecuteSqlRawAsync("""
            CREATE TABLE IF NOT EXISTS homepageproductsections (
                sectionid integer GENERATED BY DEFAULT AS IDENTITY,
                sectionkey character varying(50) NOT NULL,
                title character varying(120) NOT NULL,
                subtitle character varying(300),
                theme character varying(30) NOT NULL DEFAULT 'LightBlue',
                displayorder integer DEFAULT 0,
                isactive boolean DEFAULT true,
                createdat timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT homepageproductsections_pkey PRIMARY KEY (sectionid)
            );
            CREATE UNIQUE INDEX IF NOT EXISTS homepageproductsections_sectionkey_key
                ON homepageproductsections (sectionkey);
            CREATE INDEX IF NOT EXISTS ix_homepageproductsections_active_order
                ON homepageproductsections (isactive, displayorder);

            CREATE TABLE IF NOT EXISTS homepageproductsectionitems (
                itemid integer GENERATED BY DEFAULT AS IDENTITY,
                sectionid integer NOT NULL,
                productid integer NOT NULL,
                displayorder integer DEFAULT 0,
                isactive boolean DEFAULT true,
                createdat timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT homepageproductsectionitems_pkey PRIMARY KEY (itemid)
            );
            CREATE UNIQUE INDEX IF NOT EXISTS homepageproductsectionitems_sectionid_productid_key
                ON homepageproductsectionitems (sectionid, productid);
            CREATE INDEX IF NOT EXISTS ix_homepageproductsectionitems_productid
                ON homepageproductsectionitems (productid);
            CREATE INDEX IF NOT EXISTS ix_homepageproductsectionitems_section_active_order
                ON homepageproductsectionitems (sectionid, isactive, displayorder);

            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint
                    WHERE conname = 'fk_homepageproductsectionitems_sections'
                ) THEN
                    ALTER TABLE homepageproductsectionitems
                    ADD CONSTRAINT fk_homepageproductsectionitems_sections
                    FOREIGN KEY (sectionid) REFERENCES homepageproductsections (sectionid)
                    ON DELETE CASCADE;
                END IF;

                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint
                    WHERE conname = 'fk_homepageproductsectionitems_products'
                ) THEN
                    ALTER TABLE homepageproductsectionitems
                    ADD CONSTRAINT fk_homepageproductsectionitems_products
                    FOREIGN KEY (productid) REFERENCES products (productid)
                    ON DELETE CASCADE;
                END IF;
            END $$;
            """);
    }

    private static async Task SeedHomepageProductSectionsAsync(ECommerceContext context)
    {
        var sectionSeeds = new[]
        {
            new { Key = "shock-sale", Title = "KHUYẾN MÃI SHOCK NHẤT", Subtitle = "Các mẫu đang có giá tốt, nên chốt nhanh trước khi hết hàng.", Theme = "Red", Order = 1 },
            new { Key = "best-sellers", Title = "TOP SẢN PHẨM BÁN CHẠY", Subtitle = "Những máy được khách quan tâm và chọn mua nhiều.", Theme = "LightBlue", Order = 2 },
            new { Key = "flagship", Title = "FLAGSHIP CAO CẤP", Subtitle = "Các mẫu hiệu năng mạnh, camera tốt và trải nghiệm cao cấp.", Theme = "LightBlue", Order = 3 }
        };

        var sections = await context.Homepageproductsections
            .Include(section => section.Items)
            .ToListAsync();

        foreach (var seed in sectionSeeds)
        {
            var section = sections.FirstOrDefault(item =>
                item.Sectionkey.Equals(seed.Key, StringComparison.OrdinalIgnoreCase));
            if (section == null)
            {
                section = new Homepageproductsection
                {
                    Sectionkey = seed.Key,
                    Createdat = DateTime.Now
                };
                context.Homepageproductsections.Add(section);
                sections.Add(section);
            }

            section.Title = seed.Title;
            section.Subtitle = seed.Subtitle;
            section.Theme = seed.Theme;
            section.Displayorder = seed.Order;
            section.Isactive = true;
        }

        await context.SaveChangesAsync();

        var products = await context.Products
            .Include(product => product.Productvariants)
            .OrderBy(product => product.Productid)
            .ToListAsync();
        if (products.Count == 0)
            return;

        foreach (var section in sections.Where(item => sectionSeeds.Any(seed =>
                     seed.Key.Equals(item.Sectionkey, StringComparison.OrdinalIgnoreCase))))
        {
            if (section.Items.Any())
                continue;

            var selectedProducts = section.Sectionkey switch
            {
                "shock-sale" => products
                    .Where(product => product.Productvariants.Any(variant =>
                        variant.Saleprice.HasValue && variant.Saleprice < variant.Baseprice))
                    .Take(5)
                    .ToList(),
                "flagship" => products
                    .Where(product =>
                        product.Productname.Contains("Pro", StringComparison.OrdinalIgnoreCase) ||
                        product.Productname.Contains("Ultra", StringComparison.OrdinalIgnoreCase) ||
                        product.Productname.Contains("Fold", StringComparison.OrdinalIgnoreCase))
                    .Take(5)
                    .ToList(),
                _ => products.Take(5).ToList()
            };

            if (selectedProducts.Count == 0)
            {
                selectedProducts = products.Take(5).ToList();
            }

            for (var index = 0; index < selectedProducts.Count; index++)
            {
                context.Homepageproductsectionitems.Add(new Homepageproductsectionitem
                {
                    Sectionid = section.Sectionid,
                    Productid = selectedProducts[index].Productid,
                    Displayorder = index,
                    Isactive = true,
                    Createdat = DateTime.Now
                });
            }
        }

        await context.SaveChangesAsync();
    }

    private static async Task SeedDemoChatScenariosAsync(ECommerceContext context)
    {
        const string demoPrefix = "[DEMO CHAT]";
        if (await context.Chatsessions.AnyAsync(session =>
                session.Status != null && session.Status.StartsWith(demoPrefix)))
        {
            return;
        }

        var customer = await context.Customers
            .OrderBy(customer => customer.Customerid)
            .FirstOrDefaultAsync(customer => customer.Email == "customer01@gmail.com")
            ?? await context.Customers.OrderBy(customer => customer.Customerid).FirstOrDefaultAsync();
        if (customer == null)
            return;

        var consultant = await context.Users
            .Include(user => user.Role)
            .Where(user => user.Role != null && user.Role.Rolename == "Consultant" && user.Isactive == true)
            .OrderBy(user => user.Userid)
            .FirstOrDefaultAsync();

        var skus = new[]
        {
            "DEMO-X14U-512-NEW",
            "DEMO-VX200P-512-NEW",
            "DEMO-IQNEO10-256-NEW",
            "DEMO-POCOF6P-512-NEW",
            "PIX8P-256-99",
            "IPH-15PM-256-NEW",
            "SAM-S24U-256-NEW"
        };
        var variantsBySku = await context.Productvariants
            .Include(variant => variant.Product)
            .Where(variant => variant.Sku != null && skus.Contains(variant.Sku))
            .ToDictionaryAsync(variant => variant.Sku!, StringComparer.OrdinalIgnoreCase);

        string ProductLink(string sku) =>
            variantsBySku.TryGetValue(sku, out var variant) && variant.Productid.HasValue
                ? $"/products/{variant.Productid.Value}"
                : "/products";

        void AddRecommendations(
            Chatmessage message,
            params (string Sku, int Rank, bool AddedToCart)[] recommendations)
        {
            foreach (var recommendation in recommendations)
            {
                if (!variantsBySku.TryGetValue(recommendation.Sku, out var variant))
                    continue;
                if (!variant.Productid.HasValue)
                    continue;

                message.Chatproductrecommendations.Add(new Chatproductrecommendation
                {
                    Productid = variant.Productid.Value,
                    Variantid = variant.Variantid,
                    Rank = recommendation.Rank,
                    Createdat = message.Sentat,
                    Addedtocartat = recommendation.AddedToCart ? message.Sentat?.AddMinutes(2) : null
                });
            }
        }

        async Task AddScenarioAsync(
            string title,
            string customerMessage,
            string assistantMessage,
            string[] quickReplies,
            bool waitingForConsultant,
            params (string Sku, int Rank, bool AddedToCart)[] recommendations)
        {
            var start = DateTime.Now.AddDays(-recommendations.Length - 1);
            var session = new Chatsession
            {
                Customerid = customer.Customerid,
                Starttime = start,
                Status = $"{demoPrefix} {title}",
                Handoffstatus = waitingForConsultant ? "Waiting" : null,
                Handoffrequestedat = waitingForConsultant ? start.AddMinutes(8) : null,
                Assigneduserid = waitingForConsultant ? consultant?.Userid : null
            };

            session.Chatmessages.Add(new Chatmessage
            {
                Sendertype = "user",
                Messagecontent = customerMessage,
                Sentat = start.AddMinutes(1)
            });

            var assistant = new Chatmessage
            {
                Sendertype = "assistant",
                Messagecontent = assistantMessage,
                Responsetype = recommendations.Length >= 2 && title.Contains("So sánh", StringComparison.OrdinalIgnoreCase)
                    ? ChatResponseTypes.Comparison
                    : ChatResponseTypes.Recommendation,
                Quickreplies = ChatResponseMetadata.SerializeQuickReplies(quickReplies),
                Sentat = start.AddMinutes(2)
            };
            AddRecommendations(assistant, recommendations);
            session.Chatmessages.Add(assistant);

            if (waitingForConsultant)
            {
                session.Chatmessages.Add(new Chatmessage
                {
                    Sendertype = "system",
                    Messagecontent = "Khách đã yêu cầu gặp tư vấn viên để chốt cấu hình và tình trạng máy.",
                    Sentat = start.AddMinutes(8)
                });
            }

            context.Chatsessions.Add(session);
            await context.SaveChangesAsync();
        }

        await AddScenarioAsync(
            "Tư vấn camera flagship",
            "Tư vấn máy chụp ảnh đẹp tầm 25-30 triệu",
            "Tôi ưu tiên các máy có công nghệ camera rõ ràng, không chỉ nhìn số MP.\n\n" +
            $"1. Xiaomi 14 Ultra\n   - New Seal: 27.990.000đ; còn hàng.\n     Lý do gợi ý: phù hợp nhu cầu chụp ảnh/quay video vì Leica Summilux, cảm biến lớn, OIS, periscope zoom; 8K, 4K HDR.\n   Xem chi tiết: {ProductLink("DEMO-X14U-512-NEW")}\n\n" +
            $"2. vivo X200 Pro\n   - New Seal: 27.990.000đ; còn hàng.\n     Lý do gợi ý: phù hợp nhu cầu chụp ảnh/quay video vì ZEISS T*, telephoto zoom, OIS, xử lý chân dung ZEISS; pin 6000mAh.\n   Xem chi tiết: {ProductLink("DEMO-VX200P-512-NEW")}",
            new[] { "Ưu tiên zoom xa", "Ưu tiên quay video", "Gặp nhân viên tư vấn" },
            waitingForConsultant: true,
            ("DEMO-X14U-512-NEW", 1, true),
            ("DEMO-VX200P-512-NEW", 2, false));

        await AddScenarioAsync(
            "Tư vấn gaming dưới 15 triệu",
            "Máy chơi game dưới 15 triệu, ưu tiên chip mạnh",
            "Tôi sẽ ưu tiên chipset, GPU, màn hình tần số quét cao và pin thay vì chỉ nhìn RAM.\n\n" +
            $"1. iQOO Neo 10\n   - New Seal: 12.490.000đ; còn hàng.\n     Lý do gợi ý: phù hợp chơi game vì Snapdragon 8 Gen 3; Adreno 750; màn 144Hz; pin 6100mAh.\n   Xem chi tiết: {ProductLink("DEMO-IQNEO10-256-NEW")}\n\n" +
            $"2. POCO F6 Pro\n   - New Seal: 13.490.000đ; còn hàng.\n     Lý do gợi ý: phù hợp chơi game vì Snapdragon 8 Gen 2; Adreno 740; màn 2K 120Hz; sạc 120W.\n   Xem chi tiết: {ProductLink("DEMO-POCOF6P-512-NEW")}",
            new[] { "Thêm iQOO vào giỏ", "So sánh với POCO", "Tư vấn pin lâu" },
            waitingForConsultant: false,
            ("DEMO-IQNEO10-256-NEW", 1, true),
            ("DEMO-POCOF6P-512-NEW", 2, false));

        await AddScenarioAsync(
            "So sánh flagship phổ biến",
            "So sánh Pixel 8 Pro, iPhone 15 Pro Max và Samsung S24 Ultra",
            "So sánh nhanh 3 sản phẩm:\n\n" +
            "1. Google Pixel 8 Pro\n   Giá: 21.990.000đ | Còn hàng\n   Camera: Google computational photography, Super Res Zoom, Night Sight, OIS\n\n" +
            "2. iPhone 15 Pro Max\n   Giá: 32.990.000đ | Tạm hết hàng\n   Camera: Photonic Engine, Deep Fusion, ProRAW, telephoto 5x\n\n" +
            "3. Samsung Galaxy S24 Ultra\n   Giá: 31.990.000đ | Tạm hết hàng\n   Camera: Galaxy AI, OIS, Nightography, periscope zoom\n\n" +
            "Gợi ý: Pixel hợp ảnh tự nhiên/AI, iPhone mạnh quay video, Samsung hợp zoom xa và S Pen.",
            new[] { "Ưu tiên camera", "Ưu tiên quay video", "Ưu tiên zoom xa" },
            waitingForConsultant: false,
            ("PIX8P-256-99", 1, false),
            ("IPH-15PM-256-NEW", 2, false),
            ("SAM-S24U-256-NEW", 3, false));
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

    private static async Task EnsureProductSlugSchemaAsync(ECommerceContext context)
    {
        await context.Database.ExecuteSqlRawAsync("""
            ALTER TABLE products
            ADD COLUMN IF NOT EXISTS slug character varying(220);
            CREATE UNIQUE INDEX IF NOT EXISTS products_slug_key
                ON products (slug)
                WHERE slug IS NOT NULL;
            """);
    }

    private static async Task EnsureProductSlugsAsync(ECommerceContext context)
    {
        var products = await context.Products
            .OrderBy(product => product.Productid)
            .ToListAsync();
        var usedSlugs = products
            .Where(product => !string.IsNullOrWhiteSpace(product.Slug))
            .Select(product => product.Slug!)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        var changed = false;
        foreach (var product in products)
        {
            if (!string.IsNullOrWhiteSpace(product.Slug))
                continue;

            var baseSlug = ProductSlugService.GenerateBaseSlug(product.Productname);
            var slug = baseSlug;
            var suffix = 2;
            while (!usedSlugs.Add(slug))
            {
                slug = $"{baseSlug}-{suffix++}";
            }

            product.Slug = slug;
            changed = true;
        }

        if (changed)
        {
            await context.SaveChangesAsync();
        }
    }

    private static async Task EnsureNewsSlugSchemaAsync(ECommerceContext context)
    {
        await context.Database.ExecuteSqlRawAsync("""
            ALTER TABLE news
            ADD COLUMN IF NOT EXISTS slug character varying(220);
            CREATE UNIQUE INDEX IF NOT EXISTS news_slug_key
                ON news (slug)
                WHERE slug IS NOT NULL;
            """);
    }

    private static async Task EnsureNewsSlugsAsync(ECommerceContext context)
    {
        var newsList = await context.News
            .OrderBy(news => news.Postid)
            .ToListAsync();
        var usedSlugs = newsList
            .Where(news => !string.IsNullOrWhiteSpace(news.Slug))
            .Select(news => news.Slug!)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        var changed = false;
        foreach (var news in newsList)
        {
            if (!string.IsNullOrWhiteSpace(news.Slug))
                continue;

            var baseSlug = ProductSlugService.GenerateBaseSlug(news.Title);
            var slug = baseSlug;
            var suffix = 2;
            while (!usedSlugs.Add(slug))
            {
                slug = $"{baseSlug}-{suffix++}";
            }

            news.Slug = slug;
            changed = true;
        }

        if (changed)
        {
            await context.SaveChangesAsync();
        }
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

    private static async Task SeedDemoCatalogAsync(ECommerceContext context)
    {
        await context.Database.ExecuteSqlRawAsync("""
            SELECT setval(
                pg_get_serial_sequence('products', 'productid'),
                COALESCE((SELECT MAX(productid) FROM products), 1),
                EXISTS (SELECT 1 FROM products));
            SELECT setval(
                pg_get_serial_sequence('productvariants', 'variantid'),
                COALESCE((SELECT MAX(variantid) FROM productvariants), 1),
                EXISTS (SELECT 1 FROM productvariants));
            SELECT setval(
                pg_get_serial_sequence('productimages', 'imageid'),
                COALESCE((SELECT MAX(imageid) FROM productimages), 1),
                EXISTS (SELECT 1 FROM productimages));
            """);

        var demoProducts = new List<DemoProductSeed>
        {
            new DemoProductSeed(
                "Google Pixel", "Pixel 8 series", "Google Pixel 8 Pro",
                "Pixel flagship thiên về ảnh tính toán, Android thuần và camera AI.",
                "PIX8P-256-99", 21_990_000, null, 1,
                Specs("6.7 inch LTPO OLED 120Hz", "Google Tensor G3", "12GB", "256GB", "50MP OIS + 48MP ultrawide + 48MP telephoto", "10.5MP", "5050mAh", "Sạc nhanh 30W", "Android",
                    cameraTechnology: "Google computational photography, Super Res Zoom, Night Sight, OIS",
                    video: "4K 60fps, Video Boost",
                    gpu: "Mali-G715",
                    highlights: "Rất hợp người thích ảnh tự nhiên, ảnh đêm và trải nghiệm Android thuần")),
            new DemoProductSeed(
                "Google Pixel", "Pixel 9 series", "Google Pixel 9 Pro",
                "Điện thoại AI tập trung vào camera, ảnh chân dung và trải nghiệm Android thuần.",
                "DEMO-PIX9P-256-NEW", 27_990_000, 25_990_000, 2,
                Specs("6.3 inch LTPO OLED 120Hz", "Google Tensor G4", "16GB", "256GB", "50MP + 48MP + 48MP OIS", "42MP", "4700mAh", "Sạc nhanh 27W", "Android",
                    cameraTechnology: "Google computational photography, Super Res Zoom, OIS",
                    video: "4K HDR, chống rung điện tử",
                    gpu: "Google Tensor GPU",
                    highlights: "Mạnh về ảnh chân dung, xử lý ảnh AI và trải nghiệm Android thuần")),
            new DemoProductSeed(
                "Google Pixel", "Pixel 10 series", "Google Pixel 10 Pro",
                "Pixel đời mới tập trung AI, camera xử lý tính toán và trải nghiệm Android sạch.",
                "DEMO-PIX10P-256-NEW", 25_990_000, 23_990_000, 1,
                Specs("6.3 inch LTPO OLED 120Hz", "Google Tensor G5", "16GB", "256GB", "50MP OIS + 48MP ultrawide + 48MP telephoto", "42MP", "4870mAh", "Sạc nhanh USB-C, sạc không dây", "Android",
                    cameraTechnology: "Google AI camera, Super Res Zoom, Night Sight, OIS",
                    video: "4K HDR, chống rung điện tử",
                    gpu: "Google Tensor GPU",
                    highlights: "Phù hợp người cần camera AI, ảnh chân dung và cập nhật Android lâu dài")),
            new DemoProductSeed(
                "Google Pixel", "Pixel Pro XL", "Google Pixel 10 Pro XL",
                "Pixel màn hình lớn, mạnh về ảnh đêm, HDR, chân dung và các tính năng AI của Google.",
                "DEMO-PIX10PXL-256-NEW", 31_990_000, 29_490_000, 2,
                Specs("6.8 inch LTPO OLED 120Hz", "Google Tensor G5", "16GB", "256GB", "50MP OIS + 48MP ultrawide + 48MP telephoto", "42MP", "5200mAh", "USB-C, sạc không dây Pixelsnap", "Android",
                    cameraTechnology: "Google computational photography, Gemini AI, Night Sight, Super Res Zoom, OIS",
                    video: "4K HDR, Video Boost, chống rung điện tử",
                    gpu: "Google Tensor GPU",
                    highlights: "Rất hợp khách thích ảnh tự nhiên, ảnh đêm, HDR và chỉnh ảnh bằng AI")),
            new DemoProductSeed(
                "iPhone", "iPhone Pro Max", "iPhone 15 Pro Max",
                "iPhone Pro Max khung titan, chip A17 Pro, quay video tốt và zoom xa.",
                "IPH-15PM-256-NEW", 34_990_000, 32_990_000, 0,
                Specs("6.7 inch Super Retina XDR OLED 120Hz", "Apple A17 Pro", "8GB", "256GB", "48MP OIS + 12MP ultrawide + 12MP telephoto 5x", "12MP", "4422mAh", "USB-C, MagSafe", "iOS",
                    cameraTechnology: "Photonic Engine, Deep Fusion, ProRAW, telephoto 5x",
                    video: "4K Dolby Vision, ProRes, Log video",
                    gpu: "Apple GPU 6-core",
                    highlights: "Mạnh về quay video, hiệu năng ổn định và hệ sinh thái Apple")),
            new DemoProductSeed(
                "iPhone", "iPhone", "iPhone 16",
                "Mẫu iPhone cân bằng cho học tập, làm việc, quay video và sử dụng lâu dài.",
                "DEMO-IP16-128-NEW", 22_990_000, 21_490_000, 3,
                Specs("6.1 inch Super Retina XDR OLED", "Apple A18", "8GB", "128GB", "48MP + 12MP", "12MP", "3561mAh", "USB-C, MagSafe", "iOS",
                    cameraTechnology: "Photonic Engine, Deep Fusion, Smart HDR",
                    video: "4K Dolby Vision",
                    gpu: "Apple GPU",
                    highlights: "Cân bằng cho học tập, quay video và dùng lâu dài")),
            new DemoProductSeed(
                "iPhone", "iPhone Pro", "iPhone 16 Pro",
                "Thiết bị cao cấp nhỏ gọn, hiệu năng mạnh và quay video chuyên nghiệp.",
                "DEMO-IP16P-256-NEW", 31_990_000, 29_990_000, 2,
                Specs("6.3 inch LTPO Super Retina XDR 120Hz", "Apple A18 Pro", "8GB", "256GB", "48MP + 48MP + 12MP", "12MP", "3582mAh", "USB-C, MagSafe", "iOS",
                    cameraTechnology: "Photonic Engine, Deep Fusion, ProRAW, OIS",
                    video: "4K Dolby Vision, ProRes",
                    gpu: "Apple GPU 6-core",
                    highlights: "Hợp người cần máy nhỏ gọn nhưng hiệu năng và quay video mạnh")),
            new DemoProductSeed(
                "iPhone", "iPhone Pro Max", "iPhone 16 Pro Max",
                "iPhone màn hình lớn, camera zoom tốt, pin lâu và hiệu năng cao.",
                "DEMO-IP16PM-256-NEW", 37_990_000, 35_490_000, 2,
                Specs("6.9 inch LTPO Super Retina XDR 120Hz", "Apple A18 Pro", "8GB", "256GB", "48MP + 48MP + 12MP telephoto", "12MP", "4685mAh", "USB-C, MagSafe", "iOS",
                    cameraTechnology: "Photonic Engine, Deep Fusion, ProRAW, telephoto zoom",
                    video: "4K Dolby Vision, ProRes",
                    gpu: "Apple GPU 6-core",
                    highlights: "Hợp người cần màn lớn, pin tốt, quay video và zoom xa")),
            new DemoProductSeed(
                "iPhone", "iPhone 17 Pro Max", "iPhone 17 Pro Max",
                "iPhone cao cấp tập trung quay video, màu ổn định, telephoto chất lượng cao và hệ sinh thái Apple.",
                "DEMO-IP17PM-256-NEW", 43_990_000, 41_990_000, 2,
                Specs("6.9 inch LTPO Super Retina XDR 120Hz", "Apple A19 Pro", "12GB", "256GB", "48MP Fusion + 48MP ultrawide + 48MP tetraprism telephoto", "18MP Center Stage", "5000mAh", "USB-C, MagSafe", "iOS",
                    cameraTechnology: "Photonic Engine, Deep Fusion, ProRAW, tetraprism telephoto, Center Stage",
                    video: "4K Dolby Vision, ProRes, Log video, Dual Capture",
                    gpu: "Apple GPU thế hệ mới",
                    highlights: "Ưu tiên quay video, màu dễ dùng, chụp nhanh ổn định và zoom iPhone tốt nhất")),
            new DemoProductSeed(
                "Samsung", "Galaxy S", "Samsung Galaxy S24 Ultra",
                "Flagship Samsung có Galaxy AI, S Pen, màn hình lớn và camera zoom đa dụng.",
                "SAM-S24U-256-NEW", 33_990_000, 31_990_000, 0,
                Specs("6.8 inch Dynamic AMOLED 2X 120Hz", "Snapdragon 8 Gen 3 for Galaxy", "12GB", "256GB", "200MP OIS + 12MP ultrawide + 10MP telephoto 3x + 50MP periscope 5x", "12MP", "5000mAh", "Sạc nhanh 45W", "Android",
                    cameraTechnology: "Galaxy AI, OIS, Nightography, periscope zoom",
                    video: "8K, 4K, Super Steady",
                    gpu: "Adreno 750",
                    highlights: "Hợp người cần zoom xa, ghi chú S Pen, màn đẹp và hiệu năng cao")),
            new DemoProductSeed(
                "Samsung", "Galaxy S Ultra", "Samsung Galaxy S26 Ultra",
                "Flagship Samsung 2026 đa dụng, zoom tốt, màu ảnh rực và nhiều công cụ AI chỉnh ảnh.",
                "DEMO-S26U-512-NEW", 39_990_000, 37_990_000, 2,
                Specs("6.9 inch Dynamic LTPO AMOLED 2X 120Hz", "Snapdragon 8 Elite Gen 5 for Galaxy", "12GB", "512GB", "200MP OIS f/1.4 + 50MP ultrawide + 10MP telephoto 3x + 50MP periscope 5x", "12MP", "5000mAh", "Sạc nhanh 60W, sạc không dây", "Android",
                    cameraTechnology: "ProVisual Engine, Galaxy AI, Nightography, OIS, ALoP telephoto 5x",
                    video: "8K 30fps, 4K 60fps, Super Steady, Horizon Lock",
                    gpu: "Adreno 840",
                    highlights: "Rất đa dụng: zoom xa, ảnh rực, AI chỉnh ảnh và hiệu năng flagship")),
            new DemoProductSeed(
                "Samsung", "Galaxy S", "Samsung Galaxy S24 FE",
                "Điện thoại Galaxy AI dễ tiếp cận, màn hình đẹp và camera đa dụng.",
                "DEMO-S24FE-256-NEW", 16_990_000, 14_990_000, 3,
                Specs("6.7 inch Dynamic AMOLED 2X 120Hz", "Exynos 2400e", "8GB", "256GB", "50MP OIS + 12MP + 8MP", "10MP", "4700mAh", "Sạc nhanh 25W", "Android",
                    cameraTechnology: "Galaxy AI, OIS, Nightography",
                    video: "4K, chống rung Super Steady",
                    gpu: "Xclipse GPU",
                    highlights: "Màn hình đẹp, camera đa dụng và giá dễ tiếp cận")),
            new DemoProductSeed(
                "Samsung", "Galaxy A", "Samsung Galaxy A55 5G",
                "Máy tầm trung bền bỉ, chống nước, pin tốt cho học tập và công việc.",
                "DEMO-A55-256-NEW", 11_490_000, 9_990_000, 3,
                Specs("6.6 inch Super AMOLED 120Hz", "Exynos 1480", "8GB", "256GB", "50MP OIS + 12MP + 5MP", "32MP", "5000mAh", "Sạc nhanh 25W", "Android",
                    cameraTechnology: "OIS, chụp đêm, chống rung",
                    video: "4K",
                    gpu: "Xclipse GPU",
                    highlights: "Tầm trung bền, pin 5000mAh và phù hợp học tập")),
            new DemoProductSeed(
                "Samsung", "Galaxy Z Fold", "Samsung Galaxy Z Fold6",
                "Điện thoại gập phục vụ đa nhiệm, đọc tài liệu và làm việc trên màn hình lớn.",
                "DEMO-ZF6-512-NEW", 47_990_000, 43_990_000, 1,
                Specs("7.6 inch Dynamic AMOLED 2X 120Hz", "Snapdragon 8 Gen 3 for Galaxy", "12GB", "512GB", "50MP OIS + 12MP + 10MP", "10MP + 4MP", "4400mAh", "Sạc nhanh 25W", "Android",
                    cameraTechnology: "Galaxy AI, OIS, telephoto",
                    video: "4K, Super Steady",
                    gpu: "Adreno 750",
                    highlights: "Mạnh về đa nhiệm, đọc tài liệu và làm việc trên màn hình lớn")),
            new DemoProductSeed(
                "Xiaomi", "Xiaomi 14 series", "Xiaomi 14T Pro",
                "Máy hiệu năng cao, camera Leica và sạc nhanh phù hợp game lẫn chụp ảnh.",
                "DEMO-X14TP-512-NEW", 18_990_000, 16_990_000, 3,
                Specs("6.67 inch AMOLED 144Hz", "MediaTek Dimensity 9300+", "12GB", "512GB", "50MP Leica OIS + 50MP + 12MP", "32MP", "5000mAh", "Sạc nhanh 120W", "Android",
                    cameraTechnology: "Leica Summilux, OIS, màu Leica Authentic/Vibrant",
                    video: "4K HDR",
                    gpu: "Immortalis-G720",
                    highlights: "Cân bằng giữa gaming, camera Leica và sạc rất nhanh")),
            new DemoProductSeed(
                "Xiaomi", "Xiaomi 14 series", "Xiaomi 14 Ultra",
                "Flagship Xiaomi thiên camera Leica, cảm biến lớn và hiệu năng Snapdragon đầu bảng.",
                "DEMO-X14U-512-NEW", 29_990_000, 27_990_000, 2,
                Specs("6.73 inch LTPO AMOLED 120Hz", "Snapdragon 8 Gen 3", "16GB", "512GB", "50MP Leica OIS + 50MP ultrawide + 50MP telephoto + 50MP periscope", "32MP", "5000mAh", "Sạc nhanh 90W, sạc không dây 80W", "Android",
                    cameraTechnology: "Leica Summilux, cảm biến lớn, OIS, periscope zoom",
                    video: "8K, 4K HDR",
                    gpu: "Adreno 750",
                    highlights: "Rất mạnh cho chụp ảnh, zoom, quay video và vẫn đủ mạnh để chơi game")),
            new DemoProductSeed(
                "Xiaomi", "Xiaomi 15 Series", "Xiaomi 15 Ultra",
                "Flagship camera Leica với cảm biến lớn, telephoto độ phân giải cao và bộ phụ kiện chụp ảnh chuyên sâu.",
                "DEMO-X15U-512-NEW", 35_990_000, 33_490_000, 2,
                Specs("6.73 inch LTPO AMOLED 120Hz", "Snapdragon 8 Elite", "16GB", "512GB", "50MP Leica OIS + 50MP ultrawide + 50MP telephoto + 200MP periscope", "32MP", "5410mAh", "Sạc nhanh 90W, sạc không dây 80W", "Android",
                    cameraTechnology: "Leica Summilux, cảm biến 1-inch type, 200MP periscope, OIS, Leica Authentic/Vibrant",
                    video: "8K, 4K HDR, quay Log",
                    gpu: "Adreno 830",
                    highlights: "Một trong các máy hợp nhất cho khách thích chất ảnh Leica, zoom xa và chỉnh tay")),
            new DemoProductSeed(
                "Xiaomi", "REDMI", "Redmi Note 13 Pro+ 5G",
                "Điện thoại tầm trung có camera độ phân giải cao, màn hình đẹp và sạc nhanh.",
                "DEMO-RN13P-256-NEW", 10_990_000, 9_490_000, 3,
                Specs("6.67 inch AMOLED 120Hz", "MediaTek Dimensity 7200 Ultra", "8GB", "256GB", "200MP OIS + 8MP + 2MP", "16MP", "5000mAh", "Sạc nhanh 120W", "Android",
                    cameraTechnology: "OIS, cảm biến độ phân giải cao",
                    video: "4K",
                    gpu: "Mali-G610",
                    highlights: "Giá tốt, màn hình đẹp và sạc 120W; camera nhiều MP nhưng không phải flagship camera")),
            new DemoProductSeed(
                "Xiaomi", "POCO", "POCO F6 Pro",
                "Điện thoại gaming hiệu năng cao, màn hình 2K và sạc nhanh.",
                "DEMO-POCOF6P-512-NEW", 14_990_000, 13_490_000, 3,
                Specs("6.67 inch AMOLED 2K 120Hz", "Snapdragon 8 Gen 2", "12GB", "512GB", "50MP OIS + 8MP + 2MP", "16MP", "5000mAh", "Sạc nhanh 120W", "Android",
                    cameraTechnology: "OIS",
                    video: "4K",
                    gpu: "Adreno 740",
                    highlights: "Ưu tiên hiệu năng gaming, màn 2K và sạc nhanh trong tầm giá")),
            new DemoProductSeed(
                "Vivo", "vivo X200 Series", "vivo X200 Pro",
                "Flagship thiên về camera chân dung, zoom xa và thời lượng pin cao.",
                "DEMO-VX200P-512-NEW", 29_990_000, 27_990_000, 2,
                Specs("6.78 inch LTPO AMOLED 120Hz", "MediaTek Dimensity 9400", "16GB", "512GB", "50MP OIS + 50MP + 200MP telephoto", "32MP", "6000mAh", "Sạc nhanh 90W", "Android",
                    cameraTechnology: "ZEISS T*, telephoto zoom, OIS, xử lý chân dung ZEISS",
                    video: "4K HDR, chống rung",
                    gpu: "Immortalis-G925",
                    highlights: "Rất hợp chụp chân dung, zoom xa và pin lớn")),
            new DemoProductSeed(
                "Vivo", "vivo X300 Series", "vivo X300 Ultra",
                "Flagship camera ZEISS cao cấp, tập trung chân dung, zoom xa và quay video chuyên sâu.",
                "DEMO-VX300U-512-NEW", 37_990_000, 35_990_000, 2,
                Specs("6.8 inch LTPO AMOLED 120Hz", "Snapdragon 8 Elite Gen 5", "16GB", "512GB", "50MP OIS + 50MP ultrawide + 200MP ZEISS telephoto", "50MP", "6000mAh", "Sạc nhanh 90W, sạc không dây", "Android",
                    cameraTechnology: "ZEISS T*, ZEISS portrait, telephoto OIS, full focal length imaging",
                    video: "4K 120fps, 10-bit Log, chống rung",
                    gpu: "Adreno 840",
                    highlights: "Rất hợp khách ưu tiên chân dung, zoom xa, màu ZEISS và quay video nâng cao")),
            new DemoProductSeed(
                "Vivo", "V Series", "vivo V40 5G",
                "Điện thoại mỏng nhẹ, camera chân dung ZEISS và pin tốt.",
                "DEMO-VV40-256-NEW", 15_990_000, 13_990_000, 2,
                Specs("6.78 inch AMOLED 120Hz", "Snapdragon 7 Gen 3", "12GB", "256GB", "50MP OIS + 50MP", "50MP", "5500mAh", "Sạc nhanh 80W", "Android",
                    cameraTechnology: "ZEISS Portrait, Aura Light, OIS",
                    video: "4K",
                    gpu: "Adreno 720",
                    highlights: "Mỏng nhẹ, chụp chân dung đẹp và camera trước 50MP")),
            new DemoProductSeed(
                "IQOO", "iQOO 13", "iQOO 13",
                "Điện thoại gaming cao cấp với chip mạnh, màn hình tần số quét cao và pin lớn.",
                "DEMO-IQ13-512-NEW", 20_990_000, 18_990_000, 3,
                Specs("6.82 inch LTPO AMOLED 144Hz", "Snapdragon 8 Elite", "16GB", "512GB", "50MP OIS + 50MP + 50MP", "32MP", "6150mAh", "Sạc nhanh 120W", "Android",
                    cameraTechnology: "OIS, camera đa tiêu cự",
                    video: "4K, chống rung",
                    gpu: "Adreno thế hệ mới",
                    highlights: "Rất mạnh cho gaming nhờ chip đầu bảng, màn 144Hz và pin lớn")),
            new DemoProductSeed(
                "IQOO", "iQOO 15", "iQOO 15",
                "Flagship gaming mới của iQOO với chip Snapdragon đầu bảng, màn 2K 144Hz và chip xử lý game riêng.",
                "DEMO-IQ15-512-NEW", 24_990_000, 22_990_000, 3,
                Specs("6.85 inch 2K LTPO AMOLED 144Hz", "Snapdragon 8 Elite Gen 5", "16GB", "512GB", "50MP OIS + 50MP ultrawide + 50MP telephoto", "32MP", "7000mAh", "Sạc nhanh 100W", "Android",
                    cameraTechnology: "OIS, camera đa tiêu cự, xử lý AI",
                    video: "4K, chống rung",
                    gpu: "Adreno 840, Q3 gaming chip",
                    highlights: "Rất hợp khách ưu tiên game nặng, FPS ổn định, màn 2K 144Hz và pin lớn")),
            new DemoProductSeed(
                "IQOO", "Neo 10 Series", "iQOO Neo 10",
                "Máy gaming cận cao cấp có hiệu năng tốt và sạc nhanh trong tầm giá.",
                "DEMO-IQNEO10-256-NEW", 13_990_000, 12_490_000, 3,
                Specs("6.78 inch AMOLED 144Hz", "Snapdragon 8 Gen 3", "12GB", "256GB", "50MP OIS + 8MP", "16MP", "6100mAh", "Sạc nhanh 120W", "Android",
                    cameraTechnology: "OIS",
                    video: "4K",
                    gpu: "Adreno 750",
                    highlights: "Tập trung gaming: Snapdragon 8 Gen 3, màn 144Hz, pin 6100mAh và sạc 120W")),
            new DemoProductSeed(
                "Honor", "Magic 7 Series", "Honor Magic7 Pro",
                "Flagship camera đa dụng, màn hình sáng và pin dung lượng cao.",
                "DEMO-HM7P-512-NEW", 28_990_000, 26_990_000, 2,
                Specs("6.8 inch LTPO OLED 120Hz", "Snapdragon 8 Elite", "16GB", "512GB", "50MP OIS + 50MP + 200MP telephoto", "50MP", "5850mAh", "Sạc nhanh 100W", "Android",
                    cameraTechnology: "telephoto zoom, OIS, chân dung AI",
                    video: "4K HDR",
                    gpu: "Adreno thế hệ mới",
                    highlights: "Flagship đa dụng: chip mạnh, camera zoom và pin lớn")),
            new DemoProductSeed(
                "Honor", "Honor 400 Series", "Honor 400 Pro",
                "Điện thoại cận cao cấp tập trung camera, pin và thiết kế mỏng.",
                "DEMO-H400P-512-NEW", 18_490_000, 16_990_000, 2,
                Specs("6.7 inch AMOLED 120Hz", "Snapdragon 8 Gen 3", "12GB", "512GB", "200MP OIS + 50MP + 12MP", "50MP", "6000mAh", "Sạc nhanh 100W", "Android",
                    cameraTechnology: "OIS, AI portrait, camera trước 50MP",
                    video: "4K",
                    gpu: "Adreno 750",
                    highlights: "Cận cao cấp có chip mạnh, pin lớn và camera trước tốt")),
            new DemoProductSeed(
                "OnePlus", "OnePlus 13 Series", "OnePlus 13",
                "Flagship hiệu năng mạnh, màn hình đẹp, pin lớn và sạc nhanh.",
                "DEMO-OP13-512-NEW", 24_990_000, 22_990_000, 3,
                Specs("6.82 inch LTPO AMOLED 120Hz", "Snapdragon 8 Elite", "16GB", "512GB", "50MP OIS + 50MP + 50MP", "32MP", "6000mAh", "Sạc nhanh 100W", "Android",
                    cameraTechnology: "Hasselblad tuning, OIS, telephoto",
                    video: "4K HDR",
                    gpu: "Adreno thế hệ mới",
                    highlights: "Flagship cân bằng giữa hiệu năng, pin, màn hình và camera Hasselblad")),
            new DemoProductSeed(
                "OnePlus", "OnePlus 15 Series", "OnePlus 15",
                "Flagship cân bằng giữa hiệu năng Snapdragon mới, pin rất lớn, màn đẹp và camera tốt.",
                "DEMO-OP15-512-NEW", 28_990_000, 26_990_000, 3,
                Specs("6.82 inch LTPO AMOLED 165Hz", "Snapdragon 8 Elite Gen 5", "16GB", "512GB", "50MP OIS + 50MP ultrawide + 50MP telephoto", "32MP", "7300mAh", "Sạc nhanh 100W", "Android",
                    cameraTechnology: "DetailMax Engine, OIS, telephoto, AI image processing",
                    video: "4K HDR, chống rung",
                    gpu: "Adreno 840",
                    highlights: "Máy cân bằng cho chơi game, pin lâu và camera tốt, dễ tư vấn hơn gaming phone thuần")),
            new DemoProductSeed(
                "OnePlus", "OnePlus 12", "OnePlus 12",
                "Flagship cân bằng hiệu năng, camera Hasselblad và sạc nhanh.",
                "DEMO-OP12-256-NEW", 20_990_000, 18_490_000, 2,
                Specs("6.82 inch LTPO AMOLED 120Hz", "Snapdragon 8 Gen 3", "12GB", "256GB", "50MP OIS + 64MP + 48MP", "32MP", "5400mAh", "Sạc nhanh 100W", "Android",
                    cameraTechnology: "Hasselblad Color Calibration, Sony LYT-808, periscope telephoto OIS",
                    video: "4K HDR, Dolby Vision",
                    gpu: "Adreno 750",
                    highlights: "Cân bằng hiệu năng Snapdragon 8 Gen 3, camera Hasselblad và sạc nhanh")),
            new DemoProductSeed(
                "OPPO", "Find X8 Series", "OPPO Find X8 Pro",
                "Flagship camera Hasselblad, zoom tốt, pin lớn và thiết kế cao cấp.",
                "DEMO-FX8P-512-NEW", 29_990_000, 27_490_000, 2,
                Specs("6.78 inch LTPO AMOLED 120Hz", "MediaTek Dimensity 9400", "16GB", "512GB", "50MP OIS + 50MP + 50MP + 50MP", "32MP", "5910mAh", "Sạc nhanh 80W", "Android",
                    cameraTechnology: "Hasselblad, periscope zoom, OIS",
                    video: "4K HDR",
                    gpu: "Immortalis-G925",
                    highlights: "Flagship OPPO thiên camera, zoom và pin lớn")),
            new DemoProductSeed(
                "OPPO", "Find X9 Series", "OPPO Find X9 Ultra",
                "Flagship camera OPPO cao cấp, rất mạnh về telephoto, macro, màu Hasselblad và cảm biến lớn.",
                "DEMO-FX9U-512-NEW", 39_990_000, 37_490_000, 2,
                Specs("6.82 inch LTPO AMOLED 120Hz", "Snapdragon 8 Elite Gen 5", "16GB", "512GB", "200MP OIS main + 50MP ultrawide + 200MP telephoto 3x + 50MP telephoto 10x", "32MP", "6000mAh", "Sạc nhanh 100W, sạc không dây", "Android",
                    cameraTechnology: "Hasselblad tuning, 10x optical telephoto, periscope zoom, macro telephoto, OIS, Master Mode",
                    video: "4K HDR, chống rung, chế độ Master",
                    gpu: "Adreno 840",
                    highlights: "Ưu tiên hàng đầu cho khách hỏi zoom xa, concert, macro và ảnh tự nhiên")),
            new DemoProductSeed(
                "OPPO", "Reno Series", "OPPO Reno13 5G",
                "Điện thoại tầm trung có thiết kế đẹp, camera chân dung và pin tốt.",
                "DEMO-RENO13-256-NEW", 15_990_000, 14_490_000, 3,
                Specs("6.59 inch AMOLED 120Hz", "MediaTek Dimensity 8350", "12GB", "256GB", "50MP OIS + 8MP + 2MP", "50MP", "5600mAh", "Sạc nhanh 80W", "Android",
                    cameraTechnology: "AI portrait, OIS, camera trước 50MP",
                    video: "4K",
                    gpu: "Mali-G615",
                    highlights: "Tầm trung thiết kế đẹp, selfie tốt và pin ổn")),
            new DemoProductSeed(
                "REDMAGIC", "RedMagic 11 Series", "REDMAGIC 11 Pro",
                "Gaming phone thuần hiệu năng với Snapdragon mới, tản nhiệt chủ động, pin rất lớn và màn 144Hz.",
                "DEMO-RM11P-512-NEW", 23_990_000, 21_990_000, 3,
                Specs("6.85 inch AMOLED 144Hz", "Snapdragon 8 Elite Gen 5", "16GB", "512GB", "50MP + 50MP + 2MP", "16MP under-display", "7500mAh", "Sạc nhanh 80W", "Android",
                    cameraTechnology: "Camera đủ dùng, không phải trọng tâm; ưu tiên hiệu năng và tản nhiệt",
                    video: "4K",
                    gpu: "Adreno 840, active fan, liquid cooling, shoulder triggers",
                    highlights: "Ưu tiên game nặng, pin trâu, tản nhiệt chủ động và giá/hiệu năng; camera chỉ ở mức đủ dùng")),
            new DemoProductSeed(
                "ASUS ROG", "ROG Phone", "ASUS ROG Phone 9 Pro",
                "Gaming flagship cao cấp với màn nhanh, loa tốt, phụ kiện tản nhiệt và tối ưu game sâu.",
                "DEMO-ROG9P-512-NEW", 29_990_000, 27_990_000, 2,
                Specs("6.78 inch LTPO AMOLED 185Hz", "Snapdragon 8 Elite", "16GB", "512GB", "50MP gimbal OIS + 32MP telephoto + 13MP ultrawide", "32MP", "5800mAh", "Sạc nhanh 65W", "Android",
                    cameraTechnology: "Gimbal OIS, camera đa dụng hơn nhiều gaming phone thuần",
                    video: "8K, 4K chống rung",
                    gpu: "Adreno 830, AeroActive Cooler support, AirTriggers",
                    highlights: "Hợp khách muốn máy gaming cao cấp nhưng vẫn cần camera và trải nghiệm dùng hằng ngày tốt")),
            new DemoProductSeed(
                "Sony", "Xperia 1 Series", "Sony Xperia 1 VII",
                "Flagship Sony dành cho người thích chỉnh tay, màu tự nhiên và trải nghiệm gần máy ảnh Alpha.",
                "DEMO-XPERIA1VII-512-NEW", 34_990_000, 32_990_000, 1,
                Specs("6.5 inch LTPO OLED 120Hz", "Snapdragon 8 Elite", "12GB", "512GB", "48MP Exmor T OIS + 12MP ultrawide + 12MP variable telephoto", "12MP", "5000mAh", "USB-C, sạc nhanh, sạc không dây", "Android",
                    cameraTechnology: "Sony Exmor T, ZEISS optics, Eye AF, Photography Pro, variable telephoto",
                    video: "4K 120fps, S-Cinetone, chống rung",
                    gpu: "Adreno 830",
                    highlights: "Hợp người biết chỉnh tay, thích màu tự nhiên và quay/chụp kiểu máy ảnh")),
            new DemoProductSeed(
                "Huawei", "Pura Ultra", "Huawei Pura 80 Ultra",
                "Flagship camera XMAGE với cảm biến lớn và telephoto mạnh, phù hợp khách ưu tiên ảnh hơn hệ sinh thái Google.",
                "DEMO-PURA80U-512-NEW", 38_990_000, 36_990_000, 1,
                Specs("6.8 inch LTPO OLED 120Hz", "Kirin flagship", "16GB", "512GB", "50MP XMAGE variable aperture + ultrawide + dual telephoto", "13MP", "5700mAh", "Sạc nhanh 100W, sạc không dây", "HarmonyOS",
                    cameraTechnology: "XMAGE, variable aperture, large sensor, telephoto macro, OIS",
                    video: "4K HDR, chống rung",
                    gpu: "Maleoon GPU",
                    highlights: "Camera rất mạnh nhưng cần tư vấn kỹ vì hệ sinh thái Google có thể hạn chế"))
        };
        demoProducts.AddRange(CreateAdditionalDemoVariants(demoProducts.ToList()));

        var phoneCategory = await context.Categories
            .OrderBy(category => category.Categoryid)
            .FirstOrDefaultAsync(category => category.Categoryid == 1)
            ?? await context.Categories.OrderBy(category => category.Categoryid).FirstAsync();
        var brands = await context.Brands.ToListAsync();
        var series = await context.Productseries.ToListAsync();
        var products = await context.Products
            .Include(product => product.Productvariants)
            .ToListAsync();
        var demoSkus = demoProducts.Select(seed => seed.Sku).ToList();
        var variantsBySku = await context.Productvariants
            .Where(variant => variant.Sku != null && demoSkus.Contains(variant.Sku))
            .ToDictionaryAsync(variant => variant.Sku!, StringComparer.OrdinalIgnoreCase);

        foreach (var seed in demoProducts)
        {
            var brand = brands.FirstOrDefault(item =>
                item.Brandname.Equals(seed.Brand, StringComparison.OrdinalIgnoreCase));
            var productSeries = brand == null
                ? null
                : series.FirstOrDefault(item =>
                    item.Brandid == brand.Brandid &&
                    item.Seriesname.Equals(seed.Series, StringComparison.OrdinalIgnoreCase));
            if (brand == null || productSeries == null)
                continue;

            var product = products.FirstOrDefault(item =>
                item.Productname.Equals(seed.Name, StringComparison.OrdinalIgnoreCase));
            var variantExists = variantsBySku.TryGetValue(seed.Sku, out var variant);
            if (product == null)
            {
                product = new Product
                {
                    Categoryid = phoneCategory.Categoryid,
                    Brandid = brand.Brandid,
                    Seriesid = productSeries.Seriesid,
                    Productname = seed.Name,
                    Description = seed.Description,
                    Createdat = DateTime.Now
                };
                context.Products.Add(product);
                products.Add(product);
                await context.SaveChangesAsync();
            }
            else
            {
                product.Categoryid = phoneCategory.Categoryid;
                product.Brandid = brand.Brandid;
                product.Seriesid = productSeries.Seriesid;
                product.Description = seed.Description;
            }

            if (!variantExists)
            {
                variant = new Productvariant
                {
                    Productid = product.Productid,
                    Sku = seed.Sku,
                    Condition = "New Seal"
                };
                context.Productvariants.Add(variant);
                variantsBySku[seed.Sku] = variant;
            }

            variant!.Productid = product.Productid;
            variant.Baseprice = seed.BasePrice;
            variant.Saleprice = seed.SalePrice;
            variant.Specifications = seed.Specifications;
        }

        await context.SaveChangesAsync();

        var demoVariantIds = variantsBySku.Values
            .Select(variant => variant.Variantid)
            .ToList();
        var existingDemoImages = await context.Productimages
            .Where(image =>
                image.Variantid.HasValue &&
                demoVariantIds.Contains(image.Variantid.Value) &&
                image.Imageurl.Contains("/demo-"))
            .ToListAsync();
        var variantsWithImages = (await context.Productimages
                .Where(image =>
                    image.Variantid.HasValue &&
                    demoVariantIds.Contains(image.Variantid.Value))
                .Select(image => image.Variantid!.Value)
                .ToListAsync())
            .ToHashSet();
        foreach (var seed in demoProducts)
        {
            if (!variantsBySku.TryGetValue(seed.Sku, out var variant))
                continue;

            var expectedUrl =
                $"http://localhost:5240/uploads/products/demo-{GetBrandImageSlug(seed.Brand)}.svg";
            var existingDemoImage = existingDemoImages.FirstOrDefault(image =>
                image.Variantid == variant.Variantid);
            if (existingDemoImage != null)
            {
                existingDemoImage.Imageurl = expectedUrl;
                existingDemoImage.Ismain = true;
            }
            else if (variantsWithImages.Add(variant.Variantid))
            {
                context.Productimages.Add(new Productimage
                {
                    Variantid = variant.Variantid,
                    Imageurl = expectedUrl,
                    Ismain = true
                });
            }
        }

        var expectedDemoImeis = demoProducts
            .SelectMany(seed => Enumerable.Range(1, seed.Stock)
                .Select(index => $"{seed.Sku}-{index:00}"))
            .ToList();
        var existingDemoImeis = (await context.Inventoryitems
            .Where(item => expectedDemoImeis.Contains(item.Imei))
            .Select(item => item.Imei)
            .ToListAsync())
            .ToHashSet(StringComparer.OrdinalIgnoreCase);
        foreach (var seed in demoProducts)
        {
            if (!variantsBySku.TryGetValue(seed.Sku, out var variant))
                continue;

            for (var index = 1; index <= seed.Stock; index++)
            {
                var imei = $"{seed.Sku}-{index:00}";
                if (existingDemoImeis.Add(imei))
                {
                    context.Inventoryitems.Add(new Inventoryitem
                    {
                        Imei = imei,
                        Variantid = variant.Variantid,
                        Status = "InStock",
                        Importedat = DateTime.Now
                    });
                }
            }
        }

        await context.SaveChangesAsync();
    }

    private static IEnumerable<DemoProductSeed> CreateAdditionalDemoVariants(
        IEnumerable<DemoProductSeed> baseSeeds)
    {
        foreach (var seed in baseSeeds)
        {
            var specs = JsonSerializer.Deserialize<Dictionary<string, string>>(
                seed.Specifications) ?? new Dictionary<string, string>();
            var baseStorage = specs.GetValueOrDefault("Bộ nhớ trong", "256GB");
            var baseRam = specs.GetValueOrDefault("Dung lượng RAM", "12GB");
            var variants = baseStorage.Contains("512", StringComparison.OrdinalIgnoreCase)
                ? new[]
                {
                    ("256GB", baseRam, -2_000_000m, -1_500_000m, 2),
                    ("1TB", IncreaseRam(baseRam), 4_000_000m, 3_000_000m, 1)
                }
                : new[]
                {
                    ("512GB", IncreaseRam(baseRam), 2_000_000m, 1_500_000m, 2)
                };

            foreach (var (storage, ram, baseDelta, saleDelta, stock) in variants)
            {
                yield return seed with
                {
                    Sku = $"{seed.Sku}-{StorageCode(storage)}",
                    BasePrice = Math.Max(1_000_000m, seed.BasePrice + baseDelta),
                    SalePrice = seed.SalePrice.HasValue
                        ? Math.Max(1_000_000m, seed.SalePrice.Value + saleDelta)
                        : null,
                    Stock = stock,
                    Specifications = UpdateDemoVariantSpecs(
                        seed.Specifications,
                        ram,
                        storage)
                };
            }
        }
    }

    private static string IncreaseRam(string currentRam)
    {
        var normalized = currentRam.ToUpperInvariant();
        if (normalized.Contains("16GB"))
            return "24GB";
        if (normalized.Contains("12GB"))
            return "16GB";
        if (normalized.Contains("8GB"))
            return "12GB";
        return currentRam;
    }

    private static string StorageCode(string storage) =>
        storage.Replace(" ", string.Empty, StringComparison.OrdinalIgnoreCase)
            .Replace("GB", "G", StringComparison.OrdinalIgnoreCase)
            .Replace("TB", "T", StringComparison.OrdinalIgnoreCase)
            .ToUpperInvariant();

    private static string UpdateDemoVariantSpecs(
        string specifications,
        string ram,
        string storage)
    {
        var specs = JsonSerializer.Deserialize<Dictionary<string, string>>(
            specifications) ?? new Dictionary<string, string>();
        specs["Dung lượng RAM"] = ram;
        specs["Bộ nhớ trong"] = storage;
        if (specs.TryGetValue("Điểm nổi bật tư vấn", out var highlights))
        {
            specs["Điểm nổi bật tư vấn"] =
                $"{highlights}; cấu hình {ram}/{storage} phù hợp để demo chọn biến thể theo nhu cầu.";
        }

        return JsonSerializer.Serialize(specs);
    }

    private static string GetBrandImageSlug(string brand) =>
        brand.ToLowerInvariant() switch
        {
            "google pixel" => "google-pixel",
            "iphone" => "iphone",
            "samsung" => "samsung",
            "xiaomi" => "xiaomi",
            "vivo" => "vivo",
            "iqoo" => "iqoo",
            "honor" => "honor",
            "oneplus" => "oneplus",
            "oppo" => "oppo",
            "sony" => "sony",
            "huawei" => "huawei",
            "asus rog" => "asus-rog",
            "redmagic" => "redmagic",
            _ => "phone"
        };

    private static string Specs(
        string screen,
        string chipset,
        string ram,
        string storage,
        string rearCamera,
        string frontCamera,
        string battery,
        string charging,
        string operatingSystem,
        string? cameraTechnology = null,
        string? video = null,
        string? gpu = null,
        string? highlights = null)
    {
        var specs = new Dictionary<string, string>
        {
            ["Kích thước màn hình"] = screen,
            ["Chipset"] = chipset,
            ["Dung lượng RAM"] = ram,
            ["Bộ nhớ trong"] = storage,
            ["Camera sau"] = rearCamera,
            ["Camera trước"] = frontCamera,
            ["Pin"] = battery,
            ["Công nghệ sạc"] = charging,
            ["Hệ điều hành"] = operatingSystem
        };

        if (!string.IsNullOrWhiteSpace(cameraTechnology))
            specs["Công nghệ camera"] = cameraTechnology;
        if (!string.IsNullOrWhiteSpace(video))
            specs["Quay video sau"] = video;
        if (!string.IsNullOrWhiteSpace(gpu))
            specs["GPU"] = gpu;
        if (!string.IsNullOrWhiteSpace(highlights))
            specs["Điểm nổi bật tư vấn"] = highlights;

        return JsonSerializer.Serialize(specs);
    }

    private sealed record DemoProductSeed(
        string Brand,
        string Series,
        string Name,
        string Description,
        string Sku,
        decimal BasePrice,
        decimal? SalePrice,
        int Stock,
        string Specifications);

    private sealed record DemoUserSeed(
        int Roleid,
        string Username,
        string Password,
        string Fullname,
        string Phone);
}


