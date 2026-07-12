# Checklist demo sau refactor

## Checkout và vận chuyển

- Khách vãng lai chọn địa chỉ TP.HCM: thấy COD và chuyển khoản; đơn COD được ghi nhận là giao nội bộ (`STORE_DELIVERY`).
- Khách vãng lai chọn tỉnh khác TP.HCM: không thể tạo đơn; thông báo yêu cầu đăng nhập.
- Khách đã đăng nhập: có thể dùng đối tác GHN, GHTK, Viettel Post hoặc J&T.
- Đơn đang giao: chuyển sang `DamageClaim` hoặc `LostClaim`; kiểm tra `statuslogs` có `ActionType = CarrierClaim`, bên chịu trách nhiệm là Carrier và bồi thường ở trạng thái Pending.

## Nội dung

- Tạo/sửa tin tức bằng CKEditor, kiểm tra định dạng HTML được lưu và hiển thị.
- Tạo banner/khuyến mãi từ màn quản trị; kiểm tra cùng được lưu trong `contents` với `ContentType` tương ứng.
- Thêm/sửa mô tả sản phẩm bằng CKEditor; upload ảnh mô tả và kiểm tra URL được chèn vào HTML.

## Dữ liệu và quyền

- Ảnh biến thể, ảnh đổi trả/bảo hành và giỏ hàng phải được lưu ở cột JSONB.
- Chỉ Admin/Manager/Content được sửa nội dung; Sales/Warehouse không được gọi API content.
- Sales xác nhận đơn, Warehouse xác nhận IMEI, tạo vận đơn và hoàn tất giao hàng.

## Lệnh kiểm tra

```powershell
dotnet build BackEnd\ECommerceBackend\ECommerceBackend.csproj --no-restore
npm --prefix FrontEnd run build
dotnet ef migrations list --project BackEnd\ECommerceBackend\ECommerceBackend.csproj
```
