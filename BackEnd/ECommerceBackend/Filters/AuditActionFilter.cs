using System.Security.Claims;
using ECommerceBackend.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace ECommerceBackend.Filters;

/// <summary>
/// ActionFilter tự động ghi Audit Log cho mọi request POST/PUT/DELETE.
///
/// Áp dụng:
/// - Globally trong Program.cs: builder.Services.AddControllers(o => o.Filters.Add<AuditActionFilter>())
/// - Hoặc từng controller/action: [ServiceFilter(typeof(AuditActionFilter))]
///
/// Thứ tự thực thi: OnActionExecuting (trước) → Action logic → OnActionExecuted (sau).
/// Log được enqueue SAU KHI action hoàn thành để biết kết quả (success/fail).
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public class AuditActionFilter : Attribute, IAsyncActionFilter
{
    // HTTP methods cần ghi log (chỉ ghi các thao tác thay đổi dữ liệu)
    private static readonly HashSet<string> LoggedMethods =
        new(StringComparer.OrdinalIgnoreCase) { "POST", "PUT", "PATCH", "DELETE" };

    // Mapping: Controller name → Tên bảng trong DB
    private static readonly Dictionary<string, string> ControllerToTable =
        new(StringComparer.OrdinalIgnoreCase)
        {
            ["Products"]            = "products",
            ["ProductSeries"]       = "productseries",
            ["ProductVariants"]     = "productvariants",
            ["Categories"]          = "categories",
            ["Brands"]              = "brands",
            ["Orders"]              = "orders",
            ["Users"]               = "users",
            ["Customers"]           = "customers",
            ["Inventory"]           = "inventoryitems",
            ["Warranties"]          = "inventoryitems",
            ["Vouchers"]            = "vouchers",
            ["PromotionalContents"] = "promotionalcontents",
            ["HomepageProductSections"] = "homepageproductsections",
            ["News"]                = "news",
            ["Reviews"]             = "reviews",
            ["Auth"]                = "users",  // Login / change-password
        };

    private readonly AuditLogService _auditLogService;

    public AuditActionFilter(AuditLogService auditLogService)
        => _auditLogService = auditLogService;

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var httpMethod = context.HttpContext.Request.Method;

        // Bỏ qua GET, HEAD, OPTIONS
        if (!LoggedMethods.Contains(httpMethod))
        {
            await next();
            return;
        }

        // Ghi lại thời điểm bắt đầu (để đo thời gian nếu cần sau này)
        var startedAt = DateTime.Now;

        // Thực thi action thực sự
        var executed = await next();

        // Chỉ log khi request THÀNH CÔNG (2xx) — tránh log các lần validation fail
        var statusCode = context.HttpContext.Response.StatusCode;
        if (statusCode < 200 || statusCode >= 300)
        {
            // Nếu result là ObjectResult thì lấy status code từ đó
            if (executed.Result is ObjectResult objResult &&
                (objResult.StatusCode < 200 || objResult.StatusCode >= 300))
                return;
        }

        // Nếu có exception thì không log thành công
        if (executed.Exception != null && !executed.ExceptionHandled)
            return;

        // ── Trích xuất thông tin từ JWT Claims ──────────────────────────────
        int? userId = null;
        var userIdClaim = context.HttpContext.User.FindFirst("userid")
                       ?? context.HttpContext.User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim != null && int.TryParse(userIdClaim.Value, out var parsedId))
            userId = parsedId;

        // ── Xác định tên action và bảng bị tác động ─────────────────────────
        var controllerName = context.ActionDescriptor.RouteValues.TryGetValue("controller", out var ctrl)
            ? ctrl ?? "Unknown" : "Unknown";
        var actionName = context.ActionDescriptor.RouteValues.TryGetValue("action", out var act)
            ? act ?? httpMethod : httpMethod;
        var tableName = ControllerToTable.TryGetValue(controllerName, out var tbl)
            ? tbl : controllerName.ToLower();

        // Tạo mô tả action thân thiện hơn
        var friendlyAction = BuildFriendlyAction(httpMethod, actionName, controllerName);

        // ── Trích xuất Record ID từ route (nếu có) ───────────────────────────
        string? recordId = null;
        if (context.RouteData.Values.TryGetValue("id", out var routeId))
            recordId = routeId?.ToString();

        // ── Enqueue (non-blocking, fire-and-forget) ──────────────────────────
        _auditLogService.Enqueue(new AuditLogEntry
        {
            UserId    = userId,
            Action    = friendlyAction,
            TableName = tableName,
            RecordId  = recordId,
            CreatedAt = startedAt,
        });
    }

    private static string BuildFriendlyAction(string method, string action, string controller)
    {
        if (controller.Equals("Auth", StringComparison.OrdinalIgnoreCase))
        {
            return action.ToLowerInvariant() switch
            {
                "login" => "Đăng nhập hệ thống",
                "logout" => "Đăng xuất hệ thống",
                "register" => "Đăng ký tài khoản",
                "changepassword" => "Đổi mật khẩu",
                "forgotpassword" => "Yêu cầu khôi phục mật khẩu",
                _ => $"Xác thực [Auth] - {action}",
            };
        }

        var verb = method.ToUpper() switch
        {
            "POST"   => "Tạo mới",
            "PUT"    => "Cập nhật",
            "PATCH"  => "Cập nhật một phần",
            "DELETE" => "Xóa",
            _        => method,
        };
        return $"{verb} [{controller}] - {action}";
    }
}
