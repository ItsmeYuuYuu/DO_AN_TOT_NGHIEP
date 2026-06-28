# Email, thanh toán QR và tư vấn realtime

Tài liệu này dùng cho demo/bảo vệ local. Các cấu hình bên dưới không bắt buộc để chạy luồng mặc định, nhưng có thể bật khi cần trình bày nghiệp vụ giống hệ thống thật hơn.

## 1. Gmail SMTP và mã xác nhận đăng ký

Backend đã có `Email` configuration trong `appsettings.json`.

Chạy local bằng user-secrets:

```powershell
dotnet user-secrets set "Email:Enabled" "true" --project BackEnd\ECommerceBackend
dotnet user-secrets set "Email:RequireRegistrationOtp" "true" --project BackEnd\ECommerceBackend
dotnet user-secrets set "Email:Host" "smtp.gmail.com" --project BackEnd\ECommerceBackend
dotnet user-secrets set "Email:Port" "587" --project BackEnd\ECommerceBackend
dotnet user-secrets set "Email:EnableSsl" "true" --project BackEnd\ECommerceBackend
dotnet user-secrets set "Email:Username" "your_gmail@gmail.com" --project BackEnd\ECommerceBackend
dotnet user-secrets set "Email:Password" "your_gmail_app_password" --project BackEnd\ECommerceBackend
dotnet user-secrets set "Email:FromEmail" "your_gmail@gmail.com" --project BackEnd\ECommerceBackend
```

Lưu ý: Gmail cần App Password, không dùng mật khẩu đăng nhập Gmail thường.
Nếu App Password hiển thị có khoảng trắng, nên bỏ khoảng trắng trước khi lưu.

Kiểm tra nhanh bằng Swagger sau khi đăng nhập Admin:

```text
POST /api/auth/email-test
Authorization: Bearer <Admin JWT>
Body: { "email": "mail-rac-can-test@gmail.com" }
```

Nếu chưa bật SMTP, hệ thống vẫn tạo OTP nhưng log mã ra console backend để demo không bị kẹt.

Email hiện gửi cho:

- Mã xác nhận đăng ký tài khoản.
- Thông báo tạo đơn hàng.
- Thông báo cập nhật thanh toán.
- Thông báo đổi trạng thái đơn hàng.

## 2. QR thanh toán

Các phương thức hiện tại:

- `MOMO`, `VNPAY`: hiển thị QR mô phỏng và cho phép bấm mô phỏng thanh toán thành công/thất bại.
- `BANK`: hiển thị VietQR theo nội dung chuyển khoản, nhưng không tự đánh dấu đã thanh toán. Sales phải đối soát và bấm xác nhận trong admin/staff.
- `COD`: chỉ dành cho tài khoản đã đăng nhập, không có QR.

Cấu hình VietQR demo:

```powershell
dotnet user-secrets set "PaymentQr:BankId" "970436" --project BackEnd\ECommerceBackend
dotnet user-secrets set "PaymentQr:AccountNo" "0123456789" --project BackEnd\ECommerceBackend
dotnet user-secrets set "PaymentQr:AccountName" "CUONG DIEN THOAI" --project BackEnd\ECommerceBackend
```

## 3. Consultant chat và trạng thái đang nhập

Luồng tư vấn trực tiếp hiện hoạt động theo polling 3 giây:

- Khách bấm chuyển sang nhân viên tư vấn.
- Consultant nhận phiên trong màn staff.
- Hai bên xem tin nhắn gần realtime.
- Khi một bên đang nhập, bên còn lại thấy trạng thái "đang nhập".

Vì dự án demo local chưa cài SignalR client, cách này ổn định hơn cho bảo vệ và không cần thêm package ngoài.

## 4. Khách vãng lai

Khách vãng lai vẫn cần giữ vì đây là nghiệp vụ phổ biến của web bán hàng: khách có thể mua nhanh mà không cần đăng ký.

Quy tắc chống rủi ro:

- Khách vãng lai không được chọn COD.
- Bắt buộc đặt cọc 30% hoặc thanh toán trước 100%.
- Redis/memory cache giới hạn spam checkout theo IP, số điện thoại và guest token.

Khi khách muốn theo dõi lâu dài, hệ thống vẫn khuyến khích đăng ký tài khoản để xem lịch sử đơn, đánh giá và bảo hành.

## 5. Chatbot trả lời gọn hơn

Chatbot hiện được chỉnh theo hướng:

- Hỏi lại ngân sách hoặc nhu cầu nếu câu hỏi còn mơ hồ.
- Gợi ý tối đa 3 sản phẩm, mỗi sản phẩm chỉ hiển thị 1 phiên bản đại diện trong câu trả lời.
- Card sản phẩm tách riêng để khách bấm thêm giỏ/xem chi tiết.
- So sánh thiếu tên máy rõ ràng thì hỏi lại, không cố đoán sai.
