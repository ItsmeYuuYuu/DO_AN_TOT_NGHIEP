namespace ECommerceBackend.Services;

public sealed record StoredProductImage(string FileName, string RelativeUrl, long Size);

public sealed class ProductImageStorageService
{
    public const long MaxFileSize = 5 * 1024 * 1024;
    public const int MaxFilesPerUpload = 8;

    private static readonly HashSet<string> AllowedExtensions =
        new(StringComparer.OrdinalIgnoreCase) { ".jpg", ".jpeg", ".png", ".webp" };

    private readonly string _uploadDirectory;

    public ProductImageStorageService(IWebHostEnvironment environment)
    {
        var webRoot = environment.WebRootPath;
        if (string.IsNullOrWhiteSpace(webRoot))
        {
            webRoot = Path.Combine(environment.ContentRootPath, "wwwroot");
        }

        _uploadDirectory = Path.Combine(webRoot, "uploads", "products");
    }

    public async Task<StoredProductImage> SaveAsync(IFormFile file, CancellationToken cancellationToken)
    {
        if (file.Length == 0)
            throw new InvalidDataException("Tệp ảnh không được để trống.");

        if (file.Length > MaxFileSize)
            throw new InvalidDataException("Mỗi ảnh không được vượt quá 5 MB.");

        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!AllowedExtensions.Contains(extension))
            throw new InvalidDataException("Chỉ hỗ trợ ảnh JPG, JPEG, PNG hoặc WebP.");

        await using (var validationStream = file.OpenReadStream())
        {
            var header = new byte[12];
            var bytesRead = await validationStream.ReadAsync(header.AsMemory(0, header.Length), cancellationToken);
            if (!MatchesSignature(header, bytesRead, extension))
                throw new InvalidDataException("Nội dung tệp không đúng định dạng ảnh đã khai báo.");
        }

        Directory.CreateDirectory(_uploadDirectory);
        var fileName = $"{Guid.NewGuid():N}{extension}";
        var destinationPath = Path.Combine(_uploadDirectory, fileName);

        await using var destination = new FileStream(
            destinationPath,
            FileMode.CreateNew,
            FileAccess.Write,
            FileShare.None,
            81920,
            useAsync: true);
        await file.CopyToAsync(destination, cancellationToken);

        return new StoredProductImage(
            fileName,
            $"/uploads/products/{fileName}",
            file.Length);
    }

    public bool DeleteByFileName(string fileName)
    {
        var safeFileName = Path.GetFileName(fileName);
        if (!string.Equals(fileName, safeFileName, StringComparison.Ordinal) ||
            string.IsNullOrWhiteSpace(safeFileName))
        {
            return false;
        }

        var path = Path.Combine(_uploadDirectory, safeFileName);
        if (!File.Exists(path))
        {
            return false;
        }

        File.Delete(path);
        return true;
    }

    public bool DeleteByUrl(string? imageUrl)
    {
        if (string.IsNullOrWhiteSpace(imageUrl))
        {
            return false;
        }

        var path = Uri.TryCreate(imageUrl, UriKind.Absolute, out var absoluteUri)
            ? absoluteUri.AbsolutePath
            : imageUrl;
        const string prefix = "/uploads/products/";
        if (!path.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        return DeleteByFileName(path[prefix.Length..]);
    }

    private static bool MatchesSignature(byte[] header, int bytesRead, string extension)
    {
        return extension switch
        {
            ".jpg" or ".jpeg" =>
                bytesRead >= 3 &&
                header[0] == 0xFF &&
                header[1] == 0xD8 &&
                header[2] == 0xFF,
            ".png" =>
                bytesRead >= 8 &&
                header[0] == 0x89 &&
                header[1] == 0x50 &&
                header[2] == 0x4E &&
                header[3] == 0x47 &&
                header[4] == 0x0D &&
                header[5] == 0x0A &&
                header[6] == 0x1A &&
                header[7] == 0x0A,
            ".webp" =>
                bytesRead >= 12 &&
                header[0] == 0x52 &&
                header[1] == 0x49 &&
                header[2] == 0x46 &&
                header[3] == 0x46 &&
                header[8] == 0x57 &&
                header[9] == 0x45 &&
                header[10] == 0x42 &&
                header[11] == 0x50,
            _ => false
        };
    }
}
