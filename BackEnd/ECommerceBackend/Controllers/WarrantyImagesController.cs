using ECommerceBackend.DTOs.Common;
using ECommerceBackend.Models;
using ECommerceBackend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ECommerceBackend.Controllers;

public record WarrantyImageUploadResponseDto(string FileName, string Url, long Size);

[Route("api/[controller]")]
[ApiController]
[Authorize(Roles = "Admin,Manager,Warranty")]
public class WarrantyImagesController : ControllerBase
{
    private readonly ECommerceContext _context;
    private readonly ProductImageStorageService _storage;

    public WarrantyImagesController(ECommerceContext context, ProductImageStorageService storage)
    {
        _context = context;
        _storage = storage;
    }

    [HttpPost("upload")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(30 * 1024 * 1024)]
    public async Task<ActionResult<IEnumerable<WarrantyImageUploadResponseDto>>> Upload(
        [FromForm] List<IFormFile> files,
        CancellationToken cancellationToken)
    {
        if (files.Count == 0)
            return BadRequest(new ApiErrorDto("Vui lòng chọn ít nhất một ảnh thiết bị.", null));
        if (files.Count > 6)
            return BadRequest(new ApiErrorDto("Mỗi phiếu chỉ được tải tối đa 6 ảnh.", null));

        var storedImages = new List<StoredProductImage>();
        try
        {
            foreach (var file in files)
            {
                storedImages.Add(await _storage.SaveWarrantyAsync(file, cancellationToken));
            }
        }
        catch (InvalidDataException ex)
        {
            foreach (var image in storedImages)
            {
                _storage.DeleteWarrantyByFileName(image.FileName);
            }
            return BadRequest(new ApiErrorDto(ex.Message, null));
        }

        var baseUrl = $"{Request.Scheme}://{Request.Host}{Request.PathBase}";
        return Ok(storedImages.Select(image => new WarrantyImageUploadResponseDto(
            image.FileName,
            $"{baseUrl}{image.RelativeUrl}",
            image.Size)));
    }

    [HttpDelete("uploaded/{fileName}")]
    public async Task<IActionResult> DeleteUploaded(string fileName)
    {
        var safeFileName = Path.GetFileName(fileName);
        if (!string.Equals(fileName, safeFileName, StringComparison.Ordinal))
            return BadRequest(new ApiErrorDto("Tên tệp không hợp lệ.", null));

        var suffix = $"/uploads/warranties/{safeFileName}";
        var isReferenced = await _context.Warrantyclaims
            .AnyAsync(claim => claim.Imageurls != null && claim.Imageurls.Contains(suffix));
        if (isReferenced)
            return Conflict(new ApiErrorDto("Ảnh đang được sử dụng trong phiếu bảo hành.", null));

        _storage.DeleteWarrantyByFileName(safeFileName);
        return NoContent();
    }
}
