using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ECommerceBackend.Models;
using ECommerceBackend.DTOs.Customers;
using ECommerceBackend.DTOs.Common;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using System;
using ECommerceBackend.Authorization;

namespace ECommerceBackend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class CustomersController : ControllerBase
    {
        private readonly ECommerceContext _context;

        public CustomersController(ECommerceContext context) => _context = context;

        private static string? NormalizeEmail(string? email) =>
            string.IsNullOrWhiteSpace(email) ? null : email.Trim().ToLowerInvariant();

        private static string? NormalizePhone(string? phone) =>
            string.IsNullOrWhiteSpace(phone) ? null : phone.Trim();

        private static CustomerDto MapToDto(Customer c, User? account = null) => new CustomerDto(
            c.Publicid,
            c.Fullname,
            c.Phone,
            c.Email,
            c.Address,
            c.Createdat,
            account?.Userid,
            account?.Isactive
        );

        private async Task<List<int>> GetCustomerRoleIdsAsync() =>
            await _context.Roles
                .AsNoTracking()
                .Where(role => role.Rolename == "Customer")
                .Select(role => role.Roleid)
                .ToListAsync();

        private async Task<User?> FindLinkedCustomerAccountAsync(Customer customer, bool track = false)
        {
            var customerRoleIds = await GetCustomerRoleIdsAsync();
            if (customerRoleIds.Count == 0)
                return null;

            var email = NormalizeEmail(customer.Email);
            var phone = NormalizePhone(customer.Phone);

            if (email == null && phone == null)
                return null;

            IQueryable<User> query = _context.Users
                .Where(user => user.Roleid.HasValue && customerRoleIds.Contains(user.Roleid.Value));

            if (!track)
                query = query.AsNoTracking();

            return await query.FirstOrDefaultAsync(user =>
                (email != null && user.Email != null && user.Email.ToLower() == email) ||
                (phone != null && user.Phone == phone));
        }

        public record CustomerSummaryDto(
            int Total,
            int ActiveAccounts,
            int DisabledAccounts,
            int GuestProfiles
        );

        [HttpGet("summary")]
        [HasPermission(AppPermissions.CustomersView)]
        public async Task<ActionResult<CustomerSummaryDto>> GetCustomerSummary()
        {
            var customerRoleIds = await GetCustomerRoleIdsAsync();
            var customerQuery = _context.Customers.AsNoTracking().Where(customer => !_context.Users.Any(user =>
                (!user.Roleid.HasValue || !customerRoleIds.Contains(user.Roleid.Value)) &&
                ((customer.Email != null && user.Email != null && customer.Email.ToLower() == user.Email.ToLower()) ||
                 (customer.Phone != null && user.Phone != null && customer.Phone == user.Phone))));

            var total = await customerQuery.CountAsync();
            var allCustomerEmails = await customerQuery.Where(c => c.Email != null).Select(c => c.Email!.ToLower()).ToListAsync();
            var allCustomerPhones = await customerQuery.Where(c => c.Phone != null).Select(c => c.Phone!).ToListAsync();

            var users = await _context.Users.AsNoTracking()
                .Where(u => u.Roleid.HasValue && customerRoleIds.Contains(u.Roleid.Value))
                .Where(u => (u.Email != null && allCustomerEmails.Contains(u.Email.ToLower())) ||
                            (u.Phone != null && allCustomerPhones.Contains(u.Phone)))
                .Select(u => new { u.Email, u.Phone, u.Isactive })
                .ToListAsync();

            var activeUsers = users.Count(u => u.Isactive == true);
            var disabledUsers = users.Count(u => u.Isactive == false);
            var withAccount = users.Count;
            var guestProfiles = Math.Max(0, total - withAccount);

            return Ok(new CustomerSummaryDto(total, activeUsers, disabledUsers, guestProfiles));
        }

        // GET: api/Customers
        [HttpGet]
        [HasPermission(AppPermissions.CustomersView)]
        public async Task<ActionResult<PagedResultDto<CustomerDto>>> GetCustomers(
            [FromQuery] string? query = null,
            [FromQuery] string? accountType = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10)
        {
            page = Math.Max(1, page);
            pageSize = Math.Clamp(pageSize, 5, 100);
            var customerRoleIds = await GetCustomerRoleIdsAsync();
            var customerQuery = _context.Customers.AsNoTracking().AsQueryable();

            customerQuery = customerQuery.Where(customer => !_context.Users.Any(user =>
                (!user.Roleid.HasValue || !customerRoleIds.Contains(user.Roleid.Value)) &&
                ((customer.Email != null && user.Email != null && customer.Email.ToLower() == user.Email.ToLower()) ||
                 (customer.Phone != null && user.Phone != null && customer.Phone == user.Phone))));

            if (accountType == "active")
            {
                customerQuery = customerQuery.Where(c => _context.Users.Any(u =>
                    u.Roleid.HasValue && customerRoleIds.Contains(u.Roleid.Value) && u.Isactive == true &&
                    ((c.Email != null && u.Email != null && c.Email.ToLower() == u.Email.ToLower()) ||
                     (c.Phone != null && u.Phone != null && c.Phone == u.Phone))));
            }
            else if (accountType == "disabled")
            {
                customerQuery = customerQuery.Where(c => _context.Users.Any(u =>
                    u.Roleid.HasValue && customerRoleIds.Contains(u.Roleid.Value) && u.Isactive == false &&
                    ((c.Email != null && u.Email != null && c.Email.ToLower() == u.Email.ToLower()) ||
                     (c.Phone != null && u.Phone != null && c.Phone == u.Phone))));
            }
            else if (accountType == "guest")
            {
                customerQuery = customerQuery.Where(c => !_context.Users.Any(u =>
                    u.Roleid.HasValue && customerRoleIds.Contains(u.Roleid.Value) &&
                    ((c.Email != null && u.Email != null && c.Email.ToLower() == u.Email.ToLower()) ||
                     (c.Phone != null && u.Phone != null && c.Phone == u.Phone))));
            }

            var keyword = query?.Trim().ToLowerInvariant();
            if (!string.IsNullOrWhiteSpace(keyword))
            {
                customerQuery = customerQuery.Where(customer =>
                    customer.Fullname.ToLower().Contains(keyword) ||
                    (customer.Email != null && customer.Email.ToLower().Contains(keyword)) ||
                    (customer.Phone != null && customer.Phone.Contains(keyword)));
            }

            var totalCount = await customerQuery.CountAsync();
            var customers = await customerQuery
                .OrderByDescending(customer => customer.Createdat ?? DateTime.MinValue)
                .ThenByDescending(customer => customer.Customerid)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var pageEmails = customers.Where(item => item.Email != null).Select(item => item.Email!.ToLower()).ToList();
            var pagePhones = customers.Where(item => item.Phone != null).Select(item => item.Phone!).ToList();
            var customerUsers = await _context.Users.AsNoTracking()
                .Where(user => user.Roleid.HasValue && customerRoleIds.Contains(user.Roleid.Value))
                .Where(user => (user.Email != null && pageEmails.Contains(user.Email.ToLower())) ||
                               (user.Phone != null && pagePhones.Contains(user.Phone)))
                .Select(user => new { user.Userid, user.Email, user.Phone, user.Isactive })
                .ToListAsync();

            User? FindLinkedAccount(Customer customer)
            {
                var email = NormalizeEmail(customer.Email);
                var phone = NormalizePhone(customer.Phone);
                var match = customerUsers.FirstOrDefault(user =>
                    (!string.IsNullOrWhiteSpace(email) && NormalizeEmail(user.Email) == email) ||
                    (!string.IsNullOrWhiteSpace(phone) && NormalizePhone(user.Phone) == phone));

                return match == null
                    ? null
                    : new User
                    {
                        Userid = match.Userid,
                        Email = match.Email,
                        Phone = match.Phone,
                        Isactive = match.Isactive
                    };
            }

            return Ok(new PagedResultDto<CustomerDto>
            {
                Items = customers.Select(customer => MapToDto(customer, FindLinkedAccount(customer))),
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize
            });
        }

        // GET: api/Customers/5
        [HttpGet("{id}")]
        [Authorize]
        public async Task<ActionResult<CustomerDto>> GetCustomer(Guid id)
        {
            var customer = await _context.Customers.FirstOrDefaultAsync(item => item.Publicid == id);
            if (customer == null) return NotFound();

            var isPrivilegedEmployee =
                User.IsInRole("Admin") ||
                User.IsInRole("Manager") ||
                User.IsInRole("Sales") ||
                User.IsInRole("Warranty") ||
                User.IsInRole("Consultant");
            if (!isPrivilegedEmployee)
            {
                var claimUserId = User.FindFirst("userid")?.Value;
                if (string.IsNullOrEmpty(claimUserId)) return Forbid();

                var dbUser = await _context.Users.FindAsync(int.Parse(claimUserId));
                if (dbUser == null) return Forbid();

                // Match by Email or Phone to prove identity ownership
                bool matchesEmail = !string.IsNullOrEmpty(dbUser.Email) && 
                                    string.Equals(dbUser.Email, customer.Email, StringComparison.OrdinalIgnoreCase);
                bool matchesPhone = !string.IsNullOrEmpty(dbUser.Phone) && 
                                    string.Equals(dbUser.Phone, customer.Phone);

                if (!matchesEmail && !matchesPhone) return Forbid();
            }

            var account = await FindLinkedCustomerAccountAsync(customer);
            return Ok(MapToDto(customer, account));
        }

        // PUT: api/Customers/5
        [HttpPut("{id}")]
        [Authorize]
        public async Task<IActionResult> PutCustomer(Guid id, [FromBody] UpdateCustomerRequestDto dto)
        {
            var customer = await _context.Customers.FirstOrDefaultAsync(item => item.Publicid == id);
            if (customer == null) return NotFound();

            var isPrivilegedEmployee =
                User.IsInRole("Admin") ||
                User.IsInRole("Manager") ||
                User.IsInRole("Sales");
            if (!isPrivilegedEmployee)
            {
                var claimUserId = User.FindFirst("userid")?.Value;
                if (string.IsNullOrEmpty(claimUserId)) return Forbid();

                var dbUser = await _context.Users.FindAsync(int.Parse(claimUserId));
                if (dbUser == null) return Forbid();

                // Match by Email or Phone to prove identity ownership
                bool matchesEmail = !string.IsNullOrEmpty(dbUser.Email) && 
                                    string.Equals(dbUser.Email, customer.Email, StringComparison.OrdinalIgnoreCase);
                bool matchesPhone = !string.IsNullOrEmpty(dbUser.Phone) && 
                                    string.Equals(dbUser.Phone, customer.Phone);

                if (!matchesEmail && !matchesPhone) return Forbid();
            }

            customer.Fullname = dto.Fullname;
            customer.Phone = dto.Phone;
            customer.Email = dto.Email;
            customer.Address = dto.Address;

            try { await _context.SaveChangesAsync(); }
            catch (DbUpdateConcurrencyException)
            {
                if (!_context.Customers.Any(e => e.Publicid == id)) return NotFound();
                throw;
            }

            var account = await FindLinkedCustomerAccountAsync(customer);
            return Ok(MapToDto(customer, account));
        }

        // PATCH: api/Customers/5/account-status
        [HttpPatch("{id}/account-status")]
        [HasPermission(AppPermissions.CustomersManageAccount)]
        public async Task<IActionResult> UpdateCustomerAccountStatus(Guid id, [FromBody] UpdateCustomerAccountStatusDto dto)
        {
            var customer = await _context.Customers.FirstOrDefaultAsync(item => item.Publicid == id);
            if (customer == null) return NotFound();

            var account = await FindLinkedCustomerAccountAsync(customer, track: true);
            if (account == null)
            {
                return BadRequest(new ApiErrorDto(
                    "Khách hàng này chưa có tài khoản đăng nhập để khóa hoặc mở khóa.",
                    null));
            }

            account.Isactive = dto.Isactive;
            await _context.SaveChangesAsync();

            return Ok(MapToDto(customer, account));
        }

        // DELETE: api/Customers/5
        [HttpDelete("{id}")]
        [HasPermission(AppPermissions.CustomersManageAccount)]
        public async Task<IActionResult> DeleteCustomer(Guid id)
        {
            var customer = await _context.Customers.FirstOrDefaultAsync(item => item.Publicid == id);
            if (customer == null) return NotFound();

            _context.Customers.Remove(customer);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
