using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ECommerceBackend.Models;
using ECommerceBackend.DTOs.Customers;
using ECommerceBackend.DTOs.Common;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using System;

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
            c.Customerid,
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

        // GET: api/Customers
        [HttpGet]
        [Authorize(Roles = "Admin,Manager,Sales,Warranty,Consultant")]
        public async Task<ActionResult<IEnumerable<CustomerDto>>> GetCustomers()
        {
            var customerRoleIds = await GetCustomerRoleIdsAsync();

            var nonCustomerUsers = await _context.Users
                .AsNoTracking()
                .Where(user => !user.Roleid.HasValue || !customerRoleIds.Contains(user.Roleid.Value))
                .Select(user => new { user.Email, user.Phone })
                .ToListAsync();

            var customerUsers = await _context.Users
                .AsNoTracking()
                .Where(user => user.Roleid.HasValue && customerRoleIds.Contains(user.Roleid.Value))
                .Select(user => new { user.Userid, user.Email, user.Phone, user.Isactive })
                .ToListAsync();

            var internalEmails = nonCustomerUsers
                .Where(user => !string.IsNullOrWhiteSpace(user.Email))
                .Select(user => user.Email!.Trim().ToLowerInvariant())
                .ToHashSet();
            var internalPhones = nonCustomerUsers
                .Where(user => !string.IsNullOrWhiteSpace(user.Phone))
                .Select(user => user.Phone!.Trim())
                .ToHashSet();

            var customers = await _context.Customers
                .AsNoTracking()
                .OrderByDescending(customer => customer.Createdat ?? DateTime.MinValue)
                .ThenByDescending(customer => customer.Customerid)
                .ToListAsync();

            var visibleCustomers = customers.Where(customer =>
            {
                var email = NormalizeEmail(customer.Email);
                var phone = NormalizePhone(customer.Phone);
                var matchesInternalEmail = !string.IsNullOrWhiteSpace(email) && internalEmails.Contains(email);
                var matchesInternalPhone = !string.IsNullOrWhiteSpace(phone) && internalPhones.Contains(phone);
                return !matchesInternalEmail && !matchesInternalPhone;
            }).ToList();

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

            return Ok(visibleCustomers.Select(customer => MapToDto(customer, FindLinkedAccount(customer))));
        }

        // GET: api/Customers/5
        [HttpGet("{id}")]
        [Authorize]
        public async Task<ActionResult<CustomerDto>> GetCustomer(int id)
        {
            var customer = await _context.Customers.FindAsync(id);
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

        // POST: api/Customers
        [HttpPost]
        [Authorize(Roles = "Admin,Manager,Sales")]
        public async Task<ActionResult<CustomerDto>> PostCustomer([FromBody] CreateCustomerRequestDto dto)
        {
            var customer = new Customer
            {
                Fullname = dto.Fullname,
                Phone = dto.Phone,
                Email = dto.Email,
                Address = dto.Address,
                Createdat = DateTime.UtcNow
            };

            _context.Customers.Add(customer);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetCustomer), new { id = customer.Customerid }, MapToDto(customer));
        }

        // PUT: api/Customers/5
        [HttpPut("{id}")]
        [Authorize]
        public async Task<IActionResult> PutCustomer(int id, [FromBody] UpdateCustomerRequestDto dto)
        {
            var customer = await _context.Customers.FindAsync(id);
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
                if (!_context.Customers.Any(e => e.Customerid == id)) return NotFound();
                throw;
            }

            var account = await FindLinkedCustomerAccountAsync(customer);
            return Ok(MapToDto(customer, account));
        }

        // PATCH: api/Customers/5/account-status
        [HttpPatch("{id}/account-status")]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<IActionResult> UpdateCustomerAccountStatus(int id, [FromBody] UpdateCustomerAccountStatusDto dto)
        {
            var customer = await _context.Customers.FindAsync(id);
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
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteCustomer(int id)
        {
            var customer = await _context.Customers.FindAsync(id);
            if (customer == null) return NotFound();

            _context.Customers.Remove(customer);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
