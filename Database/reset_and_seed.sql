BEGIN;

-- 1. DELETE existing catalog data in FK-safe order
DELETE FROM variantattributevalues;
DELETE FROM attributevalues;
DELETE FROM attributes;
DELETE FROM inventoryitems;
DELETE FROM productimages;
DELETE FROM productvariants;
DELETE FROM products;
DELETE FROM brands;

-- 2. RESET sequences if any (PostgreSQL uses serial/identity, but since we specify IDs manually in seed, we don't necessarily need to reset. We will use explicit IDs).

-- 3. INSERT BRANDS
INSERT INTO brands (brandid, brandname) VALUES
(1, 'Google Pixel'),
(2, 'vivo'),
(3, 'iQOO'),
(4, 'Honor'),
(5, 'OnePlus'),
(6, 'OPPO'),
(7, 'Realme'),
(8, 'Xiaomi'),
(9, 'Huawei'),
(10, 'Meizu'),
(11, 'iPhone'),
(12, 'Samsung'),
(13, 'Sony'),
(14, 'Nothing Phone');

-- 4. INSERT PRODUCTS
-- Assumes categoryid = 1 for Phones (based on DbInitializer)
INSERT INTO products (productid, categoryid, brandid, productname, description, createdat) VALUES
-- Google Pixel
(101, 1, 1, 'Google Pixel 8 Pro', 'Điện thoại Google Pixel cao cấp nhất với chip Tensor G3 và camera AI.', NOW()),
(102, 1, 1, 'Google Pixel 8', 'Google Pixel 8 nhỏ gọn, chip Tensor G3 mạnh mẽ.', NOW()),
(103, 1, 1, 'Google Pixel 7a', 'Điện thoại Pixel tầm trung với camera xuất sắc.', NOW()),
-- vivo
(201, 1, 2, 'vivo X100 Pro', 'Flagship camera kết hợp Zeiss.', NOW()),
(202, 1, 2, 'vivo V29 5G', 'Chuyên gia chân dung với vòng sáng Aura.', NOW()),
(203, 1, 2, 'vivo Y36', 'Thiết kế trẻ trung, sạc nhanh 44W.', NOW()),
-- iQOO
(301, 1, 3, 'iQOO 12 Pro', 'Siêu phẩm gaming với chip Snapdragon 8 Gen 3.', NOW()),
(302, 1, 3, 'iQOO Neo 9', 'Hiệu năng đỉnh cao trong tầm giá.', NOW()),
(303, 1, 3, 'iQOO Z8', 'Pin khủng, sạc siêu tốc 120W.', NOW()),
-- Honor
(401, 1, 4, 'Honor Magic6 Pro', 'Flagship Honor với camera Falcon, pin silicon-carbon.', NOW()),
(402, 1, 4, 'Honor 90', 'Màn hình bảo vệ mắt đỉnh cao, camera 200MP.', NOW()),
(403, 1, 4, 'Honor X9b', 'Thiết kế siêu bền chống va đập.', NOW()),
-- OnePlus
(501, 1, 5, 'OnePlus 12', 'Flagship Killer 2024, Snapdragon 8 Gen 3, Hasselblad.', NOW()),
(502, 1, 5, 'OnePlus 12R', 'Hiệu năng mạnh mẽ với pin lớn.', NOW()),
(503, 1, 5, 'OnePlus Nord 3', 'Tầm trung cực mạnh, sạc 80W.', NOW()),
-- OPPO
(601, 1, 6, 'OPPO Find N3', 'Điện thoại gập siêu mỏng nhẹ, camera Hasselblad.', NOW()),
(602, 1, 6, 'OPPO Reno11 Pro', 'Thiết kế đẹp mắt, camera chân dung tele.', NOW()),
(603, 1, 6, 'OPPO A98 5G', 'Màn hình 120Hz, pin bền bỉ.', NOW()),
-- Realme
(701, 1, 7, 'Realme GT5 Pro', 'Flagship Realme Snapdragon 8 Gen 3, camera tele xịn.', NOW()),
(702, 1, 7, 'Realme 11 Pro+', 'Màn hình cong đẹp, camera 200MP.', NOW()),
(703, 1, 7, 'Realme C67', 'Smartphone quốc dân giá cực rẻ.', NOW()),
-- Xiaomi
(801, 1, 8, 'Xiaomi 14 Ultra', 'Quái thú nhiếp ảnh với cụm camera Leica.', NOW()),
(802, 1, 8, 'Xiaomi 14', 'Flagship nhỏ gọn mạnh mẽ.', NOW()),
(803, 1, 8, 'Redmi Note 13 Pro+', 'Siêu phẩm tầm trung có chống nước IP68.', NOW()),
-- Huawei
(901, 1, 9, 'Huawei Mate 60 Pro', 'Flagship Huawei có kết nối vệ tinh, thiết kế đẳng cấp.', NOW()),
(902, 1, 9, 'Huawei P60 Pro', 'Ông vua nhiếp ảnh thiếu sáng.', NOW()),
(903, 1, 9, 'Huawei Nova 11', 'Smartphone thời trang mỏng nhẹ.', NOW()),
-- Meizu
(1001, 1, 10, 'Meizu 21 Pro', 'Flagship Meizu cuối cùng, thiết kế vuông vức tinh tế.', NOW()),
(1002, 1, 10, 'Meizu 21', 'Viền màn hình trắng siêu mỏng.', NOW()),
(1003, 1, 10, 'Meizu 20 Infinity', 'Điện thoại viền siêu mỏng, mặt lưng kính đặc biệt.', NOW()),
-- iPhone
(1101, 1, 11, 'iPhone 15 Pro Max', 'Khung Titan, chip A17 Pro, cổng USB-C.', NOW()),
(1102, 1, 11, 'iPhone 15', 'Dynamic Island cho dòng tiêu chuẩn.', NOW()),
(1103, 1, 11, 'iPhone 13', 'Chiếc iPhone quốc dân với giá cực tốt.', NOW()),
-- Samsung
(1201, 1, 12, 'Samsung Galaxy S24 Ultra', 'Thiết kế phẳng, khung Titan, Galaxy AI.', NOW()),
(1202, 1, 12, 'Samsung Galaxy Z Fold5', 'Điện thoại gập cỡ lớn tối ưu đa nhiệm.', NOW()),
(1203, 1, 12, 'Samsung Galaxy A54 5G', 'Điện thoại tầm trung bán chạy nhất.', NOW()),
-- Sony
(1301, 1, 13, 'Sony Xperia 1 V', 'Cảm biến Exmor T mới, màn hình 4K HDR.', NOW()),
(1302, 1, 13, 'Sony Xperia 5 V', 'Điện thoại gọn nhẹ, hiệu năng cao.', NOW()),
(1303, 1, 13, 'Sony Xperia 10 V', 'Pin khủng nhất trong phân khúc mỏng nhẹ.', NOW()),
-- Nothing Phone
(1401, 1, 14, 'Nothing Phone (2)', 'Mặt lưng LED Glyph độc đáo, chip Snapdragon 8+ Gen 1.', NOW()),
(1402, 1, 14, 'Nothing Phone (2a)', 'Thiết kế khác biệt cho phân khúc tầm trung.', NOW()),
(1403, 1, 14, 'Nothing Phone (1)', 'Phiên bản tiên phong với mặt lưng trong suốt.', NOW());

-- 5. INSERT PRODUCT VARIANTS
-- (conditionid = 1 for New 100%)
INSERT INTO productvariants (variantid, productid, conditionid, sku, baseprice, saleprice) VALUES
(1011, 101, 1, 'PIX8P-128', 24990000, 23990000), (1012, 101, 1, 'PIX8P-256', 26990000, NULL),
(1021, 102, 1, 'PIX8-128', 18990000, 17990000),
(1031, 103, 1, 'PIX7A-128', 10990000, 9990000),

(2011, 201, 1, 'VIV-X100P-256', 29990000, 28990000),
(2021, 202, 1, 'VIV-V29-128', 11990000, 10990000),
(2031, 203, 1, 'VIV-Y36-128', 6990000, 6490000),

(3011, 301, 1, 'IQO-12P-256', 19990000, 18990000),
(3021, 302, 1, 'IQO-N9-256', 12990000, 11990000),
(3031, 303, 1, 'IQO-Z8-128', 7990000, NULL),

(4011, 401, 1, 'HON-M6P-256', 25990000, 24990000),
(4021, 402, 1, 'HON-90-256', 10990000, 9990000),
(4031, 403, 1, 'HON-X9B-256', 8990000, NULL),

(5011, 501, 1, 'ONE-12-256', 22990000, 21990000),
(5021, 502, 1, 'ONE-12R-256', 15990000, 14990000),
(5031, 503, 1, 'ONE-N3-128', 10990000, 9990000),

(6011, 601, 1, 'OPP-FN3-512', 44990000, 42990000),
(6021, 602, 1, 'OPP-R11P-256', 16990000, 15990000),
(6031, 603, 1, 'OPP-A98-256', 8990000, 8490000),

(7011, 701, 1, 'RME-GT5P-256', 16990000, 15990000),
(7021, 702, 1, 'RME-11PP-256', 11990000, 10990000),
(7031, 703, 1, 'RME-C67-128', 5990000, NULL),

(8011, 801, 1, 'XIA-14U-512', 32990000, 31990000),
(8021, 802, 1, 'XIA-14-256', 22990000, 21990000),
(8031, 803, 1, 'XIA-RN13PP-256', 10990000, 10490000),

(9011, 901, 1, 'HUA-M60P-512', 39990000, 38990000),
(9021, 902, 1, 'HUA-P60P-256', 29990000, NULL),
(9031, 903, 1, 'HUA-N11-256', 11990000, 10990000),

(10011, 1001, 1, 'MEI-21P-256', 19990000, 18990000),
(10021, 1002, 1, 'MEI-21-256', 15990000, 14990000),
(10031, 1003, 1, 'MEI-20I-256', 22990000, NULL),

(11011, 1101, 1, 'IPH-15PM-256', 34990000, 32990000), (11012, 1101, 1, 'IPH-15PM-512', 40990000, 38990000),
(11021, 1102, 1, 'IPH-15-128', 22990000, 21490000),
(11031, 1103, 1, 'IPH-13-128', 15990000, 14990000),

(12011, 1201, 1, 'SAM-S24U-256', 33990000, 31990000), (12012, 1201, 1, 'SAM-S24U-512', 37990000, 35990000),
(12021, 1202, 1, 'SAM-ZF5-256', 40990000, 38990000),
(12031, 1203, 1, 'SAM-A54-128', 10490000, 9490000),

(13011, 1301, 1, 'SON-1V-256', 35990000, 34990000),
(13021, 1302, 1, 'SON-5V-128', 27990000, 26990000),
(13031, 1303, 1, 'SON-10V-128', 11990000, NULL),

(14011, 1401, 1, 'NOT-P2-256', 17990000, 16990000),
(14021, 1402, 1, 'NOT-P2A-128', 9990000, 8990000),
(14031, 1403, 1, 'NOT-P1-128', 11990000, 10990000);

COMMIT;
