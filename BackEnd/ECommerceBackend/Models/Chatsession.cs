using System;
using System.Collections.Generic;

namespace ECommerceBackend.Models;

public partial class Chatsession
{
    public int Sessionid { get; set; }

    public int? Customerid { get; set; }

    public string? Guestsessiontoken { get; set; }

    public DateTime? Starttime { get; set; }

    public DateTime? Endtime { get; set; }

    public string? Status { get; set; }

    public virtual ICollection<Chatmessage> Chatmessages { get; set; } = new List<Chatmessage>();

    public virtual Customer? Customer { get; set; }
}
