# Cập nhật phiên bản production

Website production: `https://cdt204.io.vn`.

Quy trình này build backend và frontend trên máy Windows, tải gói phát hành lên VPS,
backup dữ liệu, thay phiên bản đang chạy và tự phục hồi mã nguồn cũ nếu health check
thất bại.

## Điều kiện

- PowerShell có `dotnet`, `npm`, `tar`, `ssh` và `scp` trong `PATH`.
- SSH key của máy Windows đăng nhập được `deploy@103.109.187.196`.
- VPS đã có service `cuongdienthoai-api`.
- VPS đã có `/usr/local/sbin/backup-cuongdienthoai`.
- Tài khoản `deploy` có quyền `sudo`.
- File `/etc/cuongdienthoai/ecommerce.env` đã chứa cấu hình production.

## Triển khai

Chạy từ thư mục gốc của repository:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\deploy-production.ps1
```

Script sẽ yêu cầu mật khẩu `sudo` của tài khoản `deploy` khi kích hoạt phiên bản.
Nếu thành công, kết quả hiển thị release ID và địa chỉ website.

## Các bước an toàn được thực hiện

1. `dotnet publish` backend ở cấu hình Release.
2. `npm run build` frontend với `FrontEnd/.env.production`.
3. Đóng gói và tải release lên `/home/deploy/releases/<release-id>`.
4. Backup PostgreSQL và uploads ngay trước khi thay phiên bản.
5. Giữ API và web cũ trong `/var/backups/cuongdienthoai/releases/<release-id>`.
6. Khởi động API và kiểm tra `/api/health`.
7. Kiểm tra Nginx, trang chủ và health endpoint công khai.
8. Tự động đưa API và web cũ trở lại nếu một bước kiểm tra thất bại.
9. Chỉ giữ năm bản rollback mã nguồn gần nhất.

## Sau khi triển khai

Kiểm tra:

```powershell
ssh deploy@103.109.187.196 "systemctl is-active cuongdienthoai-api nginx"
curl.exe -I https://cdt204.io.vn
curl.exe https://cdt204.io.vn/api/health
```

Sau khi xác nhận release ổn định, xóa gói upload của release theo đường dẫn mà script
đã in ra:

```powershell
ssh deploy@103.109.187.196 "rm -rf '/home/deploy/releases/<release-id>'"
```

## Thay đổi cơ sở dữ liệu

Script không tự chạy Entity Framework migration. Khi release có migration mới:

1. Backup production.
2. Kiểm tra migration trên bản sao database.
3. Chọn thời gian bảo trì.
4. Áp dụng migration riêng.
5. Sau đó mới chạy script phát hành.

Việc tách migration khỏi cập nhật mã nguồn tránh trường hợp rollback binary nhưng schema
đã bị thay đổi không tương thích.
