using System.Collections.Generic;

namespace ECommerceBackend.DTOs.Dashboard
{
    public record KpiResponseDto(
        decimal TotalRevenueCurrent,
        decimal TotalRevenuePrevious,
        int CompletedOrdersCurrent,
        int CompletedOrdersPrevious,
        decimal CancelledRateCurrent,
        decimal CancelledRatePrevious,
        decimal AovCurrent,
        decimal AovPrevious,
        int PendingOverSlaCount
    );

    public record TopProductDto(
        int ProductId,
        string ProductName,
        int UnitsSold,
        decimal Revenue
    );

    public record OrderStatusDistributionDto(
        string Status,
        int Count
    );
}
