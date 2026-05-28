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
        string Title // Giả sử Status có thể dùng làm title hoặc FE tự hiển thị
    );

    public record ChatMessageDto(
        int Messageid,
        int? Sessionid,
        string Sendertype,
        string Messagecontent,
        DateTime? Sentat
    );

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
        [StringLength(2000, ErrorMessage = "Nội dung tin nhắn không được vượt quá 2000 ký tự.")]
        public string Messagecontent { get; set; } = string.Empty;
    }
}
