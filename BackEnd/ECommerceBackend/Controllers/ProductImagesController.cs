using ECommerceBackend.DTOs.Common;
using ECommerceBackend.Models;
using ECommerceBackend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.RegularExpressions;

namespace ECommerceBackend.Controllers;

public record ProductImageUploadResponseDto(string FileName, string Url, long Size);
public record ProductImageCleanupResponseDto(
    int ScannedFiles,
    int ReferencedFiles,
    int DeletedFiles,
    long FreedBytes,
    List<string> DeletedFileNames);

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

    [HttpPost("cleanup-unused")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<ActionResult<ProductImageCleanupResponseDto>> CleanupUnused([FromQuery] int olderThanHours = 24)
    {
        olderThanHours = Math.Clamp(olderThanHours, 0, 24 * 30);

        var referencedFileNames = await GetReferencedProductImageFileNames();
        var cutoff = DateTime.UtcNow.AddHours(-olderThanHours);
        var uploadedFiles = _storage.GetProductUploadFiles();
        var deletedFileNames = new List<string>();
        long freedBytes = 0;

        foreach (var file in uploadedFiles)
        {
            if (referencedFileNames.Contains(file.Name) || file.LastWriteTimeUtc > cutoff)
            {
                continue;
            }

            var fileLength = file.Length;
            if (_storage.DeleteByFileName(file.Name))
            {
                deletedFileNames.Add(file.Name);
                freedBytes += fileLength;
            }
        }

        return Ok(new ProductImageCleanupResponseDto(
            uploadedFiles.Count,
            uploadedFiles.Count(file => referencedFileNames.Contains(file.Name)),
            deletedFileNames.Count,
            freedBytes,
            deletedFileNames));
    }

    private async Task<HashSet<string>> GetReferencedProductImageFileNames()
    {
        var referencedFileNames = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        var productImageUrls = await _context.Productimages
            .Select(image => image.Imageurl)
            .ToListAsync();
        foreach (var imageUrl in productImageUrls)
        {
            AddReferencedFileName(referencedFileNames, imageUrl);
        }

        var promotionalImageUrls = await _context.Promotionalcontents
            .Select(content => content.Imageurl)
            .ToListAsync();
        foreach (var imageUrl in promotionalImageUrls)
        {
            AddReferencedFileName(referencedFileNames, imageUrl);
        }

        var newsImageTexts = await _context.News
            .Select(news => new { news.Thumbnail, news.Content })
            .ToListAsync();
        foreach (var news in newsImageTexts)
        {
            AddReferencedFileName(referencedFileNames, news.Thumbnail);
            AddReferencedFileNames(referencedFileNames, news.Content);
        }

        var productDescriptions = await _context.Products
            .Where(product => product.Description != null)
            .Select(product => product.Description!)
            .ToListAsync();
        foreach (var description in productDescriptions)
        {
            AddReferencedFileNames(referencedFileNames, description);
        }

        return referencedFileNames;
    }

    private static void AddReferencedFileName(HashSet<string> referencedFileNames, string? value)
    {
        var fileName = ExtractProductUploadFileName(value);
        if (!string.IsNullOrWhiteSpace(fileName))
        {
            referencedFileNames.Add(fileName);
        }
    }

    private static void AddReferencedFileNames(HashSet<string> referencedFileNames, string? value)
    {
        foreach (var fileName in ExtractProductUploadFileNames(value))
        {
            referencedFileNames.Add(fileName);
        }
    }

    private static string? ExtractProductUploadFileName(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        var path = Uri.TryCreate(value, UriKind.Absolute, out var uri)
            ? uri.AbsolutePath
            : value;

        const string marker = "/uploads/products/";
        var markerIndex = path.IndexOf(marker, StringComparison.OrdinalIgnoreCase);
        if (markerIndex < 0)
        {
            return null;
        }

        var filePart = path[(markerIndex + marker.Length)..]
            .Split('?', '#', ')', '"', '\'', ' ', '\r', '\n', '\t')[0];
        var fileName = Path.GetFileName(filePart);

        return string.IsNullOrWhiteSpace(fileName) ? null : fileName;
    }

    private static IEnumerable<string> ExtractProductUploadFileNames(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            yield break;
        }

        foreach (Match match in Regex.Matches(value, @"/uploads/products/[^\s\)""']+", RegexOptions.IgnoreCase))
        {
            var fileName = ExtractProductUploadFileName(match.Value);
            if (!string.IsNullOrWhiteSpace(fileName))
            {
                yield return fileName;
            }
        }
    }
}
