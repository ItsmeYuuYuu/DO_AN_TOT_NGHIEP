using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using ECommerceBackend.DTOs.Auth;
using ECommerceBackend.Models;
using ECommerceBackend.Services.Email;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Npgsql;

namespace ECommerceBackend.IntegrationTests.Infrastructure;

public sealed class IntegrationTestFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    private const string Password = "Integration@123";
    private readonly string _databaseName = $"ecommerce_it_{Guid.NewGuid():N}";
    private readonly string _testWebRoot = Path.Combine(
        Path.GetTempPath(),
        $"ecommerce_it_wwwroot_{Guid.NewGuid():N}");
    private string _adminConnectionString = string.Empty;
    private string _testConnectionString = string.Empty;

    public HttpClient Client { get; private set; } = null!;
    public TestSeed Seed { get; private set; } = null!;

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.UseWebRoot(_testWebRoot);
        builder.ConfigureAppConfiguration((_, configuration) =>
        {
            configuration.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:DefaultConnection"] = _testConnectionString,
                ["Email:Enabled"] = "false",
                ["Sepay:ApiKey"] = "integration-sepay-key"
            });
        });
        builder.ConfigureServices(services =>
        {
            services.RemoveAll<DbContextOptions<ECommerceContext>>();
            services.RemoveAll<ECommerceContext>();
            services.AddDbContext<ECommerceContext>(options => options.UseNpgsql(_testConnectionString));
            services.RemoveAll<IEmailService>();
            services.AddSingleton<TestEmailService>();
            services.AddSingleton<IEmailService>(provider => provider.GetRequiredService<TestEmailService>());
        });
    }

    public async Task InitializeAsync()
    {
        AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);
        Directory.CreateDirectory(_testWebRoot);
        var source = LoadSourceConnectionString();
        var adminBuilder = new NpgsqlConnectionStringBuilder(source) { Database = "postgres", Pooling = false };
        var testBuilder = new NpgsqlConnectionStringBuilder(source)
        {
            Database = _databaseName,
            Pooling = false
        };
        _adminConnectionString = adminBuilder.ConnectionString;
        _testConnectionString = testBuilder.ConnectionString;

        var databaseCreated = false;
        try
        {
            await using (var admin = new NpgsqlConnection(_adminConnectionString))
            {
                await admin.OpenAsync();
                await using var create = new NpgsqlCommand($"CREATE DATABASE \"{_databaseName}\"", admin);
                await create.ExecuteNonQueryAsync();
                databaseCreated = true;
            }

            Client = CreateClient(new WebApplicationFactoryClientOptions
            {
                AllowAutoRedirect = false,
                BaseAddress = new Uri("http://localhost")
            });

            await using var scope = Services.CreateAsyncScope();
            var db = scope.ServiceProvider.GetRequiredService<ECommerceContext>();
            await db.Database.EnsureCreatedAsync();
            Seed = await SeedAsync(db);
        }
        catch
        {
            if (databaseCreated) await DropTestDatabaseAsync();
            DeleteTestWebRoot();
            throw;
        }
    }

    async Task IAsyncLifetime.DisposeAsync()
    {
        Client?.Dispose();
        await base.DisposeAsync();

        await DropTestDatabaseAsync();
        DeleteTestWebRoot();
    }

    private void DeleteTestWebRoot()
    {
        if (Directory.Exists(_testWebRoot))
            Directory.Delete(_testWebRoot, recursive: true);
    }

    public async Task<(string ReferencedFile, string UnusedFile)> SeedCleanupImagesAsync()
    {
        const string referencedFile = "integration-referenced.png";
        const string unusedFile = "integration-unused.png";
        var uploadDirectory = Path.Combine(_testWebRoot, "uploads", "products");
        Directory.CreateDirectory(uploadDirectory);

        foreach (var fileName in new[] { referencedFile, unusedFile })
        {
            var path = Path.Combine(uploadDirectory, fileName);
            await File.WriteAllBytesAsync(path, [0x89, 0x50, 0x4E, 0x47]);
            File.SetLastWriteTimeUtc(path, DateTime.UtcNow.AddHours(-48));
        }

        await using var scope = Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<ECommerceContext>();
        var product = await db.Products.FirstAsync(item => item.Productname == "Integration Phone");
        product.Description = $"<p><img src=\"/uploads/products/{referencedFile}\"></p>";
        await db.SaveChangesAsync();

        return (referencedFile, unusedFile);
    }

    private async Task DropTestDatabaseAsync()
    {
        if (string.IsNullOrWhiteSpace(_adminConnectionString)) return;
        await using var admin = new NpgsqlConnection(_adminConnectionString);
        await admin.OpenAsync();
        await using var drop = new NpgsqlCommand($"DROP DATABASE IF EXISTS \"{_databaseName}\" WITH (FORCE)", admin);
        await drop.ExecuteNonQueryAsync();
    }

    public async Task<HttpClient> CreateAuthenticatedClientAsync(string username)
    {
        var client = CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false,
            BaseAddress = new Uri("http://localhost")
        });
        var response = await client.PostAsJsonAsync("/api/Auth/login", new { username, password = Password });
        response.EnsureSuccessStatusCode();
        var login = await response.Content.ReadFromJsonAsync<LoginResponseDto>()
            ?? throw new InvalidOperationException("Login response was empty.");
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", login.AccessToken);
        return client;
    }

    private static async Task<TestSeed> SeedAsync(ECommerceContext db)
    {
        var adminRole = new Role { Rolename = "Admin" };
        var customerRole = new Role { Rolename = "Customer" };
        db.Roles.AddRange(adminRole, customerRole);

        var admin = NewUser("it_admin", "Integration Admin", "it.admin@example.test", adminRole);
        var customerAUser = NewUser("it_customer_a", "Integration Customer A", "it.a@example.test", customerRole);
        var customerBUser = NewUser("it_customer_b", "Integration Customer B", "it.b@example.test", customerRole);
        var passwordResetUser = NewUser("it_reset", "Integration Reset User", "it.reset@example.test", customerRole);
        passwordResetUser.Phone = "0900000003";
        db.Users.AddRange(admin, customerAUser, customerBUser, passwordResetUser);

        var customerA = new Customer
        {
            Fullname = customerAUser.Fullname,
            Email = customerAUser.Email,
            Phone = "0900000001",
            Address = "Quận 1, Thành phố Hồ Chí Minh",
            Createdat = DateTime.UtcNow
        };
        var customerB = new Customer
        {
            Fullname = customerBUser.Fullname,
            Email = customerBUser.Email,
            Phone = "0900000002",
            Address = "Quận 3, Thành phố Hồ Chí Minh",
            Createdat = DateTime.UtcNow
        };
        db.Customers.AddRange(customerA, customerB);

        var category = new Category { Categoryname = "Integration Phones" };
        var brand = new Brand { Brandname = "Integration Brand" };
        var product = new Product
        {
            Productname = "Integration Phone",
            Slug = "integration-phone",
            Seriesname = "Integration Series",
            Category = category,
            Brand = brand,
            Createdat = DateTime.UtcNow
        };
        var variant = new Productvariant
        {
            Product = product,
            Sku = "IT-PHONE-128",
            Baseprice = 1_000_000m,
            Saleprice = 900_000m,
            Condition = "New",
            Imageurls = "[]",
            Specifications = "{}"
        };
        db.Productvariants.Add(variant);

        var inventoryA = NewInventory("IT-IMEI-0001", variant, "Sold");
        var inventoryB = NewInventory("IT-IMEI-0002", variant, "Sold");
        var inventoryCheckout = NewInventory("IT-IMEI-0003", variant, "InStock");
        db.Inventoryitems.AddRange(inventoryA, inventoryB, inventoryCheckout);

        var orderA = NewCompletedOrder(customerAUser, customerA, "0900000001");
        var itemA = new Orderitem { Order = orderA, ImeiNavigation = inventoryA, Sellingprice = 1_000_000m };
        orderA.Orderitems.Add(itemA);
        var orderB = NewCompletedOrder(customerAUser, customerA, "0900000001");
        var itemB = new Orderitem { Order = orderB, ImeiNavigation = inventoryB, Sellingprice = 1_000_000m };
        orderB.Orderitems.Add(itemB);
        db.Orders.AddRange(orderA, orderB);
        await db.SaveChangesAsync();

        var refundInfo = JsonSerializer.Serialize(new
        {
            Method = "BANK",
            Bankname = "Integration Bank",
            Accountnumber = "1234567890",
            Accountholder = "INTEGRATION CUSTOMER A",
            Confirmed = true
        });
        var returnA = NewRefundRequest(orderA, customerA, customerAUser, itemA, refundInfo);
        var returnB = NewRefundRequest(orderB, customerA, customerAUser, itemB, refundInfo);
        db.Returnrequests.AddRange(returnA, returnB);
        await db.SaveChangesAsync();

        return new TestSeed(
            admin.Userid,
            customerAUser.Userid,
            customerBUser.Userid,
            orderA.Orderid,
            returnA.Returnrequestid,
            returnB.Returnrequestid,
            variant.Variantid);
    }

    private static User NewUser(string username, string fullname, string email, Role role) => new()
    {
        Username = username,
        Fullname = fullname,
        Email = email,
        Phone = username.EndsWith('a') ? "0900000001" : "0900000002",
        Passwordhash = BCrypt.Net.BCrypt.HashPassword(Password),
        Isactive = true,
        Createdat = DateTime.UtcNow,
        Role = role
    };

    private static Inventoryitem NewInventory(string imei, Productvariant variant, string status) => new()
    {
        Imei = imei,
        Variant = variant,
        Status = status,
        Importedat = DateTime.UtcNow,
        Warrantystatus = status == "Sold" ? "Active" : null,
        Warrantystartdate = status == "Sold" ? DateTime.UtcNow.AddDays(-1) : null,
        Warrantyenddate = status == "Sold" ? DateTime.UtcNow.AddYears(1) : null
    };

    private static Order NewCompletedOrder(User user, Customer customer, string phone) => new()
    {
        User = user,
        Customer = customer,
        Orderdate = DateTime.UtcNow,
        Totalamount = 1_000_000m,
        Discountamount = 100_000m,
        Finalamount = 900_000m,
        Paymentmethod = "BANK",
        Paymentstatus = "Paid",
        Paidamount = 900_000m,
        Requiredpayment = 900_000m,
        Checkouttype = "Member",
        Orderstatus = "Completed",
        Shippingname = customer.Fullname,
        Shippingphone = phone,
        Shippingemail = customer.Email,
        Shippingaddress = customer.Address
    };

    private static Returnrequest NewRefundRequest(
        Order order,
        Customer customer,
        User user,
        Orderitem orderItem,
        string refundInfo)
    {
        var request = new Returnrequest
        {
            Order = order,
            Customer = customer,
            Requestedbyuser = user,
            Requesttype = "Return",
            Reason = "Integration refund",
            Status = "RefundPending",
            Requestedrefundamount = 900_000m,
            Refundstatus = "Pending",
            Refundinfo = refundInfo,
            Imageurls = "[]",
            Requestedat = DateTime.UtcNow,
            Reviewedat = DateTime.UtcNow,
            Receivedat = DateTime.UtcNow,
            Updatedat = DateTime.UtcNow
        };
        request.Returnitems.Add(new Returnitem
        {
            Orderitem = orderItem,
            Imei = orderItem.Imei!,
            Refundamount = 900_000m,
            Condition = "Good",
            Disposition = "Restock"
        });
        return request;
    }

    private static string LoadSourceConnectionString()
    {
        var fromEnvironment = Environment.GetEnvironmentVariable("E2E_SOURCE_CONNECTION");
        if (!string.IsNullOrWhiteSpace(fromEnvironment)) return fromEnvironment;

        foreach (var start in new[] { Directory.GetCurrentDirectory(), AppContext.BaseDirectory })
        {
            var directory = new DirectoryInfo(start);
            while (directory != null)
            {
                var envPath = Path.Combine(directory.FullName, ".env");
                if (File.Exists(envPath))
                {
                    var connectionLine = File.ReadLines(envPath)
                        .Select(line => line.Trim())
                        .FirstOrDefault(line =>
                            line.StartsWith(
                                "ConnectionStrings__DefaultConnection=",
                                StringComparison.OrdinalIgnoreCase));
                    if (connectionLine != null)
                    {
                        var connectionString = connectionLine[(connectionLine.IndexOf('=') + 1)..].Trim();
                        if (!string.IsNullOrWhiteSpace(connectionString))
                        {
                            return connectionString.Trim('"', '\'');
                        }
                    }
                }

                var settingsPath = Path.Combine(directory.FullName, "BackEnd", "ECommerceBackend", "appsettings.json");
                if (File.Exists(settingsPath))
                {
                    using var json = JsonDocument.Parse(File.ReadAllText(settingsPath));
                    var connectionString = json.RootElement
                        .GetProperty("ConnectionStrings")
                        .GetProperty("DefaultConnection")
                        .GetString();
                    if (!string.IsNullOrWhiteSpace(connectionString))
                    {
                        return connectionString;
                    }
                }
                directory = directory.Parent;
            }
        }

        throw new InvalidOperationException(
            "Cannot locate a PostgreSQL source connection. Configure .env or set E2E_SOURCE_CONNECTION.");
    }
}

public sealed record TestSeed(
    int AdminUserId,
    int CustomerAUserId,
    int CustomerBUserId,
    int CustomerAOrderId,
    int CustomerAReturnId,
    int SecondReturnId,
    int CheckoutVariantId);
