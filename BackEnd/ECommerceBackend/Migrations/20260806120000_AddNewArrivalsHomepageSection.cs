using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ECommerceBackend.Migrations;

public partial class AddNewArrivalsHomepageSection : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            INSERT INTO contents (contenttype, title, summary, contentdata, displayorder, isactive, createdat)
            SELECT
                'HomepageProductSection',
                'MỚI VỀ',
                'Các mẫu vừa được thêm vào cửa hàng.',
                '{"Sectionkey":"new-arrivals","Subtitle":"Các mẫu vừa được thêm vào cửa hàng.","Theme":"LightBlue","Productids":[]}'::jsonb,
                4,
                TRUE,
                CURRENT_TIMESTAMP
            WHERE NOT EXISTS (
                SELECT 1
                FROM contents
                WHERE contenttype = 'HomepageProductSection'
                  AND contentdata ->> 'Sectionkey' = 'new-arrivals'
            );
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            DELETE FROM contents
            WHERE contenttype = 'HomepageProductSection'
              AND contentdata ->> 'Sectionkey' = 'new-arrivals';
            """);
    }
}
