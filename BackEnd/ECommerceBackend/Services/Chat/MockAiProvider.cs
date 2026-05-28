using System.Threading.Tasks;

namespace ECommerceBackend.Services.Chat
{
    public class MockAiProvider : IAiProvider
    {
        public async Task<string> GetResponseAsync(string userMessage)
        {
            // Simulate AI processing delay
            await Task.Delay(1000);
            return "Tôi là trợ lý ảo cửa hàng. Tôi có thể giúp gì cho bạn? (Mock Response)";
        }
    }
}
