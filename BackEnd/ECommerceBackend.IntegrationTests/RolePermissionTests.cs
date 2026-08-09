using System.Net;
using System.Net.Http.Json;
using ECommerceBackend.DTOs.Auth;
using ECommerceBackend.DTOs.Common;
using ECommerceBackend.DTOs.Roles;
using ECommerceBackend.DTOs.Users;
using ECommerceBackend.IntegrationTests.Infrastructure;

namespace ECommerceBackend.IntegrationTests;

public sealed class RolePermissionTests : IClassFixture<IntegrationTestFactory>
{
    private readonly IntegrationTestFactory _factory;
    public RolePermissionTests(IntegrationTestFactory factory) => _factory = factory;

    [Fact]
    public async Task Login_Rejects_Script_Shaped_Identifier_Before_Querying_Account()
    {
        using var client = _factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/Auth/login", new
        {
            username = "<script>alert(1)</script>",
            password = "irrelevant"
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task User_Can_Receive_Permission_From_Custom_Role()
    {
        using var admin = await _factory.CreateAuthenticatedClientAsync("it_admin");
        var roleResponse = await admin.PostAsJsonAsync("/api/Roles", new
        {
            rolename = "CustomerReader",
            permissions = new[] { "customers.view" }
        });
        roleResponse.EnsureSuccessStatusCode();
        var role = await roleResponse.Content.ReadFromJsonAsync<RoleDto>();
        Assert.NotNull(role);

        var username = $"reader_{Guid.NewGuid():N}"[..20];
        var userResponse = await admin.PostAsJsonAsync("/api/Users", new
        {
            username,
            password = "Integration@123",
            fullname = "Integration Reader",
            email = $"{username}@example.test",
            phone = "0912345678",
            roleids = new[] { role!.Roleid },
            isactive = true
        });
        userResponse.EnsureSuccessStatusCode();

        using var reader = await _factory.CreateAuthenticatedClientAsync(username);
        var customers = await reader.GetAsync("/api/Customers?page=1&pageSize=10&query=Integration");
        Assert.Equal(HttpStatusCode.OK, customers.StatusCode);

        var login = await reader.PostAsJsonAsync("/api/Auth/login", new { username, password = "Integration@123" });
        login.EnsureSuccessStatusCode();
        var access = await login.Content.ReadFromJsonAsync<LoginResponseDto>();
        Assert.Contains("CustomerReader", access!.Rolenames!);
        Assert.Contains("customers.view", access.Permissions!);
    }

    [Fact]
    public async Task Staff_List_Filters_And_Paginates_On_Server_Without_Hard_Delete()
    {
        using var admin = await _factory.CreateAuthenticatedClientAsync("it_admin");
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var roleResponse = await admin.PostAsJsonAsync("/api/Roles", new
        {
            rolename = $"FilterRole{suffix}",
            permissions = Array.Empty<string>()
        });
        roleResponse.EnsureSuccessStatusCode();
        var role = await roleResponse.Content.ReadFromJsonAsync<RoleDto>();
        Assert.NotNull(role);

        async Task<UserListItemDto> CreateStaffAsync(string marker, bool isActive)
        {
            var response = await admin.PostAsJsonAsync("/api/Users", new
            {
                username = $"filter_{marker}_{suffix}",
                password = "Integration@123",
                fullname = $"Server Filter {marker} {suffix}",
                email = $"filter_{marker}_{suffix}@example.test",
                phone = marker == "active" ? "0911111111" : "0922222222",
                roleids = new[] { role!.Roleid },
                isactive = isActive
            });
            response.EnsureSuccessStatusCode();
            return (await response.Content.ReadFromJsonAsync<UserListItemDto>())!;
        }

        var activeUser = await CreateStaffAsync("active", true);
        var lockedUser = await CreateStaffAsync("locked", false);

        var listResponse = await admin.GetAsync(
            $"/api/Users?query={suffix}&roleId={role!.Roleid}&isActive=false&page=1&pageSize=5");
        listResponse.EnsureSuccessStatusCode();
        var page = await listResponse.Content.ReadFromJsonAsync<PagedResultDto<UserListItemDto>>();

        Assert.NotNull(page);
        Assert.Equal(1, page.TotalCount);
        Assert.Equal(5, page.PageSize);
        Assert.Equal(lockedUser.Userid, Assert.Single(page.Items).Userid);
        Assert.DoesNotContain(page.Items, item => item.Userid == activeUser.Userid);

        var deleteResponse = await admin.DeleteAsync($"/api/Users/{lockedUser.Userid}");
        Assert.Equal(HttpStatusCode.MethodNotAllowed, deleteResponse.StatusCode);
    }
}
