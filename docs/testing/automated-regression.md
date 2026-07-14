# Kiểm thử regression tự động

Bộ kiểm thử này bổ sung lớp kiểm tra lặp lại được cho các nghiệp vụ có rủi ro cao. Nó không thay thế checklist demo thủ công theo từng vai trò.

## Phạm vi hiện có

- Backend integration test chạy qua HTTP thật với JWT và Entity Framework Core.
- Khách hàng không thể xem đơn hàng hoặc yêu cầu đổi trả của khách khác.
- Chủ sở hữu vẫn xem được đơn hàng và yêu cầu đổi trả của mình.
- Không thể ghi nhận hai giao dịch hoàn tiền có cùng mã giao dịch.
- Customer có thể tạo đơn COD nội thành TP.HCM.
- Dọn ảnh sản phẩm chỉ xóa file cũ không còn được database tham chiếu.
- Frontend E2E kiểm tra guest checkout COD nội thành và tạo yêu cầu trả hàng nhận tiền mặt.

Các bài frontend mock biên API để ổn định và không ghi dữ liệu vào database thật. Các bài backend tạo một database PostgreSQL riêng có tên `ecommerce_it_<guid>`, seed dữ liệu riêng và `DROP DATABASE ... WITH (FORCE)` sau khi chạy, kể cả khi bài test thất bại trong giai đoạn thực thi.

## Chuẩn bị lần đầu

Yêu cầu .NET 8, Node.js/npm và PostgreSQL đang chạy. Tài khoản PostgreSQL dùng cho test phải có quyền `CREATE DATABASE`.

Từ thư mục gốc dự án:

```powershell
.\scripts\run-regression.ps1 -InstallDependencies
```

Mặc định test backend đọc `ConnectionStrings:DefaultConnection` trong `BackEnd/ECommerceBackend/appsettings.json`. Có thể chỉ định kết nối khác mà không sửa file cấu hình:

```powershell
$env:E2E_SOURCE_CONNECTION = "Host=localhost;Port=5432;Database=ECommerDB;Username=postgres;Password=..."
.\scripts\run-regression.ps1
```

## Chạy thường xuyên

```powershell
.\scripts\run-regression.ps1
```

Lệnh trên lần lượt chạy backend integration test, ESLint, frontend production build và Playwright E2E. Khi cần chạy nhanh một phần có thể dùng `-SkipLint` hoặc `-SkipBuild`.

Chạy riêng từng nhóm:

```powershell
dotnet test .\BackEnd\ECommerceBackend.IntegrationTests\ECommerceBackend.IntegrationTests.csproj

Set-Location .\FrontEnd
npm run test:e2e
```

Playwright lưu báo cáo lỗi trong `FrontEnd/test-results` và `FrontEnd/playwright-report`; hai thư mục này đã được ignore khỏi Git.

## Nguyên tắc an toàn dữ liệu

- Không chạy test integration trực tiếp trên database nghiệp vụ.
- Factory chỉ lấy thông tin máy chủ/tài khoản từ connection string nguồn rồi tạo database tên ngẫu nhiên.
- Test không xóa hoặc sửa database được ghi trong `appsettings.json`.
- Nếu tiến trình bị tắt cưỡng bức trước bước cleanup, xóa thủ công database còn sót có tiền tố `ecommerce_it_` sau khi xác nhận không còn test nào đang chạy.
