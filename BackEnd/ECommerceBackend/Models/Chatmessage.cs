using System;
using System.Collections.Generic;

namespace ECommerceBackend.Models;

public partial class Chatmessage
{
    public int Messageid { get; set; }

    public int? Sessionid { get; set; }

    public string Sendertype { get; set; } = null!;

    public string Messagecontent { get; set; } = null!;

    public DateTime? Sentat { get; set; }

    public virtual Chatsession? Session { get; set; }
}
