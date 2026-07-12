# Schema sau refactor

Các thay đổi chính:

- `news` và nội dung banner/khuyến mãi dùng chung bảng `contents`.
- `productseries`, `productimages`, `cartitems`, các bảng lịch sử riêng và bảng content cũ đã được loại khỏi schema hoạt động.
- URL ảnh và dữ liệu giỏ hàng được lưu JSONB tại bảng chủ.
- `statuslogs` ghi lịch sử dùng chung, gồm `EntityType`, `EntityId`, `ActionType`, trạng thái trước/sau, ghi chú và `Metadata` JSONB.

## Bảng nội dung chung

`contents` chứa `News`, `Banner` và `Promotion`. HTML CKEditor được lưu ở `htmlcontent`; thumbnail/link và cấu hình đặc thù nằm ở các cột URL/JSONB.

## Sự cố vận chuyển

Khi hàng bị hư hỏng hoặc thất lạc bởi đơn vị vận chuyển, shipment chuyển sang `DamageClaim`/`LostClaim`. Một log `CarrierClaim` được tạo với bên chịu trách nhiệm là Carrier, trạng thái khiếu nại `Open` và trạng thái bồi thường `Pending`.
