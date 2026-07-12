using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;
using ECommerceBackend.Models;
using Microsoft.EntityFrameworkCore;

namespace ECommerceBackend.Services;

public static class ProductSlugService
{
    public static string GenerateBaseSlug(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return "san-pham";

        var normalized = value.Trim().ToLowerInvariant().Normalize(NormalizationForm.FormD);
        var builder = new StringBuilder(normalized.Length);
        foreach (var character in normalized)
        {
            var category = CharUnicodeInfo.GetUnicodeCategory(character);
            if (category == UnicodeCategory.NonSpacingMark)
                continue;

            builder.Append(character == 'đ' ? 'd' : character);
        }

        var slug = Regex.Replace(builder.ToString(), @"[^a-z0-9]+", "-").Trim('-');
        return string.IsNullOrWhiteSpace(slug) ? "san-pham" : slug;
    }

    public static async Task<string> GenerateUniqueSlugAsync(
        ECommerceContext context,
        string productName,
        int? currentProductId = null,
        CancellationToken cancellationToken = default)
    {
        var baseSlug = GenerateBaseSlug(productName);
        var slug = baseSlug;
        var suffix = 2;

        while (await context.Products.AnyAsync(
                   product =>
                       product.Slug == slug &&
                       (!currentProductId.HasValue || product.Productid != currentProductId.Value),
                   cancellationToken))
        {
            slug = $"{baseSlug}-{suffix++}";
        }

        return slug;
    }

    public static async Task<string> GenerateUniqueNewsSlugAsync(
        ECommerceContext context,
        string title,
        int? currentPostId = null,
        CancellationToken cancellationToken = default)
    {
        var baseSlug = GenerateBaseSlug(title);
        var slug = baseSlug;
        var suffix = 2;

        while (await context.Contents.AnyAsync(
                   content =>
                       content.Contenttype == "News" &&
                       content.Slug == slug &&
                       (!currentPostId.HasValue || content.Contentid != currentPostId.Value),
                   cancellationToken))
        {
            slug = $"{baseSlug}-{suffix++}";
        }

        return slug;
    }
}
