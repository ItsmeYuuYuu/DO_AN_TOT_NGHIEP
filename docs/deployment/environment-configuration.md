# Cấu hình môi trường local và VPS

## Nguyên tắc

Dự án dùng cùng một source code cho local và production. Sự khác biệt nằm ở biến môi
trường:

- Local: React gọi `https://localhost:7035/api`, PostgreSQL chạy trên máy cá nhân.
- VPS: React gọi `/api`; Nginx chuyển `/api` tới ASP.NET Core và phục vụ `/uploads`.
- File `.env` thật không được commit. Repository chỉ lưu `.env.example`.

## Chạy local

1. Copy `.env.example` thành `.env` tại thư mục gốc.
2. Điền mật khẩu PostgreSQL và các dịch vụ cần dùng.
3. Giữ `ASPNETCORE_ENVIRONMENT=Development`.
4. Chạy `start-local.bat`.

Backend tìm `.env` từ thư mục dự án. Frontend dùng `FrontEnd/.env.development`, vì vậy
quy trình chạy local không phụ thuộc cấu hình VPS.

## Cấu hình production

Production đọc biến môi trường từ:

```text
/etc/cuongdienthoai/ecommerce.env
```

Các giá trị quan trọng:

```env
ASPNETCORE_ENVIRONMENT=Production
ASPNETCORE_URLS=http://127.0.0.1:5240
ConnectionStrings__DefaultConnection=Host=127.0.0.1;Port=5432;Database=ECommerDB;Username=ecommerce_app;Password=MAT_KHAU_MANH
ConnectionStrings__Redis=127.0.0.1:6379
JwtSettings__SecretKey=CHUOI_NGAU_NHIEN_DAI_IT_NHAT_32_KY_TU
Cors__AllowedOrigins=https://cdt204.io.vn
Seo__SiteUrl=https://cdt204.io.vn
Sepay__ApiKey=KHOA_WEBHOOK_SEPAY
```

Frontend production dùng:

```env
VITE_API_URL=/api
```

Do đó frontend không cần biết cổng nội bộ của backend.

## Bảo mật

- Chỉ Nginx mở cổng 80/443 ra Internet.
- PostgreSQL, Redis, Ollama và Kestrel chỉ lắng nghe localhost.
- Không commit JWT secret, mật khẩu PostgreSQL, Gmail App Password hoặc SePay key.
- Secret từng xuất hiện công khai phải được thay mới.
- File production có quyền `root:www-data` và mode `640`.
- Backup PostgreSQL và uploads chạy tự động bằng `cuongdienthoai-backup.timer`.

## Cập nhật phiên bản

Sử dụng `scripts/deploy-production.ps1`. Hướng dẫn đầy đủ nằm trong
`docs/deployment/production-release.md`.
