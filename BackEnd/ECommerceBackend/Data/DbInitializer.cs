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
        if (!context.Users.Any(u => u.Username == "admin300475@gmail.com"))
        {
            // Password: Admin@300475! — BCrypt hashed
            string adminRaw = "Admin@300475!";
            context.Users.Add(new User
            {
                Roleid = 1,
                Username = "admin300475@gmail.com",
                Passwordhash = BCrypt.Net.BCrypt.HashPassword(adminRaw),
                Fullname = "Quản trị viên hệ thống",
                Email = "admin300475@gmail.com",
                Phone = "0900000000",
                Createdat = DateTime.Now,
                Isactive = true,
            });
        }

        // Staff user
        if (!context.Users.Any(u => u.Username == "staff01@gmail.com"))
        {
            string staffRaw = "Staff@123456!";
            context.Users.Add(new User
            {
                Roleid = 2,
                Username = "staff01@gmail.com",
                Passwordhash = BCrypt.Net.BCrypt.HashPassword(staffRaw),
                Fullname = "Nhân viên kho",
                Email = "staff01@gmail.com",
                Phone = "0911111111",
                Createdat = DateTime.Now,
                Isactive = true,
            });
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
                new Brand { Brandid = 1, Brandname = "Apple" },
                new Brand { Brandid = 2, Brandname = "Samsung" },
                new Brand { Brandid = 3, Brandname = "ASUS" },
                new Brand { Brandid = 4, Brandname = "Dell" },
                new Brand { Brandid = 5, Brandname = "Sony" },
                new Brand { Brandid = 6, Brandname = "Xiaomi" },
                new Brand { Brandid = 7, Brandname = "Lenovo" },
                new Brand { Brandid = 8, Brandname = "HP" }
            );
            await context.SaveChangesAsync();
        }

        // ── 5. PRODUCT CONDITIONS ────────────────────────────────────────────
        if (!context.Productconditions.Any())
        {
            context.Productconditions.AddRange(
                new Productcondition { Conditionid = 1, Conditionname = "Mới 100%", Description = "Hàng chính hãng nguyên seal" },
                new Productcondition { Conditionid = 2, Conditionname = "Like New (99%)", Description = "Đã qua sử dụng, tình trạng gần như mới" },
                new Productcondition { Conditionid = 3, Conditionname = "Cũ đẹp (95%)", Description = "Đã dùng, còn đẹp, không trầy xước đáng kể" }
            );
            await context.SaveChangesAsync();
        }

        // ── 6. PRODUCTS & VARIANTS ───────────────────────────────────────────
        if (!context.Products.Any())
        {
            var products = new[]
            {
                new Product { Productid = 1,  Categoryid = 1, Brandid = 1, Productname = "iPhone 15 Pro Max 256GB", Description = "Siêu phẩm iPhone 2024 với chip A17 Pro, màn hình 6.7 inch Super Retina XDR, camera 48MP.", Createdat = DateTime.Now },
                new Product { Productid = 2,  Categoryid = 1, Brandid = 1, Productname = "iPhone 15 128GB", Description = "iPhone 15 tiêu chuẩn với chip A16 Bionic, camera Dynamic Island và cổng USB-C.", Createdat = DateTime.Now },
                new Product { Productid = 3,  Categoryid = 1, Brandid = 1, Productname = "iPhone 14 Pro 256GB", Description = "iPhone 14 Pro với tính năng Dynamic Island, Always-On Display và camera 48MP.", Createdat = DateTime.Now },
                new Product { Productid = 4,  Categoryid = 1, Brandid = 2, Productname = "Samsung Galaxy S24 Ultra 512GB", Description = "Flagship Samsung 2024 với S Pen tích hợp, chip Snapdragon 8 Gen 3, camera 200MP.", Createdat = DateTime.Now },
                new Product { Productid = 5,  Categoryid = 1, Brandid = 2, Productname = "Samsung Galaxy Z Fold 5", Description = "Điện thoại gập cao cấp nhất của Samsung với màn hình trong 7.6 inch.", Createdat = DateTime.Now },
                new Product { Productid = 6,  Categoryid = 2, Brandid = 1, Productname = "MacBook Pro 14 M3 Pro", Description = "MacBook Pro 14 inch chip M3 Pro, màn hình Liquid Retina XDR, pin 18 giờ.", Createdat = DateTime.Now },
                new Product { Productid = 7,  Categoryid = 2, Brandid = 3, Productname = "ASUS ROG Strix G16 RTX 4070", Description = "Laptop gaming mạnh mẽ với RTX 4070, màn hình 165Hz, tản nhiệt Tri-Fan.", Createdat = DateTime.Now },
                new Product { Productid = 8,  Categoryid = 2, Brandid = 4, Productname = "Dell XPS 15 OLED 2024", Description = "Dell XPS 15 với màn hình OLED 3.5K, Intel Core Ultra 7, thiết kế premium.", Createdat = DateTime.Now },
                new Product { Productid = 9,  Categoryid = 3, Brandid = 1, Productname = "iPad Pro M4 11 inch", Description = "iPad Pro thế hệ mới nhất với chip M4, màn hình OLED Ultra Retina XDR siêu mỏng.", Createdat = DateTime.Now },
                new Product { Productid = 10, Categoryid = 3, Brandid = 2, Productname = "Samsung Galaxy Tab S9 Ultra", Description = "Máy tính bảng Android cao cấp, màn hình AMOLED 14.6 inch, S Pen đi kèm.", Createdat = DateTime.Now },
                new Product { Productid = 11, Categoryid = 4, Brandid = 1, Productname = "AirPods Pro 2 (USB-C)", Description = "Tai nghe AirPods Pro thế hệ 2, chống ồn chủ động H2, âm thanh Lossless.", Createdat = DateTime.Now },
                new Product { Productid = 12, Categoryid = 4, Brandid = 5, Productname = "Sony WH-1000XM5", Description = "Tai nghe chụp tai flagship Sony, chống ồn tốt nhất thị trường, pin 30 giờ.", Createdat = DateTime.Now },
                new Product { Productid = 13, Categoryid = 5, Brandid = 1, Productname = "Apple Watch Series 9 GPS 45mm", Description = "Đồng hồ thông minh Apple Watch Series 9, chip S9, Double Tap gesture.", Createdat = DateTime.Now },
                new Product { Productid = 14, Categoryid = 5, Brandid = 2, Productname = "Samsung Galaxy Watch 6 Classic 47mm", Description = "Galaxy Watch 6 Classic với bezel xoay, theo dõi sức khỏe toàn diện.", Createdat = DateTime.Now },
            };
            context.Products.AddRange(products);
            await context.SaveChangesAsync();

            var variants = new[]
            {
                new Productvariant { Variantid = 1,  Productid = 1,  Conditionid = 1, Sku = "IPH15PM-256-NAT", Baseprice = 34_990_000, Saleprice = 32_490_000 },
                new Productvariant { Variantid = 2,  Productid = 1,  Conditionid = 1, Sku = "IPH15PM-256-BLK", Baseprice = 34_990_000, Saleprice = 32_490_000 },
                new Productvariant { Variantid = 3,  Productid = 2,  Conditionid = 1, Sku = "IPH15-128-BLK",   Baseprice = 22_990_000, Saleprice = 21_490_000 },
                new Productvariant { Variantid = 4,  Productid = 3,  Conditionid = 1, Sku = "IPH14PRO-256-BLK",Baseprice = 28_990_000, Saleprice = 24_990_000 },
                new Productvariant { Variantid = 5,  Productid = 4,  Conditionid = 1, Sku = "SGSUS24U-512-BLK",Baseprice = 36_990_000, Saleprice = 33_990_000 },
                new Productvariant { Variantid = 6,  Productid = 5,  Conditionid = 1, Sku = "SGZF5-256-BLK",   Baseprice = 42_990_000, Saleprice = 39_990_000 },
                new Productvariant { Variantid = 7,  Productid = 6,  Conditionid = 1, Sku = "MBP14-M3PRO-18",  Baseprice = 52_990_000, Saleprice = 49_990_000 },
                new Productvariant { Variantid = 8,  Productid = 7,  Conditionid = 1, Sku = "ROG-G16-RTX4070",  Baseprice = 45_990_000, Saleprice = 42_990_000 },
                new Productvariant { Variantid = 9,  Productid = 8,  Conditionid = 1, Sku = "DELL-XPS15-OLED",  Baseprice = 55_990_000, Saleprice = null },
                new Productvariant { Variantid = 10, Productid = 9,  Conditionid = 1, Sku = "IPADPROM4-11-256",  Baseprice = 28_990_000, Saleprice = 27_490_000 },
                new Productvariant { Variantid = 11, Productid = 10, Conditionid = 1, Sku = "TABS9U-512-GRY",    Baseprice = 32_990_000, Saleprice = 29_990_000 },
                new Productvariant { Variantid = 12, Productid = 11, Conditionid = 1, Sku = "APP2-USBC",         Baseprice = 6_990_000, Saleprice = 5_990_000 },
                new Productvariant { Variantid = 13, Productid = 12, Conditionid = 1, Sku = "SONY-XM5-BLK",     Baseprice = 8_490_000, Saleprice = 7_490_000 },
                new Productvariant { Variantid = 14, Productid = 13, Conditionid = 1, Sku = "AW9-GPS-45-MID",    Baseprice = 12_490_000, Saleprice = 11_490_000 },
                new Productvariant { Variantid = 15, Productid = 14, Conditionid = 1, Sku = "GW6C-47-SLV",       Baseprice = 10_490_000, Saleprice = 9_490_000 },
            };
            context.Productvariants.AddRange(variants);
            await context.SaveChangesAsync();
        }

        // ── 7. CUSTOMERS ─────────────────────────────────────────────────────
        if (!context.Customers.Any())
        {
            context.Customers.AddRange(
                new Customer { Customerid = 1, Fullname = "Nguyễn Văn An", Email = "an.nguyen@gmail.com", Phone = "0901234567", Address = "12 Nguyễn Huệ, Q1, TP.HCM", Createdat = DateTime.Now.AddDays(-60) },
                new Customer { Customerid = 2, Fullname = "Trần Thị Bích", Email = "bich.tran@gmail.com", Phone = "0912345678", Address = "45 Lê Lợi, Q3, TP.HCM", Createdat = DateTime.Now.AddDays(-45) },
                new Customer { Customerid = 3, Fullname = "Lê Minh Cường", Email = "cuong.le@gmail.com", Phone = "0923456789", Address = "78 Trần Hưng Đạo, Hoàn Kiếm, Hà Nội", Createdat = DateTime.Now.AddDays(-30) },
                new Customer { Customerid = 4, Fullname = "Phạm Thu Hà", Email = "ha.pham@gmail.com", Phone = "0934567890", Address = "90 Lý Tự Trọng, Q1, TP.HCM", Createdat = DateTime.Now.AddDays(-20) },
                new Customer { Customerid = 5, Fullname = "Hoàng Đức Nam", Email = "nam.hoang@gmail.com", Phone = "0945678901", Address = "34 Đinh Tiên Hoàng, Đống Đa, Hà Nội", Createdat = DateTime.Now.AddDays(-10) }
            );
            await context.SaveChangesAsync();
        }

        // ── 8. ORDERS ────────────────────────────────────────────────────────
        if (!context.Orders.Any())
        {
            context.Orders.AddRange(
                new Order { Orderid = 1, Customerid = 1, Orderdate = DateTime.Now.AddDays(-5),  Totalamount = 32_490_000, Discountamount = 0, Finalamount = 32_490_000, Paymentmethod = "VNPay", Orderstatus = "Completed" },
                new Order { Orderid = 2, Customerid = 2, Orderdate = DateTime.Now.AddDays(-3),  Totalamount = 49_990_000, Discountamount = 2_000_000, Finalamount = 47_990_000, Paymentmethod = "COD", Orderstatus = "Shipped" },
                new Order { Orderid = 3, Customerid = 3, Orderdate = DateTime.Now.AddDays(-2),  Totalamount = 5_990_000, Discountamount = 0, Finalamount = 5_990_000, Paymentmethod = "Momo", Orderstatus = "Processing" },
                new Order { Orderid = 4, Customerid = 4, Orderdate = DateTime.Now.AddDays(-1),  Totalamount = 7_490_000, Discountamount = 0, Finalamount = 7_490_000, Paymentmethod = "VNPay", Orderstatus = "Pending" },
                new Order { Orderid = 5, Customerid = 5, Orderdate = DateTime.Now,               Totalamount = 11_490_000, Discountamount = 500_000, Finalamount = 10_990_000, Paymentmethod = "COD", Orderstatus = "Pending" },
                new Order { Orderid = 6, Customerid = 1, Orderdate = DateTime.Now.AddDays(-15), Totalamount = 24_990_000, Discountamount = 0, Finalamount = 24_990_000, Paymentmethod = "VNPay", Orderstatus = "Completed" },
                new Order { Orderid = 7, Customerid = 2, Orderdate = DateTime.Now.AddDays(-10), Totalamount = 39_990_000, Discountamount = 0, Finalamount = 39_990_000, Paymentmethod = "Momo", Orderstatus = "Cancelled" }
            );
            await context.SaveChangesAsync();
        }

        // ── 9. BANNERS & SLIDERS ─────────────────────────────────────────────
        if (!context.Banners.Any())
        {
            context.Banners.AddRange(
                new Banner { Bannerid = 1, Imageurl = "https://placehold.co/1200x400/2563eb/white?text=iPhone+15+Pro+Max", Linkurl = "/products", Position = "hero", Isactive = true },
                new Banner { Bannerid = 2, Imageurl = "https://placehold.co/1200x400/dc2626/white?text=Flash+Sale+MacBook+Pro+M3", Linkurl = "/products", Position = "hero", Isactive = true }
            );
            await context.SaveChangesAsync();
        }

        if (!context.Sliders.Any())
        {
            context.Sliders.AddRange(
                new Slider { Sliderid = 1, Title = "iPhone 15 Pro Max - Titan tự nhiên", Imageurl = "https://placehold.co/1400x500/0f172a/00e5ff?text=iPhone+15+Pro+Max", Linkurl = "/products/1", Displayorder = 1, Isactive = true, Createdat = DateTime.Now },
                new Slider { Sliderid = 2, Title = "Samsung Galaxy S24 Ultra", Imageurl = "https://placehold.co/1400x500/1e3a5f/ffffff?text=Samsung+Galaxy+S24+Ultra", Linkurl = "/products/4", Displayorder = 2, Isactive = true, Createdat = DateTime.Now },
                new Slider { Sliderid = 3, Title = "MacBook Pro M3 Pro", Imageurl = "https://placehold.co/1400x500/374151/f9fafb?text=MacBook+Pro+M3+Pro", Linkurl = "/products/6", Displayorder = 3, Isactive = true, Createdat = DateTime.Now }
            );
            await context.SaveChangesAsync();
        }

        logger.LogInformation("✅ Seed data completed successfully.");
    }
}
