namespace ECommerceBackend.Models;

/// <summary>Shared editorial content: news articles, homepage banners and promotions.</summary>
public partial class Content
{
    public int Contentid { get; set; }
    public string Contenttype { get; set; } = null!;
    public string Title { get; set; } = null!;
    public string? Slug { get; set; }
    public string? Summary { get; set; }
    public string? Htmlcontent { get; set; }
    public string? Thumbnailurl { get; set; }
    public string? Linkurl { get; set; }
    public string? Contentdata { get; set; }
    public int? Displayorder { get; set; }
    public bool? Isactive { get; set; }
    public int? Createdbyuserid { get; set; }
    public DateTime? Createdat { get; set; }
    public virtual User? Createdbyuser { get; set; }
}
