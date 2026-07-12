using ECommerceBackend.DTOs.Common;
using ECommerceBackend.Models;
using ECommerceBackend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ECommerceBackend.Controllers;

public record ProductImageUploadResponseDto(string FileName, string Url, long Size);

[Route("api/[controller]")]
[ApiController]
[Authorize(Roles = "Admin,Manager,Warehouse,Content")]
public class ProductImagesController : ControllerBase
{
    private readonly ECommerceContext _context;
    private readonly ProductImageStorageService _storage;

    public ProductImagesController(ECommerceContext context, ProductImageStorageService storage)
    {
        _context = context;
        _storage = storage;
    }

    [HttpPost("upload")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(40 * 1024 * 1024)]
    public async Task<ActionResult<IEnumerable<ProductImageUploadResponseDto>>> Upload(
        [FromForm] List<IFormFile> files,
        CancellationToken cancellationToken)
    {
        if (files.Count == 0 || files.Count > ProductImageStorageService.MaxFilesPerUpload)
            return BadRequest(new ApiErrorDto("Mỗi lần chỉ được tải từ 1 đến 8 ảnh.", null));

        var stored = new List<StoredProductImage>();
        try
        {
            foreach (var file in files)
                stored.Add(await _storage.SaveAsync(file, cancellationToken));
        }
        catch (InvalidDataException exception)
        {
            foreach (var image in stored) _storage.DeleteByFileName(image.FileName);
            return BadRequest(new ApiErrorDto(exception.Message, null));
        }

        var baseUrl = $"{Request.Scheme}://{Request.Host}{Request.PathBase}";
        return Ok(stored.Select(image => new ProductImageUploadResponseDto(image.FileName, $"{baseUrl}{image.RelativeUrl}", image.Size)));
    }

    [HttpDelete("uploaded/{fileName}")]
    public async Task<IActionResult> DeleteUploaded(string fileName)
    {
        var safeName = Path.GetFileName(fileName);
        if (!string.Equals(fileName, safeName, StringComparison.Ordinal))
            return BadRequest(new ApiErrorDto("Tên tệp không hợp lệ.", null));

        var suffix = $"/uploads/products/{safeName}";
        var referencedByVariant = await _context.Productvariants.AnyAsync(item => item.Imageurls != null && item.Imageurls.Contains(suffix));
        var referencedByProduct = await _context.Products.AnyAsync(item => item.Description != null && item.Description.Contains(suffix));
        var referencedByContent = await _context.Contents.AnyAsync(item =>
            (item.Htmlcontent != null && item.Htmlcontent.Contains(suffix)) ||
            (item.Thumbnailurl != null && item.Thumbnailurl.Contains(suffix)));
        if (referencedByVariant || referencedByProduct || referencedByContent)
            return Conflict(new ApiErrorDto("Ảnh đang được sử dụng nên không thể xóa.", null));

        _storage.DeleteByFileName(safeName);
        return NoContent();
    }
}
