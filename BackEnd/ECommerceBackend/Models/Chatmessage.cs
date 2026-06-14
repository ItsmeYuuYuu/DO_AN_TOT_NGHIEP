using System;
using System.Collections.Generic;

namespace ECommerceBackend.Models;

public partial class Chatmessage
{
    public int Messageid { get; set; }

    public int? Sessionid { get; set; }

    public string Sendertype { get; set; } = null!;

    public string Messagecontent { get; set; } = null!;

    public string? Responsetype { get; set; }

    public string? Quickreplies { get; set; }

    public DateTime? Sentat { get; set; }

    public virtual ICollection<Chatproductrecommendation> Chatproductrecommendations { get; set; } = new List<Chatproductrecommendation>();

    public virtual Chatsession? Session { get; set; }
}
