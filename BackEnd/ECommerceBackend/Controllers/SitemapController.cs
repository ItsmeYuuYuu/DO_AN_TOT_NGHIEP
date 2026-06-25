using System.Text;
using System.Security;
using ECommerceBackend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ECommerceBackend.Controllers;

[ApiController]
public class SitemapController : ControllerBase
{
    private readonly ECommerceContext _context;
    private readonly IConfiguration _configuration;

    public SitemapController(ECommerceContext context, IConfiguration configuration)
    {
        _context = context;
        _configuration = configuration;
    }

    [HttpGet("/sitemap.xml")]
    public async Task<IActionResult> GetSitemap(CancellationToken cancellationToken)
    {
        var siteUrl = ResolveSiteUrl();
        var entries = new List<SitemapEntry>
        {
            new("/", "1.0", "daily"),
            new("/products", "0.9", "daily"),
            new("/promotions", "0.8", "daily"),
            new("/news", "0.8", "weekly"),
            new("/policy", "0.5", "monthly"),
            new("/shipping", "0.5", "monthly"),
            new("/return", "0.5", "monthly")
        };

        var products = await _context.Products
            .AsNoTracking()
            .Where(product => product.Slug != null)
            .Select(product => new
            {
                Slug = product.Slug!,
                product.Createdat
            })
            .OrderBy(product => product.Slug)
            .ToListAsync(cancellationToken);

        entries.AddRange(products.Select(product => new SitemapEntry(
            $"/products/{product.Slug}",
            "0.9",
            "weekly",
            product.Createdat)));

        var newsList = await _context.News
            .AsNoTracking()
            .Where(news => news.Isactive == true && news.Slug != null)
            .Select(news => new
            {
                Slug = news.Slug!,
                news.Createdat
            })
            .OrderByDescending(news => news.Createdat)
            .ToListAsync(cancellationToken);

        entries.AddRange(newsList.Select(news => new SitemapEntry(
            $"/news/{news.Slug}",
            "0.7",
            "weekly",
            news.Createdat)));

        var xml = BuildSitemapXml(siteUrl, entries);
        return Content(xml, "application/xml", Encoding.UTF8);
    }

    private string ResolveSiteUrl()
    {
        var configuredUrl = _configuration["Seo:SiteUrl"]
            ?? Environment.GetEnvironmentVariable("SEO_SITE_URL");
        var siteUrl = string.IsNullOrWhiteSpace(configuredUrl)
            ? $"{Request.Scheme}://{Request.Host.Value}"
            : configuredUrl;

        return siteUrl.TrimEnd('/');
    }

    private static string BuildSitemapXml(string siteUrl, IEnumerable<SitemapEntry> entries)
    {
        var builder = new StringBuilder();
        builder.AppendLine("""<?xml version="1.0" encoding="UTF-8"?>""");
        builder.AppendLine("""<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">""");

        foreach (var entry in entries)
        {
            builder.AppendLine("  <url>");
            builder.AppendLine($"    <loc>{XmlEscape($"{siteUrl}{entry.Path}")}</loc>");
            if (entry.LastModified.HasValue)
            {
                builder.AppendLine($"    <lastmod>{entry.LastModified.Value:yyyy-MM-dd}</lastmod>");
            }
            builder.AppendLine($"    <changefreq>{entry.ChangeFrequency}</changefreq>");
            builder.AppendLine($"    <priority>{entry.Priority}</priority>");
            builder.AppendLine("  </url>");
        }

        builder.AppendLine("</urlset>");
        return builder.ToString();
    }

    private static string XmlEscape(string value) => SecurityElement.Escape(value) ?? value;

    private sealed record SitemapEntry(
        string Path,
        string Priority,
        string ChangeFrequency,
        DateTime? LastModified = null);
}
