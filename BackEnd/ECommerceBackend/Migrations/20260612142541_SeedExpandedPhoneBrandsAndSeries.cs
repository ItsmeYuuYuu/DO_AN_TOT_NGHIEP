using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ECommerceBackend.Migrations
{
    /// <inheritdoc />
    public partial class SeedExpandedPhoneBrandsAndSeries : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                DO $$
                DECLARE
                    brand_record record;
                    series_record record;
                    target_brand_id integer;
                    target_series_id integer;
                BEGIN
                    PERFORM setval(
                        pg_get_serial_sequence('brands', 'brandid'),
                        COALESCE((SELECT MAX(brandid) FROM brands), 1),
                        true);
                    PERFORM setval(
                        pg_get_serial_sequence('productseries', 'seriesid'),
                        COALESCE((SELECT MAX(seriesid) FROM productseries), 1),
                        true);

                    FOR brand_record IN
                        SELECT *
                        FROM (VALUES
                            ('Google Pixel'),
                            ('Xiaomi'),
                            ('Vivo'),
                            ('IQOO'),
                            ('Honor'),
                            ('OnePlus'),
                            ('OPPO')
                        ) AS requested(brandname)
                    LOOP
                        SELECT brandid INTO target_brand_id
                        FROM brands
                        WHERE lower(brandname) = lower(brand_record.brandname)
                        ORDER BY brandid
                        LIMIT 1;

                        IF target_brand_id IS NULL THEN
                            INSERT INTO brands (brandname)
                            VALUES (brand_record.brandname)
                            RETURNING brandid INTO target_brand_id;
                        ELSE
                            UPDATE brands
                            SET brandname = brand_record.brandname
                            WHERE brandid = target_brand_id;
                        END IF;
                    END LOOP;

                    FOR series_record IN
                        SELECT *
                        FROM (VALUES
                            ('Google Pixel', 'Pixel 10 series', 0),
                            ('Google Pixel', 'Pixel 11 series', 1),
                            ('Google Pixel', 'Pixel XL', 2),
                            ('Google Pixel', 'Pixel 9 series', 3),
                            ('Google Pixel', 'Pixel Fold', 4),
                            ('Google Pixel', 'Pixel 8 series', 5),

                            ('Xiaomi', 'POCO', 0),
                            ('Xiaomi', 'REDMI', 1),
                            ('Xiaomi', 'Xiaomi 11 series', 2),
                            ('Xiaomi', 'Xiaomi 12 series', 3),
                            ('Xiaomi', 'Xiaomi 13 series', 4),
                            ('Xiaomi', 'Xiaomi 14 series', 5),
                            ('Xiaomi', 'Xiaomi 15 Series', 6),
                            ('Xiaomi', 'Xiaomi 17 Series', 7),

                            ('Vivo', 'S30 Series', 0),
                            ('Vivo', 'S50 Series', 1),
                            ('Vivo', 'V Series', 2),
                            ('Vivo', 'vivo X100 Series', 3),
                            ('Vivo', 'vivo X200 Series', 4),
                            ('Vivo', 'vivo X300 Series', 5),
                            ('Vivo', 'vivo Y300 Pro+', 6),
                            ('Vivo', 'X Fold 5', 7),
                            ('Vivo', 'X Series', 8),

                            ('IQOO', 'iQOO 12', 0),
                            ('IQOO', 'iQOO 12 Pro', 1),
                            ('IQOO', 'iQOO 13', 2),
                            ('IQOO', 'iQOO 15', 3),
                            ('IQOO', 'iQOO 15 Ultra', 4),
                            ('IQOO', 'iQOO 15T', 5),
                            ('IQOO', 'iQOO Z9 Turbo', 6),
                            ('IQOO', 'Neo 10 Series', 7),
                            ('IQOO', 'Neo11', 8),
                            ('IQOO', 'Neo9', 9),
                            ('IQOO', 'Z10 Series', 10),
                            ('IQOO', 'Z11 Series', 11),
                            ('IQOO', 'Z9', 12),

                            ('Honor', 'Honor 100 Series', 0),
                            ('Honor', 'Honor 200 Series', 1),
                            ('Honor', 'Honor 300 Series', 2),
                            ('Honor', 'Honor 400 Series', 3),
                            ('Honor', 'Honor 500 Series', 4),
                            ('Honor', 'Honor 600 Series', 5),
                            ('Honor', 'GT Series', 6),
                            ('Honor', 'Magic 5 Series', 7),
                            ('Honor', 'Magic 6 Series', 8),
                            ('Honor', 'Magic 7 Series', 9),
                            ('Honor', 'Magic 8 Series', 10),
                            ('Honor', 'Magic V2', 11),
                            ('Honor', 'Magic V5', 12),
                            ('Honor', 'Power Series', 13),
                            ('Honor', 'WIN Series', 14),
                            ('Honor', 'X Series', 15),

                            ('OnePlus', 'Ace 2 Series', 0),
                            ('OnePlus', 'Ace 3 Series', 1),
                            ('OnePlus', 'Ace 5 Series', 2),
                            ('OnePlus', 'Ace 6 Series', 3),
                            ('OnePlus', 'Nord 4 Series', 4),
                            ('OnePlus', 'Nord 5 Series', 5),
                            ('OnePlus', 'OnePlus 13 Series', 6),
                            ('OnePlus', 'OnePlus 15 Series', 7),
                            ('OnePlus', 'Turbo Series', 8),
                            ('OnePlus', 'Oneplus 10T', 9),
                            ('OnePlus', 'Oneplus 11', 10),
                            ('OnePlus', 'OnePlus 12', 11),

                            ('OPPO', 'A Series', 0),
                            ('OPPO', 'Find X8 Series', 1),
                            ('OPPO', 'Find X9 Series', 2),
                            ('OPPO', 'K Series', 3),
                            ('OPPO', 'Reno Series', 4),
                            ('OPPO', 'Find X7 Ultra', 5)
                        ) AS requested(brandname, seriesname, displayorder)
                    LOOP
                        SELECT brandid INTO target_brand_id
                        FROM brands
                        WHERE lower(brandname) = lower(series_record.brandname)
                        ORDER BY brandid
                        LIMIT 1;

                        SELECT seriesid INTO target_series_id
                        FROM productseries
                        WHERE brandid = target_brand_id
                          AND lower(seriesname) = lower(series_record.seriesname)
                        ORDER BY seriesid
                        LIMIT 1;

                        IF target_series_id IS NULL THEN
                            INSERT INTO productseries (
                                brandid,
                                seriesname,
                                displayorder,
                                isactive,
                                createdat)
                            VALUES (
                                target_brand_id,
                                series_record.seriesname,
                                series_record.displayorder,
                                true,
                                CURRENT_TIMESTAMP);
                        ELSE
                            UPDATE productseries
                            SET seriesname = series_record.seriesname,
                                displayorder = series_record.displayorder,
                                isactive = true
                            WHERE seriesid = target_series_id;
                        END IF;
                    END LOOP;

                    UPDATE products AS product
                    SET seriesid = series.seriesid
                    FROM productseries AS series
                    JOIN brands AS brand ON brand.brandid = series.brandid
                    WHERE product.productname ILIKE 'Google Pixel 8%'
                      AND product.brandid = brand.brandid
                      AND brand.brandname = 'Google Pixel'
                      AND series.seriesname = 'Pixel 8 series';

                    PERFORM setval(
                        pg_get_serial_sequence('brands', 'brandid'),
                        COALESCE((SELECT MAX(brandid) FROM brands), 1),
                        true);
                    PERFORM setval(
                        pg_get_serial_sequence('productseries', 'seriesid'),
                        COALESCE((SELECT MAX(seriesid) FROM productseries), 1),
                        true);
                END $$;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // This migration only seeds catalog reference data. It is intentionally
            // non-destructive because products may reference these brands and series.
        }
    }
}
