# Demo flow checklist

Cap nhat: 2026-06-23

Tai lieu nay dung de chay thu cong truoc khi demo khoa luan. Khi co dieu kien,
co the chuyen cac muc nay thanh Playwright/Cypress E2E.

## Tai khoan can co

- Admin: quan tri toan he thong.
- Manager: xem tong hop va dieu phoi.
- Sales: xac nhan don va thanh toan.
- Warehouse: xuat kho, doi chieu IMEI va tao van don.
- Warranty: tiep nhan bao hanh.
- Content: quan ly tin tuc, banner, slider.
- Consultant: tiep nhan chat tu AI.
- Customer: mua hang co tai khoan.

## 1. Dang ky va dang nhap

1. Dang ky tai khoan customer moi bang email chua ton tai.
2. Thu dang ky bang mat khau yeu de kiem tra validate.
3. Dang nhap bang email/username va mat khau dung.
4. Dang xuat, dang nhap lai va kiem tra gio hang/profile.

Ket qua mong doi:

- Tai khoan moi co role `Customer`.
- Mat khau yeu bi chan o backend.
- Dang nhap tra ve token va hien thi dung ten nguoi dung.

## 2. Chatbot -> de xuat -> them gio

1. Hoi cau mo ho: `Tu van dien thoai cho toi`.
2. Kiem tra bot hoi lai ngan sach hoac nhu cau.
3. Tra loi: `15 den 20 trieu, chup anh dep`.
4. Kiem tra bot tra ve toi da 3 san pham co anh, gia, ton kho va nut them gio.
5. Bam `Them vao gio` tren mot bien the con hang.
6. Vao gio hang va kiem tra dung bien the.

Ket qua mong doi:

- Chatbot khong liet ke qua nhieu san pham.
- De xuat duoc luu vao `chatproductrecommendations`.
- Khi them gio, recommendation co `addedtocartat`.

## 3. So sanh va loc sau chatbot

1. Sau khi bot de xuat 2-3 san pham, hoi: `So sanh 3 may nay`.
2. Hoi tiep: `May nao chup anh dep hon`.
3. Hoi tiep: `Uu tien pin`.

Ket qua mong doi:

- Bot dung lai pham vi cac san pham vua de xuat.
- Bang so sanh hien gia, chipset, RAM, bo nho, camera, pin va ton kho.
- Cau tra loi tiep theo xep hang lai theo tieu chi moi.

## 4. Checkout thanh vien

1. Dang nhap customer.
2. Them san pham vao gio.
3. Dat hang bang COD.
4. Kiem tra don tao thanh cong va ton kho duoc giu.

Ket qua mong doi:

- Thanh vien duoc dung COD.
- Hang chuyen `InStock -> Reserved`.
- Don o trang thai cho Sales xu ly.

## 5. Checkout khach vang lai

1. Mo an danh hoac dang xuat.
2. Them san pham vao gio.
3. Thu dat COD.
4. Dat lai bang Momo/VNPay/Chuyen khoan voi coc 30% hoac thanh toan 100%.

Ket qua mong doi:

- Khach vang lai bi chan COD.
- Thong tin giao hang van duoc luu.
- Don online chua thanh toan co han giu hang.
- Redis key chong spam duoc xoa khi thanh toan/huy/het han.

## 6. Sales -> Warehouse -> Shipment

1. Sales nhan don.
2. Sales xac nhan coc/thanh toan neu can.
3. Sales ban giao sang Warehouse.
4. Warehouse nhan viec.
5. Warehouse doi chieu dung so IMEI.
6. Tao van don demo.
7. Cap nhat van don den `Delivered`.

Ket qua mong doi:

- Hai nhan vien cung bo phan khong the cung nhan mot viec.
- IMEI duoc chuyen dung trang thai.
- `Delivered` tu dong chuyen don sang `Completed`.
- Bao hanh duoc kich hoat theo IMEI.

## 7. Huy, het han va hoan kho

1. Tao don online chua thanh toan.
2. Gia lap het han thanh toan.
3. Thu huy don o trang thai chua giao.
4. Thu huy don da `Shipped`.

Ket qua mong doi:

- Don het han/huy truoc giao tra hang ve `InStock`.
- Don da giao van chuyen khong bi huy truc tiep nhu don pending.
- Lich su kho co giao dich hoan hang.

## 8. Bao hanh, doi tra va hoan tien

1. Tao phieu bao hanh cho IMEI da ban.
2. Warranty nhan phieu va cap nhat cac trang thai xu ly.
3. Tao yeu cau tra hang cho don completed.
4. Warehouse nhan lai dung IMEI.
5. Xu ly hoan tien demo.

Ket qua mong doi:

- Warranty ghi lich su sua chua.
- Return/Refund cap nhat don, IMEI va payment status dung nghiep vu.

## 9. Phan quyen truc tiep

1. Dung token Sales goi API Warehouse.
2. Dung token Warehouse goi API Orders tong.
3. Dung token Content goi API Orders.
4. Dung token Consultant goi API Dashboard/Admin.

Ket qua mong doi:

- API ngoai quyen tra `403 Forbidden`.
- API khong token tra `401 Unauthorized`.

## 10. Noi dung va giao dien

1. Content them tin tuc moi.
2. Content them slider/banner bang file upload.
3. Kiem tra landing page hien slider co nut trai/phai va tam dung khi hover.
4. Kiem tra search khong phan biet hoa thuong.

Ket qua mong doi:

- Tin tuc, slider, banner luu va hien thi duoc.
- Khong con popup `alert/confirm` mac dinh cua trinh duyet o cac man da chuyen.
