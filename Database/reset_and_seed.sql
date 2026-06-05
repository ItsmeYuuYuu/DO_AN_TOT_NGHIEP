BEGIN;

-- 1. Xóa dữ liệu cũ theo thứ tự an toàn khóa ngoại
DELETE FROM ChatMessages;
DELETE FROM ChatSessions;
DELETE FROM News;
DELETE FROM PromotionalContents;
DELETE FROM AuditLogs;
DELETE FROM Reviews;
DELETE FROM OrderItems;
DELETE FROM Orders;
DELETE FROM InventoryItems;
DELETE FROM ProductImages;
DELETE FROM ProductVariants;
DELETE FROM Products;
DELETE FROM Brands;
DELETE FROM Categories;
DELETE FROM Vouchers;
DELETE FROM WarrantyPackages;
DELETE FROM Users;
DELETE FROM Roles;

-- 2. Thêm Roles
INSERT INTO Roles (RoleId, RoleName) VALUES
(1, 'Admin'),
(2, 'Staff'),
(3, 'Customer');

-- 3. Thêm Users mẫu (mật khẩu đã băm bằng BCrypt tương ứng trong DbInitializer)
-- Admin: admin300475@gmail.com / Admin@300475!
-- Staff: staff01@gmail.com / Staff@123456!
INSERT INTO Users (UserId, RoleId, Username, PasswordHash, FullName, Email, Phone, IsActive) VALUES
(1, 1, 'admin300475@gmail.com', '$2a$11$Z6n8/D8L1t31L2.d.g.k5.x5m6D5.z5m6D5.z5m6D5.z5m6D5.z5m', 'Quản trị viên hệ thống', 'admin300475@gmail.com', '0900000000', TRUE),
(2, 2, 'staff01@gmail.com', '$2a$11$Z6n8/D8L1t31L2.d.g.k5.x5m6D5.z5m6D5.z5m6D5.z5m6D5.z5m', 'Nhân viên kho', 'staff01@gmail.com', '0911111111', TRUE);

-- 4. Thêm Khách hàng mẫu
INSERT INTO Customers (CustomerId, FullName, Phone, Email, Address) VALUES
(1, 'Nguyễn Văn An', '0901234567', 'an.nguyen@gmail.com', '12 Nguyễn Huệ, Q1, TP.HCM'),
(2, 'Trần Thị Bích', '0912345678', 'bich.tran@gmail.com', '45 Lê Lợi, Q3, TP.HCM'),
(3, 'Lê Minh Cường', '0923456789', 'cuong.le@gmail.com', '78 Trần Hưng Đạo, Hoàn Kiếm, Hà Nội');

-- 5. Thêm Danh mục
INSERT INTO Categories (CategoryId, CategoryName, Description) VALUES
(1, 'Điện thoại', 'Điện thoại thông minh các loại'),
(2, 'Laptop', 'Máy tính xách tay'),
(3, 'Phụ kiện', 'Cáp, sạc, tai nghe, ốp lưng...');

-- 6. Thêm Thương hiệu
INSERT INTO Brands (BrandId, BrandName) VALUES
(1, 'Google Pixel'),
(2, 'iPhone'),
(3, 'Samsung'),
(4, 'Xiaomi');

-- 7. Thêm Sản phẩm
INSERT INTO Products (ProductId, CategoryId, BrandId, ProductName, Description) VALUES
(101, 1, 1, 'Google Pixel 8 Pro', 'Điện thoại Google Pixel cao cấp nhất với chip Tensor G3 và camera AI.'),
(102, 1, 2, 'iPhone 15 Pro Max', 'Khung Titan, chip A17 Pro, cổng USB-C tiện lợi.'),
(103, 1, 3, 'Samsung Galaxy S24 Ultra', 'Thiết kế phẳng, khung Titan chắc chắn, tích hợp các tính năng Galaxy AI.');

-- 8. Thêm Biến thể sản phẩm (Variant kèm Condition và Specifications JSON trực tiếp)
INSERT INTO ProductVariants (VariantId, ProductId, SKU, BasePrice, SalePrice, Condition, Specifications) VALUES
(1011, 101, 'PIX8P-128-NEW', 24990000, 23990000, 'Mới 100%', '{"Màn hình": "6.7 inch OLED", "Chipset": "Google Tensor G3", "RAM": "12GB", "Bộ nhớ": "128GB", "Pin": "5050 mAh"}'),
(1012, 101, 'PIX8P-256-99', 21990000, NULL, 'Like New (99%)', '{"Màn hình": "6.7 inch OLED", "Chipset": "Google Tensor G3", "RAM": "12GB", "Bộ nhớ": "256GB", "Pin": "5050 mAh"}'),
(1021, 102, 'IPH-15PM-256-NEW', 34990000, 32990000, 'Mới 100%', '{"Màn hình": "6.7 inch Super Retina XDR", "Chipset": "Apple A17 Pro", "RAM": "8GB", "Bộ nhớ": "256GB", "Pin": "4441 mAh"}'),
(1022, 102, 'IPH-15PM-256-95', 27990000, NULL, 'Cũ đẹp (95%)', '{"Màn hình": "6.7 inch Super Retina XDR", "Chipset": "Apple A17 Pro", "RAM": "8GB", "Bộ nhớ": "256GB", "Pin": "4441 mAh"}'),
(1031, 103, 'SAM-S24U-256-NEW', 33990000, 31990000, 'Mới 100%', '{"Màn hình": "6.8 inch Dynamic AMOLED 2X", "Chipset": "Snapdragon 8 Gen 3 for Galaxy", "RAM": "12GB", "Bộ nhớ": "256GB", "Pin": "5000 mAh"}');

