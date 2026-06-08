# Chatbot tư vấn sản phẩm

Chatbot luôn truy xuất dữ liệu sản phẩm, biến thể, giá và tồn kho từ PostgreSQL trước khi trả lời.

## Cấu hình hiện tại: Ollama local

Máy hiện dùng:

```json
"AiAssistant": {
  "Provider": "OpenAICompatible",
  "BaseUrl": "http://localhost:11434/v1",
  "ApiKey": "",
  "Model": "qwen2.5:3b"
}
```

Model chạy trên máy qua Ollama. Dữ liệu catalog vẫn được lấy từ PostgreSQL trước khi gửi vào model.

## Chạy không cần model

Đổi `Provider` thành `Catalog`. Chế độ này vẫn trả lời động bằng dữ liệu cửa hàng và không gọi dịch vụ bên ngoài.

## Dùng model OpenAI-compatible

Đổi cấu hình:

```json
"AiAssistant": {
  "Provider": "OpenAICompatible",
  "BaseUrl": "https://api.openai.com/v1",
  "ApiKey": "YOUR_API_KEY",
  "Model": "YOUR_MODEL_NAME",
  "TimeoutSeconds": 60,
  "MaxHistoryMessages": 12,
  "MaxRetrievedVariants": 5
}
```

Có thể dùng Ollama local qua API tương thích:

```json
"AiAssistant": {
  "Provider": "OpenAICompatible",
  "BaseUrl": "http://localhost:11434/v1",
  "ApiKey": "",
  "Model": "qwen2.5:3b"
}
```

Nếu model không phản hồi, hệ thống tự quay về câu trả lời dựa trên catalog và luồng chuyển Consultant vẫn hoạt động.
