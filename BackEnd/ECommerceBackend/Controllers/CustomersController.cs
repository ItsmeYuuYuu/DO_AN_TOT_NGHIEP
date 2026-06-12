using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ECommerceBackend.Models;
using ECommerceBackend.DTOs.Customers;
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

        private static CustomerDto MapToDto(Customer c) => new CustomerDto(
            c.Customerid,
            c.Fullname,
            c.Phone,
            c.Email,
            c.Address,
            c.Createdat
        );

        // GET: api/Customers
        [HttpGet]
        [Authorize(Roles = "Admin,Manager,Sales,Warranty,Consultant")]
        public async Task<ActionResult<IEnumerable<CustomerDto>>> GetCustomers()
        {
            var customers = await _context.Customers.ToListAsync();
            return Ok(customers.Select(MapToDto));
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

            return Ok(MapToDto(customer));
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

            return Ok(MapToDto(customer));
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
