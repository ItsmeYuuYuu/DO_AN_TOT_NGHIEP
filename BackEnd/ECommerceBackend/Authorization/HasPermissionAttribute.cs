using Microsoft.AspNetCore.Authorization;

namespace ECommerceBackend.Authorization;

public sealed class HasPermissionAttribute : AuthorizeAttribute
{
    public HasPermissionAttribute(string permission)
    {
        Policy = permission;
    }
}
