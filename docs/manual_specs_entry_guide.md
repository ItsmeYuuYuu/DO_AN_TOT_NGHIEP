# Hướng dẫn Nhập liệu Thông số kỹ thuật (Manual Specs Entry Guide)

Tài liệu này hướng dẫn bạn quy trình 10-15 phút để nhập liệu chính xác thông số kỹ thuật (specs) cho một mẫu điện thoại từ nguồn (ưu tiên MobileCity).

## Quy trình Nhập liệu

### Bước 1: Mở trang sản phẩm
1. Mở trang web nguồn (Ví dụ: `mobilecity.vn`).
2. Tìm kiếm tên sản phẩm tương ứng với một trong 42 models đang cần cập nhật.
3. Mở trang chi tiết sản phẩm và bấm vào nút **"Xem cấu hình chi tiết"** (nếu có).

### Bước 2: Copy và Điền Template
1. Mở file `Database/imports/manual_specs_template.json`.
2. Tìm block JSON của model bạn đang nhập liệu (Ví dụ: `"model": "Google Pixel 7a"`).
3. Copy URL của trang sản phẩm và dán vào trường `"source_url"`.
4. Copy từng dòng thông số vào mảng `"specs"`.
   - Bắt buộc phải có cả `spec_key` và `spec_value`.
   - Nếu giá trị (value) có nhiều dòng, bạn có thể nhập trực tiếp chuỗi chứa ký tự xuống dòng `\n` (chuẩn JSON).
   - Ví dụ một block hoàn chỉnh:
     ```json
     {
       "brand": "Google",
       "model": "Google Pixel 7a",
       "variant_hint": "Mặc định",
       "source_url": "https://mobilecity.vn/dien-thoai/google-pixel-7a.html",
       "source_note": "Specs đầy đủ",
       "specs": [
         { "spec_key": "Kích thước màn hình", "spec_value": "6.1 inches" },
         { "spec_key": "Công nghệ màn hình", "spec_value": "OLED\n90Hz\nHDR" },
         { "spec_key": "Chipset", "spec_value": "Google Tensor G2 (5 nm)" }
       ]
     }
     ```

### Bước 3: Chạy Import (Dry-run trước)
Để đảm bảo dữ liệu không có lỗi và khớp với Database hiện tại, hãy chạy script ở chế độ Dry-run (Chạy thử nhưng không ghi vào CSDL).

1. Mở terminal, trỏ vào thư mục `Database/imports/`.
2. Chạy lệnh:
   ```bash
   node import_specs.js --dry-run
   ```
3. Xem báo cáo. Đảm bảo:
   - Dòng "Successful Models" tăng lên.
   - Không có lỗi nào trong "Reject Reasons" (Ví dụ: thiếu URL, thiếu key/value).

### Bước 4: Cập nhật Database (Thực thi)
Sau khi chắc chắn không có lỗi, bạn chạy script ở chế độ thật để ghi dữ liệu vào CSDL:
```bash
node import_specs.js
```
Script sẽ tự động:
1. Tạo/Tìm ID của `attributes` (spec_key).
2. Tạo/Tìm ID của `attributevalues` (spec_value).
3. Map chính xác vào Variant mặc định của Product đó thông qua `variantattributevalues`.

### Bước 5: Kiểm tra (Verify)
- Mở trang Frontend, vào trang chi tiết của sản phẩm bạn vừa nhập liệu.
- Kéo xuống bảng **Thông số kỹ thuật**.
- Đảm bảo các thông số hiển thị đẹp (xuống dòng rõ ràng, thứ tự đúng).
