using System.Collections.Generic;

namespace ECommerceBackend.DTOs.ProductVariants
{
    public record AssignVariantAttributesRequestDto(
        List<int> ValueIds
    );
}
