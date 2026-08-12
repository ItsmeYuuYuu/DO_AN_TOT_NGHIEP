using ECommerceBackend.Authorization;
using ECommerceBackend.DTOs.Common;
using ECommerceBackend.DTOs.Vouchers;
using ECommerceBackend.Models;
using ECommerceBackend.Services.Checkout;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Text.Json;

namespace ECommerceBackend.Controllers;

[Route("api/[controller]")]
[ApiController]
public class VouchersController : ControllerBase
{
    private readonly ECommerceContext _context;
    private readonly IVoucherPolicyService _voucherPolicyService;

    public VouchersController(ECommerceContext context, IVoucherPolicyService voucherPolicyService)
    {
        _context = context;
        _voucherPolicyService = voucherPolicyService;
    }

    private static VoucherDto MapToDto(Voucher voucher) => new(
        voucher.Vouchercode,
        voucher.Discountamount,
        voucher.Discountpercentage,
        voucher.Minimumorderamount,
        voucher.Maximumdiscountamount,
        voucher.Applicableproductids ?? [],
        voucher.Validfrom,
        voucher.Validto,
        voucher.Isactive);

    [HttpGet]
    [HasPermission(AppPermissions.VouchersManage)]
    public async Task<ActionResult<IEnumerable<VoucherDto>>> GetVouchers()
    {
        var vouchers = await _context.Vouchers
            .AsNoTracking()
            .OrderByDescending(voucher => voucher.Validfrom)
            .ThenBy(voucher => voucher.Vouchercode)
            .ToListAsync();
        return Ok(vouchers.Select(MapToDto));
    }

    [HttpGet("active")]
    public async Task<ActionResult<IEnumerable<VoucherDto>>> GetActiveVouchers()
    {
        var now = DateTime.UtcNow;
        var usedVouchers = new List<string>();
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (int.TryParse(userIdClaim, out var userId))
        {
            usedVouchers = await _context.Orders
                .Where(order => order.Userid == userId
                    && order.Vouchercode != null
                    && order.Orderstatus != "Cancelled")
                .Select(order => order.Vouchercode!)
                .Distinct()
                .ToListAsync();
        }

        var query = _context.Vouchers
            .AsNoTracking()
            .Where(voucher => voucher.Isactive == true
                && (voucher.Validfrom == null || voucher.Validfrom <= now)
                && (voucher.Validto == null || voucher.Validto >= now));

        if (usedVouchers.Count > 0)
            query = query.Where(voucher => !usedVouchers.Contains(voucher.Vouchercode));

        var vouchers = await query.OrderBy(voucher => voucher.Validto).ToListAsync();
        return Ok(vouchers.Select(MapToDto));
    }

    [HttpGet("{code}")]
    [HasPermission(AppPermissions.VouchersManage)]
    public async Task<ActionResult<VoucherDto>> GetVoucher(string code)
    {
        var normalizedCode = NormalizeCode(code);
        var voucher = await _context.Vouchers.FindAsync(normalizedCode);
        return voucher == null ? NotFound() : Ok(MapToDto(voucher));
    }

    [HttpGet("active/{code}/details")]
    public async Task<ActionResult<VoucherDetailsDto>> GetActiveVoucherDetails(
        string code,
        CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        var voucher = await _context.Vouchers
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.Vouchercode == NormalizeCode(code)
                && item.Isactive == true
                && (!item.Validfrom.HasValue || item.Validfrom <= now)
                && (!item.Validto.HasValue || item.Validto >= now), cancellationToken);
        if (voucher == null) return NotFound();

        var productIds = voucher.Applicableproductids ?? [];
        List<Product> products = productIds.Length == 0
            ? []
            : await _context.Products
                .AsNoTracking()
                .Where(product => product.Isactive && productIds.Contains(product.Productid))
                .Include(product => product.Brand)
                .Include(product => product.Productvariants)
                .OrderBy(product => product.Productname)
                .ToListAsync(cancellationToken);

        var applicableProducts = products.Select(product => new VoucherApplicableProductDto(
            product.Productid,
            product.Productname,
            product.Slug,
            product.Brand?.Brandname,
            GetFirstImageUrl(product.Productvariants),
            product.Productvariants
                .Select(variant => variant.Saleprice ?? variant.Baseprice)
                .DefaultIfEmpty()
                .Min())).ToList();

