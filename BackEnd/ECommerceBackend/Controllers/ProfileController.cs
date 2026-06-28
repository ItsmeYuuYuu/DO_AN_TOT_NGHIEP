using System.Security.Claims;
using ECommerceBackend.DTOs.Common;
using ECommerceBackend.DTOs.Profile;
using ECommerceBackend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ECommerceBackend.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class ProfileController : ControllerBase
{
    private readonly ECommerceContext _context;

    public ProfileController(ECommerceContext context)
    {
        _context = context;
    }

    private int? CurrentUserId
    {
        get
        {
            var value = User.FindFirstValue("userid")
                ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.TryParse(value, out var userId) ? userId : null;
        }
    }

    private static ProfileDto MapToDto(User user) => new(
        user.Userid,
        user.Username,
        user.Fullname,
        user.Email,
        user.Phone,
        user.Roleid,
        user.Role?.Rolename
    );

    [HttpGet("me")]
    public async Task<ActionResult<ProfileDto>> GetMe()
    {
        var userId = CurrentUserId;
        if (userId == null) return Unauthorized();

        var user = await _context.Users
            .Include(item => item.Role)
            .FirstOrDefaultAsync(item => item.Userid == userId.Value);

        if (user == null) return NotFound();
        return Ok(MapToDto(user));
    }

    [HttpPut("me")]
    public async Task<ActionResult<ProfileDto>> UpdateMe([FromBody] UpdateProfileRequestDto dto)
    {
        var userId = CurrentUserId;
        if (userId == null) return Unauthorized();

        var user = await _context.Users
            .Include(item => item.Role)
            .FirstOrDefaultAsync(item => item.Userid == userId.Value);

        if (user == null) return NotFound();

        var fullname = dto.Fullname.Trim();
        var email = string.IsNullOrWhiteSpace(dto.Email) ? null : dto.Email.Trim().ToLowerInvariant();
        var phone = string.IsNullOrWhiteSpace(dto.Phone) ? null : dto.Phone.Trim();

        if (!string.IsNullOrWhiteSpace(email) && await _context.Users.AnyAsync(item =>
                item.Userid != user.Userid &&
                item.Email != null &&
                item.Email.ToLower() == email))
        {
            return Conflict(new ApiErrorDto("Email đã được sử dụng cho tài khoản khác.", null));
        }

        if (!string.IsNullOrWhiteSpace(phone) && await _context.Users.AnyAsync(item =>
                item.Userid != user.Userid &&
                item.Phone == phone))
        {
            return Conflict(new ApiErrorDto("Số điện thoại đã được sử dụng cho tài khoản khác.", null));
        }

        var oldEmail = user.Email;
        var oldPhone = user.Phone;

        user.Fullname = fullname;
        user.Email = email;
        user.Phone = phone;

        var customer = await _context.Customers.FirstOrDefaultAsync(item =>
            (!string.IsNullOrWhiteSpace(oldPhone) && item.Phone == oldPhone) ||
            (!string.IsNullOrWhiteSpace(oldEmail) && item.Email == oldEmail));

        if (customer != null)
        {
            customer.Fullname = fullname;
            if (!string.IsNullOrWhiteSpace(phone)) customer.Phone = phone;
            customer.Email = email;
        }

        await _context.SaveChangesAsync();
        return Ok(MapToDto(user));
    }
}