-- 9. Thêm bộ sưu tập Hình ảnh sản phẩm
INSERT INTO ProductImages (ImageId, VariantId, ImageUrl, IsMain) VALUES
(1, 1011, 'https://placehold.co/400x400/2563eb/white?text=Pixel+8+Pro+New', TRUE),
(2, 1012, 'https://placehold.co/400x400/2563eb/white?text=Pixel+8+Pro+Used', TRUE),
(3, 1021, 'https://placehold.co/400x400/0f172a/white?text=iPhone+15+PM+New', TRUE),
(4, 1031, 'https://placehold.co/400x400/1e3a5f/white?text=S24+Ultra+New', TRUE);

-- 10. Thêm Thiết bị trong kho (InventoryItems gồm IMEI, gộp kèm bảo hành mẫu nếu đã bán)
INSERT INTO InventoryItems (IMEI, VariantId, Status, WarrantyStartDate, WarrantyEndDate, WarrantyStatus) VALUES
('IMEI-PIX8P-001', 1011, 'InStock', NULL, NULL, NULL),
('IMEI-PIX8P-002', 1011, 'InStock', NULL, NULL, NULL),
('IMEI-PIX8P-003', 1012, 'InStock', NULL, NULL, NULL),
('IMEI-IPH15-001', 1021, 'Sold', '2026-06-01 00:00:00', '2027-06-01 00:00:00', 'Active'),
('IMEI-IPH15-002', 1021, 'InStock', NULL, NULL, NULL),
('IMEI-S24U-001', 1031, 'InStock', NULL, NULL, NULL);

-- 11. Thêm Gói bảo hành mở rộng
INSERT INTO WarrantyPackages (PackageId, PackageName, DurationMonths, Price) VALUES
(1, 'Mặc định (Không phụ thu)', 12, 0),
(2, 'Bảo Hành Vàng (Nguồn, Màn hình, Vân tay)', 12, 1000000),
(3, 'Bảo Hành Kim Cương (Bao gồm rơi vỡ, vào nước)', 12, 2000000);

-- 12. Thêm Vouchers giảm giá
INSERT INTO Vouchers (VoucherCode, DiscountAmount, DiscountPercentage, ValidFrom, ValidTo, IsActive) VALUES
('GIAM2TR', 2000000, NULL, '2026-01-01 00:00:00', '2027-12-31 23:59:59', TRUE),
('SALE10PT', NULL, 10.0, '2026-01-01 00:00:00', '2027-12-31 23:59:59', TRUE);

-- 13. Thêm Đơn hàng mẫu
INSERT INTO Orders (OrderId, CustomerId, UserId, VoucherCode, TotalAmount, DiscountAmount, FinalAmount, PaymentMethod, OrderStatus) VALUES
(1, 1, 1, 'GIAM2TR', 34990000, 2000000, 32990000, 'VNPay', 'Completed');

-- 14. Thêm Chi tiết đơn hàng mẫu
INSERT INTO OrderItems (OrderItemId, OrderId, IMEI, PackageId, SellingPrice, WarrantyPrice) VALUES
(1, 1, 'IMEI-IPH15-001', 1, 34990000, 0);

-- 15. Thêm Nội dung quảng cáo (PromotionalContents)
INSERT INTO PromotionalContents (ContentId, ContentType, Title, ImageUrl, LinkUrl, DisplayOrder, IsActive) VALUES
(1, 'Slider', 'iPhone 15 Pro Max - Khung Titan', 'https://placehold.co/1400x500/0f172a/00e5ff?text=iPhone+15+Pro+Max', '/products/102', 1, TRUE),
(2, 'Slider', 'Samsung Galaxy S24 Ultra - AI Phone', 'https://placehold.co/1400x500/1e3a5f/ffffff?text=Samsung+Galaxy+S24+Ultra', '/products/103', 2, TRUE),
(3, 'Banner', 'Flash Sale Google Pixel 8 Pro', 'https://placehold.co/1200x400/2563eb/white?text=Google+Pixel+8+Pro+Sale', '/products/101', 1, TRUE);

COMMIT;
