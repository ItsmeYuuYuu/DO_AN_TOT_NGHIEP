using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ECommerceBackend.Models;
using ECommerceBackend.DTOs.Chats;
using ECommerceBackend.DTOs.Common;
using ECommerceBackend.Services.Chat;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.RateLimiting;
using System;
using System.Collections.Generic;
using System.Collections.Concurrent;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace ECommerceBackend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ChatSessionsController : ControllerBase
    {
        private static readonly ConcurrentDictionary<int, SemaphoreSlim> HandoffLocks = new();
        private readonly ECommerceContext _context;
        private readonly IChatOrchestratorService _chatOrchestrator;
        private readonly IChatTypingService _chatTypingService;

        public ChatSessionsController(
            ECommerceContext context,
            IChatOrchestratorService chatOrchestrator,
            IChatTypingService chatTypingService)
        {
            _context = context;
            _chatOrchestrator = chatOrchestrator;
            _chatTypingService = chatTypingService;
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
                Createdat = DateTime.Now
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

        private int? GetCurrentUserId()
        {
            var value = User.FindFirst("userid")?.Value;
            return int.TryParse(value, out var userId) ? userId : null;
        }

        private bool IsConsultationStaff() =>
            User.IsInRole("Admin") ||
            User.IsInRole("Manager") ||
            User.IsInRole("Consultant");

        private bool CanManageHandoff(Chatsession session)
        {
            if (!IsConsultationStaff() || string.IsNullOrEmpty(session.Handoffstatus))
                return false;

            return User.IsInRole("Admin") ||
                User.IsInRole("Manager") ||
                session.Assigneduserid == GetCurrentUserId();
        }

        private static ChatSessionDto MapToDto(Chatsession s) => new ChatSessionDto(
            s.Sessionid,
            s.Customerid,
            s.Guestsessiontoken,
            s.Starttime,
            s.Endtime,
            s.Status,
            s.Status ?? "Cuộc hội thoại mới",
            s.Assigneduserid,
            null,
            s.Handoffstatus,
            s.Handoffrequestedat,
            null
        );

        private async Task<ChatSessionDto> MapToDetailedDtoAsync(Chatsession session)
        {
            var assignedName = session.Assigneduserid.HasValue
                ? await _context.Users
                    .Where(user => user.Userid == session.Assigneduserid.Value)
                    .Select(user => user.Fullname)
                    .FirstOrDefaultAsync()
                : null;
            var customerName = session.Customerid.HasValue
                ? await _context.Customers
                    .Where(customer => customer.Customerid == session.Customerid.Value)
                    .Select(customer => customer.Fullname)
                    .FirstOrDefaultAsync()
                : null;

            return MapToDto(session) with
            {
                Assignedname = assignedName,
                Customername = customerName
            };
        }

        private static string GetVariantName(Productvariant variant)
        {
            if (string.IsNullOrWhiteSpace(variant.Specifications))
                return $"{variant.Condition} - {variant.Sku}".Trim(' ', '-');

            try
            {
                var specifications = System.Text.Json.JsonSerializer
                    .Deserialize<Dictionary<string, string>>(variant.Specifications);
                if (specifications != null)
                {
                    var preferredKeys = new[]
                    {
                        "Màu sắc", "Màu", "Dung lượng RAM", "RAM",
                        "Bộ nhớ trong", "Bộ nhớ", "ROM"
                    };
                    var values = preferredKeys
                        .Where(specifications.ContainsKey)
                        .Select(key => specifications[key])
                        .Distinct()
                        .Take(3)
                        .ToList();
                    if (values.Count > 0)
                        return string.Join(" - ", values.Append(variant.Condition));
                }
            }
            catch (System.Text.Json.JsonException)
            {
                // Fall back to condition and SKU for legacy specification values.
            }

            return $"{variant.Condition} - {variant.Sku}".Trim(' ', '-');
        }

        private static ChatRecommendationDto MapRecommendationToDto(
            Chatproductrecommendation recommendation)
        {
            var variant = recommendation.Variant;
            var imageUrl = variant.Productimages
                .OrderByDescending(image => image.Ismain == true)
                .ThenBy(image => image.Imageid)
                .Select(image => image.Imageurl)
                .FirstOrDefault() ?? string.Empty;

            return new ChatRecommendationDto(
                recommendation.Recommendationid,
                recommendation.Productid,
                recommendation.Product.Slug,
                recommendation.Variantid,
                recommendation.Product.Productname,
                GetVariantName(variant),
                variant.Sku ?? string.Empty,
                imageUrl,
                variant.Saleprice ?? variant.Baseprice,
                variant.Baseprice,
                variant.Inventoryitems.Count(item => item.Status == "InStock"),
                variant.Condition,
                recommendation.Rank,
                recommendation.Addedtocartat,
                recommendation.Orderedat,
                recommendation.Orderid,
                recommendation.Product.Brand?.Brandname ?? "Chưa xác định",
                variant.Specifications ?? "{}");
        }

        private static ChatMessageDto MapMessageToDto(Chatmessage m) => new(
            m.Messageid,
            m.Sessionid,
            m.Sendertype,
            m.Messagecontent,
            m.Sentat,
            m.Chatproductrecommendations
                .OrderBy(item => item.Rank)
                .GroupBy(item => item.Productid)
                .Select(group => group.First())
                .Select(MapRecommendationToDto)
                .ToList(),
            m.Responsetype,
            ChatResponseMetadata.DeserializeQuickReplies(m.Quickreplies));

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
        [EnableRateLimiting("ChatRequests")]
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
                Starttime = DateTime.Now,
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
            if (!CanManageHandoff(session) && !await IsOwnerAsync(session))
                return StatusCode(403, new ApiErrorDto("Bạn không có quyền xem session này.", null));

            return Ok(await MapToDetailedDtoAsync(session));
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

            await using var transaction = await _context.Database.BeginTransactionAsync();

            await _context.Chatproductrecommendations
                .Where(recommendation => recommendation.Message.Sessionid == id)
                .ExecuteDeleteAsync();

            await _context.Chatmessages
                .Where(message => message.Sessionid == id)
                .ExecuteDeleteAsync();

            await _context.Chatsessions
                .Where(chatSession => chatSession.Sessionid == id)
                .ExecuteDeleteAsync();

            await transaction.CommitAsync();

            return NoContent();
        }

        [HttpGet("{id}/messages")]
        public async Task<ActionResult<IEnumerable<ChatMessageDto>>> GetChatMessages(int id)
        {
            var session = await _context.Chatsessions.FindAsync(id);
            if (session == null) return NotFound(new ApiErrorDto("Session không tồn tại.", null));
            if (!CanManageHandoff(session) && !await IsOwnerAsync(session))
                return StatusCode(403, new ApiErrorDto("Bạn không có quyền xem tin nhắn của session này.", null));

            var messages = await _context.Chatmessages
                .AsNoTracking()
                .Include(message => message.Chatproductrecommendations)
                    .ThenInclude(recommendation => recommendation.Product)
                        .ThenInclude(product => product.Brand)
                .Include(message => message.Chatproductrecommendations)
                    .ThenInclude(recommendation => recommendation.Variant)
                        .ThenInclude(variant => variant.Productimages)
                .Include(message => message.Chatproductrecommendations)
                    .ThenInclude(recommendation => recommendation.Variant)
                        .ThenInclude(variant => variant.Inventoryitems)
                .Where(m => m.Sessionid == id)
                .OrderBy(m => m.Sentat)
                .ToListAsync();

            return Ok(messages.Select(MapMessageToDto));
        }

        [HttpPost("{id}/typing")]
        public async Task<IActionResult> SetTyping(int id)
        {
            var session = await _context.Chatsessions.FindAsync(id);
            if (session == null) return NotFound(new ApiErrorDto("Phiên chat không tồn tại.", null));
            if (!CanManageHandoff(session) && !await IsOwnerAsync(session))
                return StatusCode(403, new ApiErrorDto("Bạn không có quyền cập nhật phiên chat này.", null));

            var actor = CanManageHandoff(session) && !await IsOwnerAsync(session)
                ? "consultant"
                : "user";
            await _chatTypingService.SetTypingAsync(id, actor, HttpContext.RequestAborted);
            return Ok(new ApiMessageDto("Typing status updated."));
        }

        [HttpGet("{id}/typing-status")]
        public async Task<ActionResult<ChatTypingStatusDto>> GetTypingStatus(int id)
        {
            var session = await _context.Chatsessions.FindAsync(id);
            if (session == null) return NotFound(new ApiErrorDto("Phiên chat không tồn tại.", null));
            if (!CanManageHandoff(session) && !await IsOwnerAsync(session))
                return StatusCode(403, new ApiErrorDto("Bạn không có quyền xem phiên chat này.", null));

            return Ok(await _chatTypingService.GetStatusAsync(id, HttpContext.RequestAborted));
        }

        [HttpPost("{id}/messages")]
        [EnableRateLimiting("ChatRequests")]
        public async Task<ActionResult<ChatMessageDto>> PostChatMessage(int id, [FromBody] CreateChatMessageRequestDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Messagecontent) || dto.Messagecontent.Length > 500)
            {
                return BadRequest(new ApiErrorDto(
                    "Tin nhắn phải có nội dung và không được vượt quá 500 ký tự.",
                    null));
            }

            var session = await _context.Chatsessions.FindAsync(id);
            if (session == null) return NotFound(new ApiErrorDto("Session không tồn tại.", null));
            if (!await IsOwnerAsync(session)) return StatusCode(403, new ApiErrorDto("Bạn không có quyền gửi tin nhắn vào session này.", null));

            if (session.Handoffstatus is "Waiting" or "InProgress")
            {
                var userMessage = new Chatmessage
                {
                    Sessionid = session.Sessionid,
                    Sendertype = "user",
                    Messagecontent = dto.Messagecontent.Trim(),
                    Sentat = DateTime.Now
                };
                session.Endtime = DateTime.Now;
                _context.Chatmessages.Add(userMessage);
                await _context.SaveChangesAsync();
                return Ok(MapMessageToDto(userMessage));
            }

            var result = await _chatOrchestrator.ProcessUserMessageAsync(session, dto.Messagecontent);

            return Ok(result);
        }

        [HttpPost("{id}/recommendations/{recommendationId}/added-to-cart")]
        public async Task<ActionResult<ChatRecommendationDto>> MarkRecommendationAddedToCart(
            int id,
            int recommendationId)
        {
            var session = await _context.Chatsessions.FindAsync(id);
            if (session == null)
                return NotFound(new ApiErrorDto("Session không tồn tại.", null));
            if (!await IsOwnerAsync(session))
                return StatusCode(403, new ApiErrorDto("Bạn không có quyền cập nhật session này.", null));

            var recommendation = await _context.Chatproductrecommendations
                .Include(item => item.Message)
                .Include(item => item.Product)
                    .ThenInclude(product => product.Brand)
                .Include(item => item.Variant)
                    .ThenInclude(variant => variant.Productimages)
                .Include(item => item.Variant)
                    .ThenInclude(variant => variant.Inventoryitems)
                .FirstOrDefaultAsync(item =>
                    item.Recommendationid == recommendationId &&
                    item.Message.Sessionid == id);
            if (recommendation == null)
                return NotFound(new ApiErrorDto("Sản phẩm đề xuất không tồn tại trong phiên chat.", null));

            recommendation.Addedtocartat ??= DateTime.Now;
            await _context.SaveChangesAsync();
            return Ok(MapRecommendationToDto(recommendation));
        }

        [HttpGet("recommendation-metrics")]
        [Authorize(Roles = "Admin,Manager,Consultant")]
        public async Task<ActionResult<ChatRecommendationMetricsDto>> GetRecommendationMetrics(
            [FromQuery] int days = 30)
        {
            days = Math.Clamp(days, 1, 365);
            var fromDate = DateTime.Now.AddDays(-days);
            var recommendations = await _context.Chatproductrecommendations
                .AsNoTracking()
                .Include(item => item.Product)
                .Where(item => item.Createdat >= fromDate)
                .ToListAsync();

            var total = recommendations.Count;
            var addedToCart = recommendations.Count(item => item.Addedtocartat.HasValue);
            var ordered = recommendations.Count(item => item.Orderedat.HasValue);
            var topProducts = recommendations
                .GroupBy(item => new { item.Productid, item.Product.Productname })
                .Select(group => new ChatRecommendationProductMetricDto(
                    group.Key.Productid,
                    group.Key.Productname,
                    group.Count(),
                    group.Count(item => item.Addedtocartat.HasValue),
                    group.Count(item => item.Orderedat.HasValue)))
                .OrderByDescending(item => item.Ordered)
                .ThenByDescending(item => item.Addedtocart)
                .ThenByDescending(item => item.Recommended)
                .Take(5)
                .ToList();

            return Ok(new ChatRecommendationMetricsDto(
                total,
                addedToCart,
                ordered,
                total == 0 ? 0 : Math.Round(addedToCart * 100m / total, 2),
                total == 0 ? 0 : Math.Round(ordered * 100m / total, 2),
                topProducts));
        }

        [HttpPost("{id}/handoff")]
        public async Task<ActionResult<ChatSessionDto>> RequestHandoff(int id)
        {
            var session = await _context.Chatsessions.FindAsync(id);
            if (session == null)
                return NotFound(new ApiErrorDto("Session không tồn tại.", null));
            if (!await IsOwnerAsync(session))
                return StatusCode(403, new ApiErrorDto("Bạn không có quyền chuyển session này.", null));
            if (session.Handoffstatus == "InProgress")
                return Conflict(new ApiErrorDto("Cuộc trò chuyện đã có nhân viên tư vấn tiếp nhận.", null));

            session.Handoffstatus = "Waiting";
            session.Handoffrequestedat = DateTime.Now;
            session.Assigneduserid = null;
            _context.Chatmessages.Add(new Chatmessage
            {
                Sessionid = session.Sessionid,
                Sendertype = "system",
                Messagecontent = "Khách hàng đã yêu cầu kết nối với nhân viên tư vấn.",
                Sentat = DateTime.Now
            });
            await _context.SaveChangesAsync();

            return Ok(await MapToDetailedDtoAsync(session));
        }

        [HttpGet("handoffs")]
        [Authorize(Roles = "Admin,Manager,Consultant")]
        public async Task<ActionResult<IEnumerable<ChatSessionDto>>> GetHandoffs()
        {
            var currentUserId = GetCurrentUserId();
            var query = _context.Chatsessions
                .Where(session =>
                    session.Handoffstatus == "Waiting" ||
                    session.Handoffstatus == "InProgress");

            if (User.IsInRole("Consultant"))
            {
                query = query.Where(session =>
                    session.Handoffstatus == "Waiting" ||
                    session.Assigneduserid == currentUserId);
            }

            var sessions = await query
                .OrderBy(session => session.Handoffstatus == "Waiting" ? 0 : 1)
                .ThenBy(session => session.Handoffrequestedat)
                .ToListAsync();
            var result = new List<ChatSessionDto>();
            foreach (var session in sessions)
            {
                result.Add(await MapToDetailedDtoAsync(session));
            }
            return Ok(result);
        }

        [HttpPost("{id}/accept")]
        [Authorize(Roles = "Admin,Manager,Consultant")]
        public async Task<ActionResult<ChatSessionDto>> AcceptHandoff(int id)
        {
            var currentUserId = GetCurrentUserId();
            if (!currentUserId.HasValue)
                return Unauthorized(new ApiErrorDto("Không xác định được nhân viên tư vấn.", null));

            var handoffLock = HandoffLocks.GetOrAdd(id, _ => new SemaphoreSlim(1, 1));
            await handoffLock.WaitAsync();
            try
            {
                var updatedRows = await _context.Chatsessions
                    .Where(session => session.Sessionid == id && session.Handoffstatus == "Waiting")
                    .ExecuteUpdateAsync(setters => setters
                        .SetProperty(session => session.Assigneduserid, currentUserId.Value)
                        .SetProperty(session => session.Handoffstatus, "InProgress"));

                if (updatedRows == 0)
                {
                    var exists = await _context.Chatsessions.AnyAsync(session => session.Sessionid == id);
                    if (!exists)
                        return NotFound(new ApiErrorDto("Session không tồn tại.", null));

                    return Conflict(new ApiErrorDto("Cuộc trò chuyện không còn trong hàng chờ.", null));
                }

                _context.Chatmessages.Add(new Chatmessage
                {
                    Sessionid = id,
                    Sendertype = "system",
                    Messagecontent = "Nhân viên tư vấn đã tiếp nhận cuộc trò chuyện.",
                    Sentat = DateTime.Now
                });
                await _context.SaveChangesAsync();

                var session = await _context.Chatsessions
                    .AsNoTracking()
                    .FirstAsync(item => item.Sessionid == id);
                return Ok(await MapToDetailedDtoAsync(session));
            }
            finally
            {
                handoffLock.Release();
            }
        }

        [HttpPost("{id}/consultant-messages")]
        [Authorize(Roles = "Admin,Manager,Consultant")]
        public async Task<ActionResult<ChatMessageDto>> PostConsultantMessage(
            int id,
            [FromBody] CreateChatMessageRequestDto dto)
        {
            var session = await _context.Chatsessions.FindAsync(id);
            if (session == null)
                return NotFound(new ApiErrorDto("Session không tồn tại.", null));
            if (session.Handoffstatus != "InProgress" || !CanManageHandoff(session))
                return StatusCode(403, new ApiErrorDto("Bạn chưa tiếp nhận cuộc trò chuyện này.", null));

            var message = new Chatmessage
            {
                Sessionid = session.Sessionid,
                Sendertype = "consultant",
                Messagecontent = dto.Messagecontent.Trim(),
                Sentat = DateTime.Now
            };
            session.Endtime = DateTime.Now;
            _context.Chatmessages.Add(message);
            await _context.SaveChangesAsync();
            return Ok(MapMessageToDto(message));
        }

        [HttpPost("{id}/close-handoff")]
        [Authorize(Roles = "Admin,Manager,Consultant")]
        public async Task<ActionResult<ChatSessionDto>> CloseHandoff(int id)
        {
            var session = await _context.Chatsessions.FindAsync(id);
            if (session == null)
                return NotFound(new ApiErrorDto("Session không tồn tại.", null));
            if (!CanManageHandoff(session))
                return StatusCode(403, new ApiErrorDto("Bạn không phụ trách cuộc trò chuyện này.", null));

            session.Handoffstatus = "Closed";
            session.Endtime = DateTime.Now;
            _context.Chatmessages.Add(new Chatmessage
            {
                Sessionid = session.Sessionid,
                Sendertype = "system",
                Messagecontent = "Phiên tư vấn trực tiếp đã kết thúc.",
                Sentat = DateTime.Now
            });
            await _context.SaveChangesAsync();
            return Ok(await MapToDetailedDtoAsync(session));
        }
    }
}
