using System;
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

    public record TodaySalesResultsDto(
        decimal NetRevenueToday,
        int InvoicesToday,
        int ReturnsToday,
        decimal NetRevenueYesterday,
        decimal NetRevenueSameDayLastMonth,
        decimal ChangeVsYesterdayPercentage,
        decimal ChangeVsLastMonthPercentage
    );

    public record RevenueBreakdownItemDto(
        string Label,
        decimal Revenue
    );

    public record RecentActivityDto(
        string Id,
        string Title,
        string Subtitle,
        DateTime Timestamp,
        string? Status,
        decimal? Amount,
        string Type
    );

    public record TopCustomerDto(
        int CustomerId,
        string FullName,
        string Phone,
        decimal TotalSpent,
        int OrdersCount
    );
}
