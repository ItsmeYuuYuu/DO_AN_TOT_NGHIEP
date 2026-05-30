using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ECommerceBackend.Models;
using ECommerceBackend.DTOs.Dashboard;
using ECommerceBackend.DTOs.Common;
using Microsoft.AspNetCore.Authorization;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace ECommerceBackend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Admin")]
    public class DashboardController : ControllerBase
    {
        private readonly ECommerceContext _context;

        public DashboardController(ECommerceContext context)
        {
            _context = context;
        }

        private (DateTime currentStart, DateTime previousStart) GetDateRanges(string period)
        {
            int days = period == "30d" ? 30 : 7;
            var now = DateTime.Now;
            var currentStart = now.AddDays(-days);
            var previousStart = now.AddDays(-days * 2);
            return (currentStart, previousStart);
        }

        [HttpGet("kpi")]
        public async Task<ActionResult<KpiResponseDto>> GetKpi([FromQuery] string period = "7d")
        {
            if (period != "7d" && period != "30d")
            {
                return BadRequest(new ApiErrorDto("Period không hợp lệ, chỉ hỗ trợ '7d' hoặc '30d'", null));
            }

            var (currentStart, previousStart) = GetDateRanges(period);
            var now = DateTime.Now;

            var orders = await _context.Orders
                .Where(o => o.Orderdate != null && o.Orderdate >= previousStart && o.Orderdate <= now)
                .Select(o => new { o.Orderid, o.Orderdate, o.Orderstatus, o.Finalamount })
                .ToListAsync();

            var currentOrders = orders.Where(o => o.Orderdate >= currentStart).ToList();
            var previousOrders = orders.Where(o => o.Orderdate < currentStart).ToList();

            var completedCurrent = currentOrders.Where(o => o.Orderstatus == "Completed").ToList();
            var completedPrevious = previousOrders.Where(o => o.Orderstatus == "Completed").ToList();

            decimal totalRevenueCurrent = completedCurrent.Sum(o => o.Finalamount);
            decimal totalRevenuePrevious = completedPrevious.Sum(o => o.Finalamount);

            int completedOrdersCurrent = completedCurrent.Count;
            int completedOrdersPrevious = completedPrevious.Count;

            int totalCurrent = currentOrders.Count;
            int totalPrevious = previousOrders.Count;

            int cancelledCurrent = currentOrders.Count(o => o.Orderstatus == "Cancelled");
            int cancelledPrevious = previousOrders.Count(o => o.Orderstatus == "Cancelled");

            decimal cancelledRateCurrent = totalCurrent > 0 ? (decimal)cancelledCurrent / totalCurrent * 100 : 0;
            decimal cancelledRatePrevious = totalPrevious > 0 ? (decimal)cancelledPrevious / totalPrevious * 100 : 0;

            decimal aovCurrent = completedOrdersCurrent > 0 ? totalRevenueCurrent / completedOrdersCurrent : 0;
            decimal aovPrevious = completedOrdersPrevious > 0 ? totalRevenuePrevious / completedOrdersPrevious : 0;

            var slaThreshold = now.AddHours(-24);
            int pendingOverSlaCount = await _context.Orders
                .Where(o => o.Orderstatus == "Pending" && o.Orderdate != null && o.Orderdate < slaThreshold)
                .CountAsync();

            return Ok(new KpiResponseDto(
                totalRevenueCurrent,
                totalRevenuePrevious,
                completedOrdersCurrent,
                completedOrdersPrevious,
                Math.Round(cancelledRateCurrent, 2),
                Math.Round(cancelledRatePrevious, 2),
                Math.Round(aovCurrent, 2),
                Math.Round(aovPrevious, 2),
                pendingOverSlaCount
            ));
        }

        [HttpGet("top-products")]
        public async Task<ActionResult<IEnumerable<TopProductDto>>> GetTopProducts([FromQuery] string period = "7d", [FromQuery] int limit = 5)
        {
            if (period != "7d" && period != "30d")
            {
                return BadRequest(new ApiErrorDto("Period không hợp lệ", null));
            }

            var (currentStart, _) = GetDateRanges(period);
            var now = DateTime.Now;

            var rawData = await _context.Orderitems
                .Where(oi => oi.Order != null && oi.Order.Orderstatus == "Completed" && oi.Order.Orderdate != null && oi.Order.Orderdate >= currentStart && oi.Order.Orderdate <= now)
                .Where(oi => oi.ImeiNavigation != null && oi.ImeiNavigation.Variant != null && oi.ImeiNavigation.Variant.Product != null)
                .Select(oi => new {
                    oi.ImeiNavigation.Variant.Product.Productid,
                    oi.ImeiNavigation.Variant.Product.Productname,
                    oi.Sellingprice
                })
                .ToListAsync();

            var topProducts = rawData
                .GroupBy(x => new { x.Productid, x.Productname })
                .Select(g => new TopProductDto(
                    g.Key.Productid,
                    g.Key.Productname,
                    g.Count(),
                    g.Sum(x => x.Sellingprice)
                ))
                .OrderByDescending(p => p.UnitsSold)
                .Take(limit)
                .ToList();

            return Ok(topProducts);
        }

        [HttpGet("order-status-distribution")]
        public async Task<ActionResult<IEnumerable<OrderStatusDistributionDto>>> GetOrderStatusDistribution([FromQuery] string period = "7d")
        {
            if (period != "7d" && period != "30d")
            {
                return BadRequest(new ApiErrorDto("Period không hợp lệ", null));
            }

            var (currentStart, _) = GetDateRanges(period);
            var now = DateTime.Now;

            var distribution = await _context.Orders
                .Where(o => o.Orderdate != null && o.Orderdate >= currentStart && o.Orderdate <= now)
                .GroupBy(o => o.Orderstatus)
                .Select(g => new OrderStatusDistributionDto(g.Key ?? "Unknown", g.Count()))
                .ToListAsync();

            return Ok(distribution);
        }
    }
}
