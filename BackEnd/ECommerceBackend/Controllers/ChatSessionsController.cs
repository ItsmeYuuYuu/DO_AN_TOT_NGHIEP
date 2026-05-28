using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ECommerceBackend.Models;
using ECommerceBackend.DTOs.Chats;
using ECommerceBackend.DTOs.Common;
using ECommerceBackend.Services.Chat;
using Microsoft.AspNetCore.Authorization;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace ECommerceBackend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ChatSessionsController : ControllerBase
    {
        private readonly ECommerceContext _context;
        private readonly IChatOrchestratorService _chatOrchestrator;

        public ChatSessionsController(ECommerceContext context, IChatOrchestratorService chatOrchestrator)
        {
            _context = context;
            _chatOrchestrator = chatOrchestrator;
        }

        private async Task<int?> GetCurrentCustomerIdAsync()
        {
            var userIdClaim = User.FindFirst("userid")?.Value;
            if (string.IsNullOrEmpty(userIdClaim)) return null;

            var dbUser = await _context.Users.FindAsync(int.Parse(userIdClaim));
            if (dbUser == null) return null;

            if (!string.IsNullOrEmpty(dbUser.Email))
            {
                var custByEmail = await _context.Customers.FirstOrDefaultAsync(c => c.Email == dbUser.Email);
                if (custByEmail != null) return custByEmail.Customerid;
            }

            if (!string.IsNullOrEmpty(dbUser.Phone))
            {
                var custByPhone = await _context.Customers.FirstOrDefaultAsync(c => c.Phone == dbUser.Phone);
                if (custByPhone != null) return custByPhone.Customerid;
            }

            if (string.IsNullOrEmpty(dbUser.Email) && string.IsNullOrEmpty(dbUser.Phone)) return null;

            var newCustomer = new Customer
            {
                Fullname = dbUser.Fullname,
                Email = dbUser.Email,
                Phone = dbUser.Phone ?? string.Empty,
                Createdat = DateTime.UtcNow
            };
            _context.Customers.Add(newCustomer);
            await _context.SaveChangesAsync();
            return newCustomer.Customerid;
        }

        private string? GetGuestToken()
        {
            if (Request.Headers.TryGetValue("x-guest-session-token", out var token))
            {
                return token.ToString();
            }
            return null;
        }

        private async Task<bool> IsOwnerAsync(Chatsession session)
        {
            var customerId = await GetCurrentCustomerIdAsync();
            if (customerId.HasValue)
            {
                return session.Customerid == customerId.Value;
            }

            var guestToken = GetGuestToken();
            if (!string.IsNullOrEmpty(guestToken))
            {
                return session.Guestsessiontoken == guestToken;
            }

            return false;
        }

        private static ChatSessionDto MapToDto(Chatsession s) => new ChatSessionDto(
            s.Sessionid,
            s.Customerid,
            s.Guestsessiontoken,
            s.Starttime,
            s.Endtime,
            s.Status,
            s.Status ?? "Cuộc hội thoại mới"
        );

        private static ChatMessageDto MapMessageToDto(Chatmessage m) => new ChatMessageDto(
            m.Messageid,
            m.Sessionid,
            m.Sendertype,
            m.Messagecontent,
            m.Sentat
        );

        [HttpGet("my")]
        public async Task<ActionResult<IEnumerable<ChatSessionDto>>> GetMySessions()
        {
            var customerId = await GetCurrentCustomerIdAsync();
            var guestToken = GetGuestToken();

            IQueryable<Chatsession> query = _context.Chatsessions;

            if (customerId.HasValue)
            {
                query = query.Where(s => s.Customerid == customerId.Value);
            }
            else if (!string.IsNullOrEmpty(guestToken))
            {
                query = query.Where(s => s.Guestsessiontoken == guestToken);
            }
            else
            {
                return Unauthorized(new ApiErrorDto("Không xác định được danh tính người dùng hoặc guest token.", null));
            }

            var sessions = await query.OrderByDescending(s => s.Starttime).ToListAsync();
            return Ok(sessions.Select(MapToDto));
        }

        [HttpPost]
        public async Task<ActionResult<ChatSessionDto>> PostChatSession([FromBody] CreateChatSessionRequestDto dto)
        {
            var customerId = await GetCurrentCustomerIdAsync();
            string? guestToken = null;

            if (!customerId.HasValue)
            {
                guestToken = GetGuestToken();
                if (string.IsNullOrEmpty(guestToken))
                {
                    guestToken = Guid.NewGuid().ToString();
                }
            }

            var session = new Chatsession
            {
                Customerid = customerId,
                Guestsessiontoken = guestToken,
                Starttime = DateTime.UtcNow,
                Status = string.IsNullOrEmpty(dto.Title) ? "Cuộc hội thoại mới" : dto.Title
            };

            _context.Chatsessions.Add(session);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetChatSession), new { id = session.Sessionid }, MapToDto(session));
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<ChatSessionDto>> GetChatSession(int id)
        {
            var session = await _context.Chatsessions.FindAsync(id);
            if (session == null) return NotFound(new ApiErrorDto("Session không tồn tại.", null));
            if (!await IsOwnerAsync(session)) return StatusCode(403, new ApiErrorDto("Bạn không có quyền xem session này.", null));

            return Ok(MapToDto(session));
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> PutChatSession(int id, [FromBody] UpdateChatSessionRequestDto dto)
        {
            var session = await _context.Chatsessions.FindAsync(id);
            if (session == null) return NotFound(new ApiErrorDto("Session không tồn tại.", null));
            if (!await IsOwnerAsync(session)) return StatusCode(403, new ApiErrorDto("Bạn không có quyền sửa session này.", null));

            session.Status = dto.Title; // Map Title to Status

            try { await _context.SaveChangesAsync(); }
            catch (DbUpdateConcurrencyException)
            {
                if (!_context.Chatsessions.Any(e => e.Sessionid == id)) return NotFound(new ApiErrorDto("Session không tồn tại.", null));
                throw;
            }

            return Ok(MapToDto(session));
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteChatSession(int id)
        {
            var session = await _context.Chatsessions.FindAsync(id);
            if (session == null) return NotFound(new ApiErrorDto("Session không tồn tại.", null));
            if (!await IsOwnerAsync(session)) return StatusCode(403, new ApiErrorDto("Bạn không có quyền xóa session này.", null));

            _context.Chatsessions.Remove(session);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        [HttpGet("{id}/messages")]
        public async Task<ActionResult<IEnumerable<ChatMessageDto>>> GetChatMessages(int id)
        {
            var session = await _context.Chatsessions.FindAsync(id);
            if (session == null) return NotFound(new ApiErrorDto("Session không tồn tại.", null));
            if (!await IsOwnerAsync(session)) return StatusCode(403, new ApiErrorDto("Bạn không có quyền xem tin nhắn của session này.", null));

            var messages = await _context.Chatmessages
                .Where(m => m.Sessionid == id)
                .OrderBy(m => m.Sentat)
                .ToListAsync();

            return Ok(messages.Select(MapMessageToDto));
        }

        [HttpPost("{id}/messages")]
        public async Task<ActionResult<ChatMessageDto>> PostChatMessage(int id, [FromBody] CreateChatMessageRequestDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Messagecontent) || dto.Messagecontent.Length > 2000)
            {
                return BadRequest(new ApiErrorDto("Nội dung tin nhắn không hợp lệ.", null));
            }

            var session = await _context.Chatsessions.FindAsync(id);
            if (session == null) return NotFound(new ApiErrorDto("Session không tồn tại.", null));
            if (!await IsOwnerAsync(session)) return StatusCode(403, new ApiErrorDto("Bạn không có quyền gửi tin nhắn vào session này.", null));

            var result = await _chatOrchestrator.ProcessUserMessageAsync(session, dto.Messagecontent);

            return Ok(result);
        }
    }
}
