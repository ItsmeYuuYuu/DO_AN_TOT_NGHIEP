using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ECommerceBackend.Migrations
{
    /// <inheritdoc />
    public partial class NormalizeProductSeriesLabels : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ConsolidateJsonB removed productseries before its labels were copied.
            // BackfillProductSeriesNames consequently used productname as a fallback,
            // which made every product appear as a separate series. Only repair rows
            // that are still blank or equal to the product name so later manual edits
            // are never overwritten.
            migrationBuilder.Sql("""
                UPDATE products AS product
                SET seriesname = CASE
                    WHEN lower(brand.brandname) = 'asus rog'
                         AND product.productname ILIKE 'ASUS ROG Phone 9%'
                        THEN 'ROG Phone 9 Series'

                    WHEN lower(brand.brandname) = 'google pixel'
                         AND product.productname ILIKE 'Google Pixel 8%'
                        THEN 'Pixel 8 Series'
                    WHEN lower(brand.brandname) = 'google pixel'
                         AND product.productname ILIKE 'Google Pixel 9%'
                        THEN 'Pixel 9 Series'
                    WHEN lower(brand.brandname) = 'google pixel'
                         AND product.productname ILIKE 'Google Pixel 10%'
                        THEN 'Pixel 10 Series'

                    WHEN lower(brand.brandname) = 'honor'
                         AND product.productname ILIKE 'Honor 400%'
                        THEN 'Honor 400 Series'
                    WHEN lower(brand.brandname) = 'honor'
                         AND product.productname ILIKE 'Honor Magic7%'
                        THEN 'Magic 7 Series'

                    WHEN lower(brand.brandname) = 'huawei'
                         AND product.productname ILIKE 'Huawei Pura 80%'
                        THEN 'Pura 80 Series'

                    WHEN lower(brand.brandname) = 'iphone'
                         AND product.productname ILIKE 'iPhone 15%'
                        THEN 'iPhone 15 Series'
                    WHEN lower(brand.brandname) = 'iphone'
                         AND product.productname ILIKE 'iPhone 16%'
                        THEN 'iPhone 16 Series'
                    WHEN lower(brand.brandname) = 'iphone'
                         AND product.productname ILIKE 'iPhone 17%'
                        THEN 'iPhone 17 Series'

                    WHEN lower(brand.brandname) = 'iqoo'
                         AND product.productname ILIKE 'iQOO Neo 10%'
                        THEN 'Neo 10 Series'
                    WHEN lower(brand.brandname) = 'iqoo'
                         AND product.productname ILIKE 'iQOO 13%'
                        THEN 'iQOO 13 Series'
                    WHEN lower(brand.brandname) = 'iqoo'
                         AND product.productname ILIKE 'iQOO 15%'
                        THEN 'iQOO 15 Series'

                    WHEN lower(brand.brandname) = 'oneplus'
                         AND product.productname ILIKE 'OnePlus 12%'
                        THEN 'OnePlus 12 Series'
                    WHEN lower(brand.brandname) = 'oneplus'
                         AND product.productname ILIKE 'OnePlus 13%'
                        THEN 'OnePlus 13 Series'
                    WHEN lower(brand.brandname) = 'oneplus'
                         AND product.productname ILIKE 'OnePlus 15%'
                        THEN 'OnePlus 15 Series'

                    WHEN lower(brand.brandname) = 'oppo'
                         AND product.productname ILIKE 'OPPO Find X8%'
                        THEN 'Find X8 Series'
                    WHEN lower(brand.brandname) = 'oppo'
                         AND product.productname ILIKE 'OPPO Find X9%'
                        THEN 'Find X9 Series'
                    WHEN lower(brand.brandname) = 'oppo'
                         AND product.productname ILIKE 'OPPO Reno13%'
                        THEN 'Reno 13 Series'

                    WHEN lower(brand.brandname) = 'redmagic'
                         AND product.productname ILIKE 'REDMAGIC 11%'
                        THEN 'REDMAGIC 11 Series'

                    WHEN lower(brand.brandname) = 'samsung'
                         AND product.productname ILIKE 'Samsung Galaxy A55%'
                        THEN 'Galaxy A55 Series'
                    WHEN lower(brand.brandname) = 'samsung'
                         AND product.productname ILIKE 'Samsung Galaxy S24%'
                        THEN 'Galaxy S24 Series'
                    WHEN lower(brand.brandname) = 'samsung'
                         AND product.productname ILIKE 'Samsung Galaxy S26%'
                        THEN 'Galaxy S26 Series'
                    WHEN lower(brand.brandname) = 'samsung'
                         AND product.productname ILIKE 'Samsung Galaxy Z Fold6%'
                        THEN 'Galaxy Z Fold6 Series'

                    WHEN lower(brand.brandname) = 'sony'
                         AND product.productname ILIKE 'Sony Xperia 1%'
                        THEN 'Xperia 1 Series'

                    WHEN lower(brand.brandname) = 'vivo'
                         AND product.productname ILIKE 'vivo V40%'
                        THEN 'V40 Series'
                    WHEN lower(brand.brandname) = 'vivo'
                         AND product.productname ILIKE 'vivo X200%'
                        THEN 'vivo X200 Series'
                    WHEN lower(brand.brandname) = 'vivo'
                         AND product.productname ILIKE 'vivo X300%'
                        THEN 'vivo X300 Series'

                    WHEN lower(brand.brandname) = 'xiaomi'
                         AND product.productname ILIKE 'POCO F6%'
                        THEN 'POCO F6 Series'
                    WHEN lower(brand.brandname) = 'xiaomi'
                         AND product.productname ILIKE 'Redmi Note 13%'
                        THEN 'Redmi Note 13 Series'
                    WHEN lower(brand.brandname) = 'xiaomi'
                         AND product.productname ILIKE 'Xiaomi 14T%'
                        THEN 'Xiaomi 14T Series'
                    WHEN lower(brand.brandname) = 'xiaomi'
                         AND product.productname ILIKE 'Xiaomi 14%'
                        THEN 'Xiaomi 14 Series'
                    WHEN lower(brand.brandname) = 'xiaomi'
                         AND product.productname ILIKE 'Xiaomi 15%'
                        THEN 'Xiaomi 15 Series'

                    ELSE 'Chưa phân loại'
                END
                FROM brands AS brand
                WHERE product.brandid = brand.brandid
                  AND (
                      btrim(COALESCE(product.seriesname, '')) = ''
                      OR lower(btrim(product.seriesname)) = lower(btrim(product.productname))
                  );
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Data-only correction. A rollback must not replace series labels that
            // may have been edited after this migration with the old product names.
        }
    }
}
