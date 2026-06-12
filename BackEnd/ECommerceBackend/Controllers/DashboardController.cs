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
    [Authorize(Roles = "Admin,Manager")]
    public class DashboardController : ControllerBase
    {
        private readonly ECommerceContext _context;

        public DashboardController(ECommerceContext context)
        {
            _context = context;
        }

        private (DateTime start, DateTime end) GetPeriodRanges(string period)
        {
            var today = DateTime.Today;
            DateTime start = today;
            DateTime end = today.AddDays(1);

            switch (period.ToLower())
            {
                case "today":
                    start = today;
                    end = today.AddDays(1);
                    break;
                case "yesterday":
                    start = today.AddDays(-1);
                    end = today;
                    break;
                case "7d":
                    start = today.AddDays(-6);
                    end = today.AddDays(1);
                    break;
                case "30d":
                    start = today.AddDays(-29);
                    end = today.AddDays(1);
                    break;
                case "this_month":
                default:
                    start = new DateTime(today.Year, today.Month, 1);
                    end = today.AddDays(1);
                    break;
            }

            return (start, end);
        }

        [HttpGet("today-results")]
        public async Task<ActionResult<TodaySalesResultsDto>> GetTodayResults()
        {
            var today = DateTime.Today;
            var tomorrow = today.AddDays(1);
            var yesterday = today.AddDays(-1);
            var sameDayLastMonth = today.AddMonths(-1);
            var sameDayLastMonthNext = sameDayLastMonth.AddDays(1);

            var orders = await _context.Orders
                .Where(o => o.Orderdate != null && o.Orderdate >= sameDayLastMonth && o.Orderdate < tomorrow)
                .Select(o => new { o.Orderdate, o.Orderstatus, o.Finalamount })
                .ToListAsync();

            var todayOrders = orders.Where(o => o.Orderdate >= today && o.Orderdate < tomorrow).ToList();
            var yesterdayOrders = orders.Where(o => o.Orderdate >= yesterday && o.Orderdate < today).ToList();
            var lastMonthOrders = orders.Where(o => o.Orderdate >= sameDayLastMonth && o.Orderdate < sameDayLastMonthNext).ToList();

            var completedToday = todayOrders.Where(o => o.Orderstatus == "Completed").ToList();
            var completedYesterday = yesterdayOrders.Where(o => o.Orderstatus == "Completed").ToList();
            var completedLastMonth = lastMonthOrders.Where(o => o.Orderstatus == "Completed").ToList();

            decimal revenueToday = completedToday.Sum(o => o.Finalamount);
            decimal revenueYesterday = completedYesterday.Sum(o => o.Finalamount);
            decimal revenueLastMonth = completedLastMonth.Sum(o => o.Finalamount);

            int invoicesToday = completedToday.Count;
            int returnsToday = todayOrders.Count(o => o.Orderstatus == "Cancelled");

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
                .Where(o => o.Orderstatus == "Completed" && o.Orderdate != null && o.Orderdate >= start && o.Orderdate < end)
                .Select(o => new { o.Orderdate, o.Finalamount })
                .ToListAsync();

            var result = new List<RevenueBreakdownItemDto>();

            if (groupBy.ToLower() == "hour")
            {
                // Group by hour of the day (00h to 23h)
                for (int h = 0; h < 24; h++)
                {
                    decimal hourlyRev = orders.Where(o => o.Orderdate!.Value.Hour == h).Sum(o => o.Finalamount);
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
                    decimal dayRev = orders.Where(o => o.Orderdate!.Value.DayOfWeek == d).Sum(o => o.Finalamount);
                    result.Add(new RevenueBreakdownItemDto(label, dayRev));
                }
            }
            else
            {
                // Group by date (day)
                int totalDays = (int)(end - start).TotalDays;
                for (int i = 0; i < totalDays; i++)
                {
                    var date = start.AddDays(i);
                    decimal dateRev = orders.Where(o => o.Orderdate!.Value.Date == date.Date).Sum(o => o.Finalamount);
                    result.Add(new RevenueBreakdownItemDto(date.ToString("dd/MM"), dateRev));
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
                        o.Orderdate ?? DateTime.Now,
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
                        l.Createdat ?? DateTime.Now,
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
                .Where(oi => oi.Order != null && oi.Order.Orderstatus == "Completed" && oi.Order.Orderdate != null && oi.Order.Orderdate >= start && oi.Order.Orderdate < end)
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
                .Where(o => o.Orderstatus == "Completed" && o.Orderdate != null && o.Orderdate >= start && o.Orderdate < end && o.Customer != null)
                .ToListAsync();

            var topCustomers = rawData
                .GroupBy(o => o.Customer)
                .Select(g => new TopCustomerDto(
                    g.Key!.Customerid,
                    g.Key.Fullname,
                    g.Key.Phone,
                    g.Sum(o => o.Finalamount),
                    g.Count()
                ))
                .OrderByDescending(c => c.TotalSpent)
                .Take(limit)
                .ToList();

            return Ok(topCustomers);
        }
    }
}