        return Ok(new VoucherDetailsDto(
            voucher.Vouchercode,
            voucher.Discountamount,
            voucher.Discountpercentage,
            voucher.Minimumorderamount,
            voucher.Maximumdiscountamount,
            productIds,
            voucher.Validfrom,
            voucher.Validto,
            voucher.Isactive,
            applicableProducts));
    }

    // Kept for backward compatibility. Cart-aware clients should use POST /api/Vouchers/validate.
    [HttpGet("validate/{code}")]
    [Authorize]
    public async Task<IActionResult> ValidateVoucherCode(string code)
    {
        var normalizedCode = NormalizeCode(code);
        var voucher = await _context.Vouchers.AsNoTracking()
            .FirstOrDefaultAsync(item => item.Vouchercode == normalizedCode);
        if (voucher == null) return NotFound(new ApiErrorDto("Voucher không tồn tại."));
        if (voucher.Isactive != true) return BadRequest(new ApiErrorDto("Voucher đã ngừng hoạt động."));

        var now = DateTime.UtcNow;
        if (voucher.Validfrom.HasValue && now < voucher.Validfrom.Value)
            return BadRequest(new ApiErrorDto("Voucher chưa có hiệu lực."));
        if (voucher.Validto.HasValue && now > voucher.Validto.Value)
            return BadRequest(new ApiErrorDto("Voucher đã hết hạn."));

        return Ok(MapToDto(voucher));
    }

    [HttpPost("validate")]
    [AllowAnonymous]
    public async Task<ActionResult<VoucherValidationDto>> ValidateVoucher(
        [FromBody] ValidateVoucherRequestDto dto,
        CancellationToken cancellationToken)
    {
        var linesResult = await BuildVoucherLinesAsync(dto.Items, cancellationToken);
        if (linesResult.Error != null)
            return BadRequest(new ApiErrorDto(linesResult.Error));

        var userId = GetCurrentUserId();
        var customerPhone = userId.HasValue
            ? await _context.Users.Where(user => user.Userid == userId.Value)
                .Select(user => user.Phone)
                .FirstOrDefaultAsync(cancellationToken)
            : null;

        var evaluation = await _voucherPolicyService.EvaluateAsync(
            dto.Vouchercode,
            linesResult.Lines,
            userId,
            customerPhone,
            cancellationToken: cancellationToken);

        if (!evaluation.Isvalid)
            return BadRequest(new ApiErrorDto(evaluation.Error ?? "Voucher không hợp lệ."));

        var voucher = evaluation.Voucher!;
        return Ok(new VoucherValidationDto(
            voucher.Vouchercode,
            evaluation.Discountamount,
            evaluation.Eligiblesubtotal,
            voucher.Minimumorderamount,
            voucher.Maximumdiscountamount,
            voucher.Discountpercentage,
            voucher.Applicableproductids ?? [],
            "Áp dụng voucher thành công."));
    }

    [HttpPost]
    [HasPermission(AppPermissions.VouchersManage)]
    public async Task<ActionResult<VoucherDto>> PostVoucher(
        [FromBody] CreateVoucherRequestDto dto,
        CancellationToken cancellationToken)
    {
        var normalizedCode = NormalizeCode(dto.Vouchercode);
        if (await _context.Vouchers.AnyAsync(voucher => voucher.Vouchercode == normalizedCode, cancellationToken))
            return Conflict(new ApiErrorDto("Mã voucher đã tồn tại."));

        var productIds = NormalizeProductIds(dto.Applicableproductids);
        var validationError = await ValidateConfigurationAsync(
            dto.Discountamount,
            dto.Discountpercentage,
            dto.Minimumorderamount,
            dto.Maximumdiscountamount,
            productIds,
            dto.Validfrom,
            dto.Validto,
            cancellationToken);
        if (validationError != null) return BadRequest(new ApiErrorDto(validationError));

        var voucher = new Voucher
        {
            Vouchercode = normalizedCode,
            Discountamount = PositiveOrNull(dto.Discountamount),
            Discountpercentage = PositiveOrNull(dto.Discountpercentage),
            Minimumorderamount = PositiveOrNull(dto.Minimumorderamount),
            Maximumdiscountamount = PositiveOrNull(dto.Maximumdiscountamount),
            Applicableproductids = productIds,
            Validfrom = dto.Validfrom,
            Validto = dto.Validto,
            Isactive = dto.Isactive ?? true
        };

        _context.Vouchers.Add(voucher);
        await _context.SaveChangesAsync(cancellationToken);
        return CreatedAtAction(nameof(GetVoucher), new { code = voucher.Vouchercode }, MapToDto(voucher));
    }

    [HttpPut("{code}")]
    [HasPermission(AppPermissions.VouchersManage)]
    public async Task<IActionResult> PutVoucher(
        string code,
        [FromBody] UpdateVoucherRequestDto dto,
        CancellationToken cancellationToken)
    {
        var voucher = await _context.Vouchers.FindAsync([NormalizeCode(code)], cancellationToken);
        if (voucher == null) return NotFound();

        var productIds = NormalizeProductIds(dto.Applicableproductids);
        var validationError = await ValidateConfigurationAsync(
            dto.Discountamount,
            dto.Discountpercentage,
            dto.Minimumorderamount,
            dto.Maximumdiscountamount,
            productIds,
            dto.Validfrom,
            dto.Validto,
            cancellationToken);
        if (validationError != null) return BadRequest(new ApiErrorDto(validationError));

        voucher.Discountamount = PositiveOrNull(dto.Discountamount);
        voucher.Discountpercentage = PositiveOrNull(dto.Discountpercentage);
        voucher.Minimumorderamount = PositiveOrNull(dto.Minimumorderamount);
        voucher.Maximumdiscountamount = PositiveOrNull(dto.Maximumdiscountamount);
        voucher.Applicableproductids = productIds;
        voucher.Validfrom = dto.Validfrom;
        voucher.Validto = dto.Validto;
        if (dto.Isactive.HasValue) voucher.Isactive = dto.Isactive.Value;

        await _context.SaveChangesAsync(cancellationToken);
        return Ok(MapToDto(voucher));
    }

    [HttpDelete("{code}")]
    [HasPermission(AppPermissions.VouchersManage)]
    public async Task<IActionResult> DeleteVoucher(string code, CancellationToken cancellationToken)
    {
        var voucher = await _context.Vouchers.FindAsync([NormalizeCode(code)], cancellationToken);
        if (voucher == null) return NotFound();

        var isUsed = await _context.Orders.AnyAsync(
            order => order.Vouchercode == voucher.Vouchercode,
            cancellationToken);
        if (isUsed)
            return Conflict(new ApiErrorDto("Voucher đã phát sinh đơn hàng. Hãy tắt trạng thái thay vì xóa."));

        _context.Vouchers.Remove(voucher);
        await _context.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    private static string? GetFirstImageUrl(IEnumerable<Productvariant> variants)
    {
        foreach (var variant in variants)
        {
            if (string.IsNullOrWhiteSpace(variant.Imageurls)) continue;
            try
            {
                var imageUrl = JsonSerializer.Deserialize<List<string>>(variant.Imageurls)?.FirstOrDefault();
                if (!string.IsNullOrWhiteSpace(imageUrl)) return imageUrl;
            }
            catch (JsonException)
            {
                // An invalid legacy image payload must not prevent customers from reading voucher terms.
            }
        }

        return null;
    }

    private async Task<(List<VoucherLine> Lines, string? Error)> BuildVoucherLinesAsync(
        IReadOnlyCollection<VoucherCartItemDto> items,
        CancellationToken cancellationToken)
    {
        var quantities = items
            .GroupBy(item => item.Variantid)
            .ToDictionary(group => group.Key, group => group.Sum(item => item.Quantity));
        var variantIds = quantities.Keys.ToArray();
        var variants = await _context.Productvariants
            .AsNoTracking()
            .Where(variant => variantIds.Contains(variant.Variantid))
            .Select(variant => new
            {
                variant.Variantid,
                Productid = variant.Productid ?? 0,
                Price = variant.Saleprice ?? variant.Baseprice,
                Isactive = variant.Product != null && variant.Product.Isactive
            })
            .ToListAsync(cancellationToken);

        if (variants.Count != variantIds.Length || variants.Any(variant => !variant.Isactive))
            return ([], "Giỏ hàng chứa sản phẩm không tồn tại hoặc đã ngừng kinh doanh.");

        return (variants
            .Select(variant => new VoucherLine(
                variant.Productid,
                variant.Price,
                quantities[variant.Variantid]))
            .ToList(), null);
    }

    private async Task<string?> ValidateConfigurationAsync(
        decimal? discountAmount,
        double? discountPercentage,
        decimal? minimumOrderAmount,
        decimal? maximumDiscountAmount,
        int[] productIds,
        DateTime? validFrom,
        DateTime? validTo,
        CancellationToken cancellationToken)
    {
        var hasFixedDiscount = discountAmount is > 0;
        var hasPercentageDiscount = discountPercentage is > 0;
        if (hasFixedDiscount == hasPercentageDiscount)
            return "Chỉ được cấu hình một loại giảm giá: theo phần trăm hoặc theo số tiền.";
        if (discountPercentage is > 100)
            return "Phần trăm giảm giá không được vượt quá 100%.";
        if (maximumDiscountAmount.HasValue && maximumDiscountAmount.Value <= 0)
            return "Mức giảm tối đa phải lớn hơn 0.";
        if (hasFixedDiscount && maximumDiscountAmount.HasValue)
            return "Mức giảm tối đa chỉ áp dụng cho voucher giảm theo phần trăm.";
        if (minimumOrderAmount.HasValue && minimumOrderAmount.Value < 0)
            return "Giá trị đơn tối thiểu không được âm.";
        if (validFrom.HasValue && validTo.HasValue && validTo.Value < validFrom.Value)
            return "Ngày kết thúc phải sau ngày bắt đầu.";
        if (productIds.Length > 500)
            return "Mỗi voucher chỉ được chọn tối đa 500 sản phẩm.";

        if (productIds.Length > 0)
        {
            var existingProductCount = await _context.Products.CountAsync(
                product => productIds.Contains(product.Productid),
                cancellationToken);
            if (existingProductCount != productIds.Length)
                return "Danh sách sản phẩm áp dụng chứa sản phẩm không tồn tại.";
        }

        return null;
    }

    private int? GetCurrentUserId() =>
        int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var userId) ? userId : null;

    private static string NormalizeCode(string code) => code.Trim().ToUpperInvariant();

    private static int[] NormalizeProductIds(IEnumerable<int>? productIds) =>
        productIds?.Where(productId => productId > 0).Distinct().Order().ToArray() ?? [];

    private static decimal? PositiveOrNull(decimal? value) => value is > 0 ? value : null;

    private static double? PositiveOrNull(double? value) => value is > 0 ? value : null;
}
