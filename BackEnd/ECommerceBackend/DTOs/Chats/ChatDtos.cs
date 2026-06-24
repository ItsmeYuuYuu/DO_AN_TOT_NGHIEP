using System;
using System.ComponentModel.DataAnnotations;

namespace ECommerceBackend.DTOs.Chats
{
    public record ChatSessionDto(
        int Sessionid,
        int? Customerid,
        string? Guestsessiontoken,
        DateTime? Starttime,
        DateTime? Endtime,
        string? Status,
        string Title,
        int? Assigneduserid = null,
        string? Assignedname = null,
        string? Handoffstatus = null,
        DateTime? Handoffrequestedat = null,
        string? Customername = null
    );

    public record ChatMessageDto(
        int Messageid,
        int? Sessionid,
        string Sendertype,
        string Messagecontent,
        DateTime? Sentat,
        IReadOnlyList<ChatRecommendationDto>? Recommendations = null,
        string? Responsetype = null,
        IReadOnlyList<string>? Quickreplies = null
    );

    public record ChatRecommendationDto(
        int Recommendationid,
        int Productid,
        string? Productslug,
        int Variantid,
        string Productname,
        string Variantname,
        string Sku,
        string Imageurl,
        decimal Price,
        decimal Baseprice,
        int Stock,
        string Condition,
        int Rank,
        DateTime? Addedtocartat,
        DateTime? Orderedat,
        int? Orderid,
        string Brand,
        string Specifications
    );

    public record ChatRecommendationProductMetricDto(
        int Productid,
        string Productname,
        int Recommended,
        int Addedtocart,
        int Ordered);

    public record ChatRecommendationMetricsDto(
        int Totalrecommendations,
        int Addedtocart,
        int Ordered,
        decimal Addtocartrate,
        decimal Orderrate,
        IReadOnlyList<ChatRecommendationProductMetricDto> Topproducts);

    public class CreateChatSessionRequestDto
    {
        public string? Title { get; set; } // Map vào Status tạm thời nếu DB chưa có cột Title
    }

    public class UpdateChatSessionRequestDto
    {
        public string? Title { get; set; }
    }

    public class CreateChatMessageRequestDto
    {
        [Required(ErrorMessage = "Nội dung tin nhắn không được để trống.")]
        [StringLength(500, ErrorMessage = "Nội dung tin nhắn không được vượt quá 500 ký tự.")]
        public string Messagecontent { get; set; } = string.Empty;
    }
}
