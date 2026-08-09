using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ECommerceBackend.Models;
using ECommerceBackend.DTOs.Dashboard;
using ECommerceBackend.DTOs.Common;
using Microsoft.AspNetCore.Authorization;
using ECommerceBackend.Time;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace ECommerceBackend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [ECommerceBackend.Authorization.HasPermission(ECommerceBackend.Authorization.AppPermissions.DashboardView)]
    public class DashboardController : ControllerBase
    {
        private readonly ECommerceContext _context;

        public DashboardController(ECommerceContext context)
        {
            _context = context;
        }

        private (DateTime start, DateTime end) GetPeriodRanges(string period)
        {
            var today = VietnamTime.Today;
            DateTime localStart = today;
            DateTime localEnd = today.AddDays(1);

            switch (period.ToLower())
            {
                case "today":
                    localStart = today;
                    localEnd = today.AddDays(1);
                    break;
                case "yesterday":
                    localStart = today.AddDays(-1);
                    localEnd = today;
                    break;
                case "7d":
                    localStart = today.AddDays(-6);
                    localEnd = today.AddDays(1);
                    break;
                case "30d":
                    localStart = today.AddDays(-29);
                    localEnd = today.AddDays(1);
                    break;
                case "this_month":
                default:
                    localStart = new DateTime(today.Year, today.Month, 1);
                    localEnd = today.AddDays(1);
                    break;
            }

            return (VietnamTime.ToUtc(localStart), VietnamTime.ToUtc(localEnd));
        }

        [HttpGet("today-results")]
        public async Task<ActionResult<TodaySalesResultsDto>> GetTodayResults([FromQuery] string period = "30d")
        {
            var (today, tomorrow) = GetPeriodRanges(period);
            var periodLength = tomorrow - today;
            var yesterday = today - periodLength;
            var sameDayLastMonth = yesterday;
            var sameDayLastMonthNext = today;

            var orders = await _context.Orders
                .Where(o => o.Orderdate != null && o.Orderdate >= yesterday && o.Orderdate < tomorrow)
                .Select(o => new { o.Orderdate, o.Orderstatus, o.Finalamount, o.Paidamount, o.Paymentstatus })
                .ToListAsync();

            var todayOrders = orders.Where(o => o.Orderdate >= today && o.Orderdate < tomorrow).ToList();
            var yesterdayOrders = orders.Where(o => o.Orderdate >= yesterday && o.Orderdate < today).ToList();
            var lastMonthOrders = orders.Where(o => o.Orderdate >= sameDayLastMonth && o.Orderdate < sameDayLastMonthNext).ToList();

            decimal revenueToday = todayOrders.Where(o => o.Orderstatus == "Completed").Sum(o => o.Paidamount ?? o.Finalamount);
            decimal revenueYesterday = yesterdayOrders.Where(o => o.Orderstatus == "Completed").Sum(o => o.Paidamount ?? o.Finalamount);
            decimal revenueLastMonth = lastMonthOrders.Where(o => o.Orderstatus == "Completed").Sum(o => o.Paidamount ?? o.Finalamount);

            int invoicesToday = todayOrders.Count(o => o.Orderstatus == "Completed");
            int returnsToday = todayOrders.Count(o => o.Orderstatus is "Cancelled" or "Returned");

            decimal changeVsYesterday = 0;
            if (revenueYesterday > 0)
            {
                changeVsYesterday = Math.Round((revenueToday - revenueYesterday) / revenueYesterday * 100, 2);
            }
            else if (revenueToday > 0)
            {
                changeVsYesterday = 100;
            }

            decimal changeVsLastMonth = 0;
            if (revenueLastMonth > 0)
            {
                changeVsLastMonth = Math.Round((revenueToday - revenueLastMonth) / revenueLastMonth * 100, 2);
            }
            else if (revenueToday > 0)
            {
                changeVsLastMonth = 100;
            }

            return Ok(new TodaySalesResultsDto(
                revenueToday,
                invoicesToday,
                returnsToday,
                revenueYesterday,
                revenueLastMonth,
                changeVsYesterday,
                changeVsLastMonth
            ));
        }

        [HttpGet("revenue-breakdown")]
        public async Task<ActionResult<IEnumerable<RevenueBreakdownItemDto>>> GetRevenueBreakdown(
            [FromQuery] string period = "this_month",
            [FromQuery] string groupBy = "day")
        {
            var (start, end) = GetPeriodRanges(period);

            var orders = await _context.Orders
                .Where(o => (o.Orderstatus == "Completed" || o.Paymentstatus == "Paid" || o.Paymentstatus == "DepositPaid") && o.Orderdate != null && o.Orderdate >= start && o.Orderdate < end)
                .Select(o => new { o.Orderdate, Finalamount = o.Paidamount ?? 0 })
                .ToListAsync();

            var result = new List<RevenueBreakdownItemDto>();

            if (groupBy.ToLower() == "hour")
            {
                // Group by hour of the day (00h to 23h)
                for (int h = 0; h < 24; h++)
                {
                    decimal hourlyRev = orders
                        .Where(o => VietnamTime.FromUtc(o.Orderdate!.Value).Hour == h)
                        .Sum(o => o.Finalamount);
                    result.Add(new RevenueBreakdownItemDto($"{h:D2}h", hourlyRev));
                }
            }
            else if (groupBy.ToLower() == "dayofweek")
            {
                // Group by DayOfWeek in Vietnamese
                var daysOfWeek = new[]
                {
                    (DayOfWeek.Monday, "Thứ 2"),
                    (DayOfWeek.Tuesday, "Thứ 3"),
                    (DayOfWeek.Wednesday, "Thứ 4"),
                    (DayOfWeek.Thursday, "Thứ 5"),
                    (DayOfWeek.Friday, "Thứ 6"),
                    (DayOfWeek.Saturday, "Thứ 7"),
                    (DayOfWeek.Sunday, "Chủ nhật")
                };

                foreach (var (d, label) in daysOfWeek)
                {
                    decimal dayRev = orders
                        .Where(o => VietnamTime.FromUtc(o.Orderdate!.Value).DayOfWeek == d)
                        .Sum(o => o.Finalamount);
                    result.Add(new RevenueBreakdownItemDto(label, dayRev));
                }
            }
            else
            {
                // Group by date (day)
                int totalDays = (int)(end - start).TotalDays;
                for (int i = 0; i < totalDays; i++)
                {
                    var utcDateStart = start.AddDays(i);
                    var vietnamDate = VietnamTime.FromUtc(utcDateStart).Date;
                    decimal dateRev = orders
                        .Where(o => VietnamTime.FromUtc(o.Orderdate!.Value).Date == vietnamDate)
                        .Sum(o => o.Finalamount);
                    result.Add(new RevenueBreakdownItemDto(vietnamDate.ToString("dd/MM"), dateRev));
                }
            }

            return Ok(result);
        }

        [HttpGet("recent-activities")]
        public async Task<ActionResult<IEnumerable<RecentActivityDto>>> GetRecentActivities(
            [FromQuery] string type = "all",
            [FromQuery] string q = "",
            [FromQuery] int limit = 10)
        {
            var activities = new List<RecentActivityDto>();
            string query = q.Trim().ToLower();

            // 1. Fetch orders/invoices
            if (type.ToLower() == "all" || type.ToLower() == "invoice" || type.ToLower() == "order")
            {
                var ordersQuery = _context.Orders
                    .Include(o => o.Customer)
                    .Include(o => o.User)
                    .AsQueryable();

                if (type.ToLower() == "invoice")
                {
                    ordersQuery = ordersQuery.Where(o => o.Orderstatus == "Completed");
                }
                else if (type.ToLower() == "order")
                {
                    ordersQuery = ordersQuery.Where(o => o.Orderstatus != "Completed");
                }

                var ordersList = await ordersQuery.ToListAsync();

                foreach (var o in ordersList)
                {
                    string orderCode = $"HD{o.Orderid:D6}";
                    string staffName = o.User?.Fullname ?? "Hệ thống";
                    string customerName = o.Customer?.Fullname ?? "Khách lẻ";

                    // Search filter
                    if (!string.IsNullOrEmpty(query))
                    {
                        bool matches = orderCode.ToLower().Contains(query) ||
                                       customerName.ToLower().Contains(query) ||
                                       staffName.ToLower().Contains(query);
                        if (!matches) continue;
                    }

                    activities.Add(new RecentActivityDto(
                        $"order_{o.Orderid}",
                        $"{staffName} vừa tạo {orderCode}",
                        customerName,
                        o.Orderdate ?? DateTime.UtcNow,
                        o.Orderstatus,
                        o.Finalamount,
                        o.Orderstatus == "Completed" ? "invoice" : "order"
                    ));
                }
            }

            // 2. Fetch inventory audit logs
            if (type.ToLower() == "all" || type.ToLower() == "audit")
            {
                var logsQuery = _context.Auditlogs
                    .Include(l => l.User)
                    .Where(l => l.Tablename == "inventoryitems")
                    .AsQueryable();

                var logsList = await logsQuery.ToListAsync();

                foreach (var l in logsList)
                {
                    string staffName = l.User?.Fullname ?? "Hệ thống";
                    string actionDesc = l.Action ?? "Thao tác kho";

                    if (!string.IsNullOrEmpty(query))
                    {
                        bool matches = actionDesc.ToLower().Contains(query) ||
                                       staffName.ToLower().Contains(query);
                        if (!matches) continue;
                    }

                    activities.Add(new RecentActivityDto(
                        $"audit_{l.Logid}",
                        actionDesc,
                        staffName,
                        l.Createdat ?? DateTime.UtcNow,
                        null,
                        null,
                        "audit"
                    ));
                }
            }

            // Combine and sort
            var sortedList = activities
                .OrderByDescending(a => a.Timestamp)
                .Take(limit)
                .ToList();

            return Ok(sortedList);
        }

        [HttpGet("top-products-v2")]
        public async Task<ActionResult<IEnumerable<TopProductDto>>> GetTopProductsV2(
            [FromQuery] string period = "this_month",
            [FromQuery] int limit = 10)
        {
            var (start, end) = GetPeriodRanges(period);

            var rawData = await _context.Orderitems
                .Where(oi => oi.Order != null && (oi.Order.Orderstatus == "Completed" || oi.Order.Paymentstatus == "Paid" || oi.Order.Paymentstatus == "DepositPaid") && oi.Order.Orderdate != null && oi.Order.Orderdate >= start && oi.Order.Orderdate < end)
                .Where(oi => oi.ImeiNavigation != null && oi.ImeiNavigation.Variant != null && oi.ImeiNavigation.Variant.Product != null)
                .Select(oi => new {
                    oi.ImeiNavigation!.Variant!.Product!.Productid,
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

        [HttpGet("top-customers")]
        public async Task<ActionResult<IEnumerable<TopCustomerDto>>> GetTopCustomers(
            [FromQuery] string period = "this_month",
            [FromQuery] int limit = 10)
        {
            var (start, end) = GetPeriodRanges(period);

            var rawData = await _context.Orders
                .Include(o => o.Customer)
                .Where(o => (o.Orderstatus == "Completed" || o.Paymentstatus == "Paid" || o.Paymentstatus == "DepositPaid") && o.Orderdate != null && o.Orderdate >= start && o.Orderdate < end && o.Customer != null)
                .ToListAsync();

            var topCustomers = rawData
                .GroupBy(o => o.Customer)
                .Select(g => new TopCustomerDto(
                    g.Key!.Customerid,
                    g.Key.Fullname,
                    g.Key.Phone,
                    g.Sum(o => o.Paidamount ?? 0),
                    g.Count()
                ))
                .OrderByDescending(c => c.TotalSpent)
                .Take(limit)
                .ToList();

            return Ok(topCustomers);
        }

        [HttpGet("order-status-distribution")]
        public async Task<ActionResult<IEnumerable<OrderStatusDistributionDto>>> GetOrderStatusDistribution(
            [FromQuery] string period = "7d")
        {
            var (start, end) = GetPeriodRanges(period);

            var rawData = await _context.Orders
                .Where(o => o.Orderdate != null && o.Orderdate >= start && o.Orderdate < end)
                .GroupBy(o => o.Orderstatus)
                .Select(g => new OrderStatusDistributionDto(
                    g.Key ?? "Unknown",
                    g.Count()
                ))
                .ToListAsync();

            return Ok(rawData);
        }
    }
}
