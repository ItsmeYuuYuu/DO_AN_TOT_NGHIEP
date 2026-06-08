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
        if (files.Count == 0)
            return BadRequest(new ApiErrorDto("Vui lòng chọn ít nhất một tệp ảnh.", null));

        if (files.Count > ProductImageStorageService.MaxFilesPerUpload)
            return BadRequest(new ApiErrorDto("Mỗi lần chỉ được tải lên tối đa 8 ảnh.", null));

        var storedImages = new List<StoredProductImage>();
        try
        {
            foreach (var file in files)
            {
                storedImages.Add(await _storage.SaveAsync(file, cancellationToken));
            }
        }
        catch (InvalidDataException ex)
        {
            foreach (var storedImage in storedImages)
            {
                _storage.DeleteByFileName(storedImage.FileName);
            }

            return BadRequest(new ApiErrorDto(ex.Message, null));
        }
        catch
        {
            foreach (var storedImage in storedImages)
            {
                _storage.DeleteByFileName(storedImage.FileName);
            }

            throw;
        }

        var baseUrl = $"{Request.Scheme}://{Request.Host}{Request.PathBase}";
        return Ok(storedImages.Select(image => new ProductImageUploadResponseDto(
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

        var suffix = $"/uploads/products/{safeFileName}";
        var isReferenced =
            await _context.Productimages.AnyAsync(image => image.Imageurl.EndsWith(suffix)) ||
            await _context.Promotionalcontents.AnyAsync(content => content.Imageurl.EndsWith(suffix)) ||
            await _context.News.AnyAsync(news =>
                news.Thumbnail != null && news.Thumbnail.EndsWith(suffix)) ||
            await _context.Products.AnyAsync(product =>
                product.Description != null && product.Description.Contains(suffix));
        if (isReferenced)
            return Conflict(new ApiErrorDto("Ảnh đang được sử dụng và không thể xóa.", null));

        _storage.DeleteByFileName(safeFileName);
        return NoContent();
    }
}
