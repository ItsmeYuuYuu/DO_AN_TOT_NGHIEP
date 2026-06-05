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
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Database connection failed. Seed skipped.");
            return;
        }

        // ── 1. ROLES ──────────────────────────────────────────────────────────
        if (!context.Roles.Any())
        {
            context.Roles.AddRange(
                new Role { Roleid = 1, Rolename = "Admin" },
                new Role { Roleid = 2, Rolename = "Staff" },
                new Role { Roleid = 3, Rolename = "Customer" }
            );
            await context.SaveChangesAsync();
        }

        // ── 2. ADMIN USER (email @gmail.com + BCrypt hash) ───────────────────
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

        // Staff user
        var staffUser = await context.Users.FirstOrDefaultAsync(u => u.Username == "staff01@gmail.com");
        if (staffUser == null)
        {
            string staffRaw = "Staff@123456!";
            staffUser = new User
            {
                Roleid = 2,
                Username = "staff01@gmail.com",
                Passwordhash = BCrypt.Net.BCrypt.HashPassword(staffRaw),
                Fullname = "Nhân viên kho",
                Email = "staff01@gmail.com",
                Phone = "0911111111",
                Createdat = DateTime.Now,
                Isactive = true,
            };
            context.Users.Add(staffUser);
        }
        else
        {
            staffUser.Passwordhash = BCrypt.Net.BCrypt.HashPassword("Staff@123456!");
        }

        await context.SaveChangesAsync();

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

        // ── 5. PRODUCTS & VARIANTS ───────────────────────────────────────────
        if (!context.Products.Any())
        {
            var products = new[]
            {
                new Product { Productid = 101, Categoryid = 1, Brandid = 1, Productname = "Google Pixel 8 Pro", Description = "Điện thoại Google Pixel cao cấp nhất với chip Tensor G3 và camera AI.", Createdat = DateTime.UtcNow },
                new Product { Productid = 102, Categoryid = 1, Brandid = 2, Productname = "iPhone 15 Pro Max", Description = "Khung Titan, chip A17 Pro, cổng USB-C tiện lợi.", Createdat = DateTime.UtcNow },
                new Product { Productid = 103, Categoryid = 1, Brandid = 3, Productname = "Samsung Galaxy S24 Ultra", Description = "Thiết kế phẳng, khung Titan chắc chắn, tích hợp các tính năng Galaxy AI.", Createdat = DateTime.UtcNow }
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

        // ── 8. ORDERS ────────────────────────────────────────────────────────
        if (!context.Orders.Any())
        {
            context.Orders.AddRange(
                new Order { Orderid = 1, Customerid = 1, Orderdate = DateTime.UtcNow.AddDays(-5), Totalamount = 32490000, Discountamount = 0, Finalamount = 32490000, Paymentmethod = "VNPay", Orderstatus = "Completed" }
            );
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
    }
}
