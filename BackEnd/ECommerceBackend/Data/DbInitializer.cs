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
                new Product { Productid = 101, Categoryid = 1, Brandid = 1, Productname = "Google Pixel 8 Pro", Description = "Điện thoại Google Pixel cao cấp nhất với chip Tensor G3 và camera AI.", Createdat = DateTime.Now },
                new Product { Productid = 102, Categoryid = 1, Brandid = 1, Productname = "Google Pixel 8", Description = "Google Pixel 8 nhỏ gọn, chip Tensor G3 mạnh mẽ.", Createdat = DateTime.Now },
                new Product { Productid = 103, Categoryid = 1, Brandid = 1, Productname = "Google Pixel 7a", Description = "Điện thoại Pixel tầm trung với camera xuất sắc.", Createdat = DateTime.Now },
                
                new Product { Productid = 201, Categoryid = 1, Brandid = 2, Productname = "vivo X100 Pro", Description = "Flagship camera kết hợp Zeiss.", Createdat = DateTime.Now },
                new Product { Productid = 202, Categoryid = 1, Brandid = 2, Productname = "vivo V29 5G", Description = "Chuyên gia chân dung với vòng sáng Aura.", Createdat = DateTime.Now },
                new Product { Productid = 203, Categoryid = 1, Brandid = 2, Productname = "vivo Y36", Description = "Thiết kế trẻ trung, sạc nhanh 44W.", Createdat = DateTime.Now },

                new Product { Productid = 301, Categoryid = 1, Brandid = 3, Productname = "iQOO 12 Pro", Description = "Siêu phẩm gaming với chip Snapdragon 8 Gen 3.", Createdat = DateTime.Now },
                new Product { Productid = 302, Categoryid = 1, Brandid = 3, Productname = "iQOO Neo 9", Description = "Hiệu năng đỉnh cao trong tầm giá.", Createdat = DateTime.Now },
                new Product { Productid = 303, Categoryid = 1, Brandid = 3, Productname = "iQOO Z8", Description = "Pin khủng, sạc siêu tốc 120W.", Createdat = DateTime.Now },

                new Product { Productid = 401, Categoryid = 1, Brandid = 4, Productname = "Honor Magic6 Pro", Description = "Flagship Honor với camera Falcon, pin silicon-carbon.", Createdat = DateTime.Now },
                new Product { Productid = 402, Categoryid = 1, Brandid = 4, Productname = "Honor 90", Description = "Màn hình bảo vệ mắt đỉnh cao, camera 200MP.", Createdat = DateTime.Now },
                new Product { Productid = 403, Categoryid = 1, Brandid = 4, Productname = "Honor X9b", Description = "Thiết kế siêu bền chống va đập.", Createdat = DateTime.Now },

                new Product { Productid = 501, Categoryid = 1, Brandid = 5, Productname = "OnePlus 12", Description = "Flagship Killer 2024, Snapdragon 8 Gen 3, Hasselblad.", Createdat = DateTime.Now },
                new Product { Productid = 502, Categoryid = 1, Brandid = 5, Productname = "OnePlus 12R", Description = "Hiệu năng mạnh mẽ với pin lớn.", Createdat = DateTime.Now },
                new Product { Productid = 503, Categoryid = 1, Brandid = 5, Productname = "OnePlus Nord 3", Description = "Tầm trung cực mạnh, sạc 80W.", Createdat = DateTime.Now },

                new Product { Productid = 601, Categoryid = 1, Brandid = 6, Productname = "OPPO Find N3", Description = "Điện thoại gập siêu mỏng nhẹ, camera Hasselblad.", Createdat = DateTime.Now },
                new Product { Productid = 602, Categoryid = 1, Brandid = 6, Productname = "OPPO Reno11 Pro", Description = "Thiết kế đẹp mắt, camera chân dung tele.", Createdat = DateTime.Now },
                new Product { Productid = 603, Categoryid = 1, Brandid = 6, Productname = "OPPO A98 5G", Description = "Màn hình 120Hz, pin bền bỉ.", Createdat = DateTime.Now },

                new Product { Productid = 701, Categoryid = 1, Brandid = 7, Productname = "Realme GT5 Pro", Description = "Flagship Realme Snapdragon 8 Gen 3, camera tele xịn.", Createdat = DateTime.Now },
                new Product { Productid = 702, Categoryid = 1, Brandid = 7, Productname = "Realme 11 Pro+", Description = "Màn hình cong đẹp, camera 200MP.", Createdat = DateTime.Now },
                new Product { Productid = 703, Categoryid = 1, Brandid = 7, Productname = "Realme C67", Description = "Smartphone quốc dân giá cực rẻ.", Createdat = DateTime.Now },

                new Product { Productid = 801, Categoryid = 1, Brandid = 8, Productname = "Xiaomi 14 Ultra", Description = "Quái thú nhiếp ảnh với cụm camera Leica.", Createdat = DateTime.Now },
                new Product { Productid = 802, Categoryid = 1, Brandid = 8, Productname = "Xiaomi 14", Description = "Flagship nhỏ gọn mạnh mẽ.", Createdat = DateTime.Now },
                new Product { Productid = 803, Categoryid = 1, Brandid = 8, Productname = "Redmi Note 13 Pro+", Description = "Siêu phẩm tầm trung có chống nước IP68.", Createdat = DateTime.Now },

                new Product { Productid = 901, Categoryid = 1, Brandid = 9, Productname = "Huawei Mate 60 Pro", Description = "Flagship Huawei có kết nối vệ tinh, thiết kế đẳng cấp.", Createdat = DateTime.Now },
                new Product { Productid = 902, Categoryid = 1, Brandid = 9, Productname = "Huawei P60 Pro", Description = "Ông vua nhiếp ảnh thiếu sáng.", Createdat = DateTime.Now },
                new Product { Productid = 903, Categoryid = 1, Brandid = 9, Productname = "Huawei Nova 11", Description = "Smartphone thời trang mỏng nhẹ.", Createdat = DateTime.Now },

                new Product { Productid = 1001, Categoryid = 1, Brandid = 10, Productname = "Meizu 21 Pro", Description = "Flagship Meizu cuối cùng, thiết kế vuông vức tinh tế.", Createdat = DateTime.Now },
                new Product { Productid = 1002, Categoryid = 1, Brandid = 10, Productname = "Meizu 21", Description = "Viền màn hình trắng siêu mỏng.", Createdat = DateTime.Now },
                new Product { Productid = 1003, Categoryid = 1, Brandid = 10, Productname = "Meizu 20 Infinity", Description = "Điện thoại viền siêu mỏng, mặt lưng kính đặc biệt.", Createdat = DateTime.Now },

                new Product { Productid = 1101, Categoryid = 1, Brandid = 11, Productname = "iPhone 15 Pro Max", Description = "Khung Titan, chip A17 Pro, cổng USB-C.", Createdat = DateTime.Now },
                new Product { Productid = 1102, Categoryid = 1, Brandid = 11, Productname = "iPhone 15", Description = "Dynamic Island cho dòng tiêu chuẩn.", Createdat = DateTime.Now },
                new Product { Productid = 1103, Categoryid = 1, Brandid = 11, Productname = "iPhone 13", Description = "Chiếc iPhone quốc dân với giá cực tốt.", Createdat = DateTime.Now },

                new Product { Productid = 1201, Categoryid = 1, Brandid = 12, Productname = "Samsung Galaxy S24 Ultra", Description = "Thiết kế phẳng, khung Titan, Galaxy AI.", Createdat = DateTime.Now },
                new Product { Productid = 1202, Categoryid = 1, Brandid = 12, Productname = "Samsung Galaxy Z Fold5", Description = "Điện thoại gập cỡ lớn tối ưu đa nhiệm.", Createdat = DateTime.Now },
                new Product { Productid = 1203, Categoryid = 1, Brandid = 12, Productname = "Samsung Galaxy A54 5G", Description = "Điện thoại tầm trung bán chạy nhất.", Createdat = DateTime.Now },

                new Product { Productid = 1301, Categoryid = 1, Brandid = 13, Productname = "Sony Xperia 1 V", Description = "Cảm biến Exmor T mới, màn hình 4K HDR.", Createdat = DateTime.Now },
                new Product { Productid = 1302, Categoryid = 1, Brandid = 13, Productname = "Sony Xperia 5 V", Description = "Điện thoại gọn nhẹ, hiệu năng cao.", Createdat = DateTime.Now },
                new Product { Productid = 1303, Categoryid = 1, Brandid = 13, Productname = "Sony Xperia 10 V", Description = "Pin khủng nhất trong phân khúc mỏng nhẹ.", Createdat = DateTime.Now },

                new Product { Productid = 1401, Categoryid = 1, Brandid = 14, Productname = "Nothing Phone (2)", Description = "Mặt lưng LED Glyph độc đáo, chip Snapdragon 8+ Gen 1.", Createdat = DateTime.Now },
                new Product { Productid = 1402, Categoryid = 1, Brandid = 14, Productname = "Nothing Phone (2a)", Description = "Thiết kế khác biệt cho phân khúc tầm trung.", Createdat = DateTime.Now },
                new Product { Productid = 1403, Categoryid = 1, Brandid = 14, Productname = "Nothing Phone (1)", Description = "Phiên bản tiên phong với mặt lưng trong suốt.", Createdat = DateTime.Now }
            };
            context.Products.AddRange(products);
            await context.SaveChangesAsync();

            var variants = new[]
            {
                new Productvariant { Variantid = 1011, Productid = 101, Conditionid = 1, Sku = "PIX8P-128", Baseprice = 24990000, Saleprice = 23990000 },
                new Productvariant { Variantid = 1012, Productid = 101, Conditionid = 1, Sku = "PIX8P-256", Baseprice = 26990000, Saleprice = null },
                new Productvariant { Variantid = 1021, Productid = 102, Conditionid = 1, Sku = "PIX8-128", Baseprice = 18990000, Saleprice = 17990000 },
                new Productvariant { Variantid = 1031, Productid = 103, Conditionid = 1, Sku = "PIX7A-128", Baseprice = 10990000, Saleprice = 9990000 },

                new Productvariant { Variantid = 2011, Productid = 201, Conditionid = 1, Sku = "VIV-X100P-256", Baseprice = 29990000, Saleprice = 28990000 },
                new Productvariant { Variantid = 2021, Productid = 202, Conditionid = 1, Sku = "VIV-V29-128", Baseprice = 11990000, Saleprice = 10990000 },
                new Productvariant { Variantid = 2031, Productid = 203, Conditionid = 1, Sku = "VIV-Y36-128", Baseprice = 6990000, Saleprice = 6490000 },

                new Productvariant { Variantid = 3011, Productid = 301, Conditionid = 1, Sku = "IQO-12P-256", Baseprice = 19990000, Saleprice = 18990000 },
                new Productvariant { Variantid = 3021, Productid = 302, Conditionid = 1, Sku = "IQO-N9-256", Baseprice = 12990000, Saleprice = 11990000 },
                new Productvariant { Variantid = 3031, Productid = 303, Conditionid = 1, Sku = "IQO-Z8-128", Baseprice = 7990000, Saleprice = null },

                new Productvariant { Variantid = 4011, Productid = 401, Conditionid = 1, Sku = "HON-M6P-256", Baseprice = 25990000, Saleprice = 24990000 },
                new Productvariant { Variantid = 4021, Productid = 402, Conditionid = 1, Sku = "HON-90-256", Baseprice = 10990000, Saleprice = 9990000 },
                new Productvariant { Variantid = 4031, Productid = 403, Conditionid = 1, Sku = "HON-X9B-256", Baseprice = 8990000, Saleprice = null },

                new Productvariant { Variantid = 5011, Productid = 501, Conditionid = 1, Sku = "ONE-12-256", Baseprice = 22990000, Saleprice = 21990000 },
                new Productvariant { Variantid = 5021, Productid = 502, Conditionid = 1, Sku = "ONE-12R-256", Baseprice = 15990000, Saleprice = 14990000 },
                new Productvariant { Variantid = 5031, Productid = 503, Conditionid = 1, Sku = "ONE-N3-128", Baseprice = 10990000, Saleprice = 9990000 },

                new Productvariant { Variantid = 6011, Productid = 601, Conditionid = 1, Sku = "OPP-FN3-512", Baseprice = 44990000, Saleprice = 42990000 },
                new Productvariant { Variantid = 6021, Productid = 602, Conditionid = 1, Sku = "OPP-R11P-256", Baseprice = 16990000, Saleprice = 15990000 },
                new Productvariant { Variantid = 6031, Productid = 603, Conditionid = 1, Sku = "OPP-A98-256", Baseprice = 8990000, Saleprice = 8490000 },

                new Productvariant { Variantid = 7011, Productid = 701, Conditionid = 1, Sku = "RME-GT5P-256", Baseprice = 16990000, Saleprice = 15990000 },
                new Productvariant { Variantid = 7021, Productid = 702, Conditionid = 1, Sku = "RME-11PP-256", Baseprice = 11990000, Saleprice = 10990000 },
                new Productvariant { Variantid = 7031, Productid = 703, Conditionid = 1, Sku = "RME-C67-128", Baseprice = 5990000, Saleprice = null },

                new Productvariant { Variantid = 8011, Productid = 801, Conditionid = 1, Sku = "XIA-14U-512", Baseprice = 32990000, Saleprice = 31990000 },
                new Productvariant { Variantid = 8021, Productid = 802, Conditionid = 1, Sku = "XIA-14-256", Baseprice = 22990000, Saleprice = 21990000 },
                new Productvariant { Variantid = 8031, Productid = 803, Conditionid = 1, Sku = "XIA-RN13PP-256", Baseprice = 10990000, Saleprice = 10490000 },

                new Productvariant { Variantid = 9011, Productid = 901, Conditionid = 1, Sku = "HUA-M60P-512", Baseprice = 39990000, Saleprice = 38990000 },
                new Productvariant { Variantid = 9021, Productid = 902, Conditionid = 1, Sku = "HUA-P60P-256", Baseprice = 29990000, Saleprice = null },
                new Productvariant { Variantid = 9031, Productid = 903, Conditionid = 1, Sku = "HUA-N11-256", Baseprice = 11990000, Saleprice = 10990000 },

                new Productvariant { Variantid = 10011, Productid = 1001, Conditionid = 1, Sku = "MEI-21P-256", Baseprice = 19990000, Saleprice = 18990000 },
                new Productvariant { Variantid = 10021, Productid = 1002, Conditionid = 1, Sku = "MEI-21-256", Baseprice = 15990000, Saleprice = 14990000 },
                new Productvariant { Variantid = 10031, Productid = 1003, Conditionid = 1, Sku = "MEI-20I-256", Baseprice = 22990000, Saleprice = null },

                new Productvariant { Variantid = 11011, Productid = 1101, Conditionid = 1, Sku = "IPH-15PM-256", Baseprice = 34990000, Saleprice = 32990000 },
                new Productvariant { Variantid = 11012, Productid = 1101, Conditionid = 1, Sku = "IPH-15PM-512", Baseprice = 40990000, Saleprice = 38990000 },
                new Productvariant { Variantid = 11021, Productid = 1102, Conditionid = 1, Sku = "IPH-15-128", Baseprice = 22990000, Saleprice = 21490000 },
                new Productvariant { Variantid = 11031, Productid = 1103, Conditionid = 1, Sku = "IPH-13-128", Baseprice = 15990000, Saleprice = 14990000 },

                new Productvariant { Variantid = 12011, Productid = 1201, Conditionid = 1, Sku = "SAM-S24U-256", Baseprice = 33990000, Saleprice = 31990000 },
                new Productvariant { Variantid = 12012, Productid = 1201, Conditionid = 1, Sku = "SAM-S24U-512", Baseprice = 37990000, Saleprice = 35990000 },
                new Productvariant { Variantid = 12021, Productid = 1202, Conditionid = 1, Sku = "SAM-ZF5-256", Baseprice = 40990000, Saleprice = 38990000 },
                new Productvariant { Variantid = 12031, Productid = 1203, Conditionid = 1, Sku = "SAM-A54-128", Baseprice = 10490000, Saleprice = 9490000 },

                new Productvariant { Variantid = 13011, Productid = 1301, Conditionid = 1, Sku = "SON-1V-256", Baseprice = 35990000, Saleprice = 34990000 },
                new Productvariant { Variantid = 13021, Productid = 1302, Conditionid = 1, Sku = "SON-5V-128", Baseprice = 27990000, Saleprice = 26990000 },
                new Productvariant { Variantid = 13031, Productid = 1303, Conditionid = 1, Sku = "SON-10V-128", Baseprice = 11990000, Saleprice = null },

                new Productvariant { Variantid = 14011, Productid = 1401, Conditionid = 1, Sku = "NOT-P2-256", Baseprice = 17990000, Saleprice = 16990000 },
                new Productvariant { Variantid = 14021, Productid = 1402, Conditionid = 1, Sku = "NOT-P2A-128", Baseprice = 9990000, Saleprice = 8990000 },
                new Productvariant { Variantid = 14031, Productid = 1403, Conditionid = 1, Sku = "NOT-P1-128", Baseprice = 11990000, Saleprice = 10990000 }
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
