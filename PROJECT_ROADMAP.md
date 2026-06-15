# Ke hoach phat trien du an

Cap nhat: 2026-06-12

## 1. Trang thai phan quyen nhan vien

### Da co

- Database co cac role: `Admin`, `Manager`, `Sales`, `Warehouse`,
  `Warranty`, `Content`, `Consultant` va `Customer`.
- Moi tai khoan nhan vien dung chung bang `users` va lien ket bang `roles`
  qua `roleid`.
- Backend da gioi han nhieu API bang `[Authorize(Roles = "...")]`.
- Co bao ve tai khoan Admin cuoi cung va khong cho Admin tu vo hieu hoa
  hoac tu ha quyen chinh minh.
- Frontend co `StaffLayout`, menu va route duoc loc theo role.
- Da co cac man dung chung/chuyen dung:
  - Manager: dashboard va cac man quan ly tong hop.
  - Sales: don hang, khach hang, voucher.
  - Warehouse: san pham, kho va IMEI.
  - Warranty: bao hanh va khach hang.
  - Content: san pham, tin tuc, banner va slider.
  - Consultant: tiep nhan va tu van cac cuoc chat do AI chuyen giao.
- Da co bang `orderassignments` luu nguoi phu trach theo tung bo phan,
  nguoi phan cong, thoi gian nhan va thoi gian hoan tat.
- Da co unique index tren `(orderid, department)` de ngan hai nhan vien
  cung tao phan cong cho mot don tai cung mot cong doan.
- Sales co hang doi rieng de:
  - Nhan don.
  - Xac nhan coc/thanh toan.
  - Ban giao don hop le sang Warehouse.
- Warehouse co hang doi rieng chi nhan don da duoc Sales ban giao de:
  - Nhan cong viec.
  - Xac nhan xuat giao va chuyen don sang `Shipped`.
- Admin/Manager co the xem hai hang doi va chon nhan vien de phan cong.
- Da co test cho truong hop hai Sales cung nhan mot don va luong
  Sales -> Warehouse -> Shipped -> Delivered.
- Da co van don gia lap, ma van don, phi giao hang, ngay giao du kien va lich
  su trang thai.
- Giao thanh cong tu dong hoan tat don, thu tien con lai va kich hoat bao hanh.
- Giao that bai co the giao lai hoac hoan ve kho dung IMEI.

### Chua hoan thien

- Warranty, Content va Consultant van con tai su dung mot phan man Admin
  thay vi co dashboard rieng theo nghiep vu.
- Chua co ma tran quyen tap trung de doi chieu dong bo giua backend API,
  frontend route, menu va button thao tac.
- Chua kiem thu day du viec goi truc tiep API bang tai khoan sai role.
- Chua co dashboard/KPI rieng cho Sales, Warehouse, Warranty, Content va
  Consultant.
- Chua co lich su phan cong cong viec, nguoi xu ly va thoi gian xu ly cho
  tat ca nghiep vu.

### Huong database

Khong tao bang nhan vien rieng cho tung role. Tiep tuc dung:

```text
users -> roles
```

Chi bo sung cac bang nghiep vu khi can luu du lieu rieng, vi du:

```text
inventory_transactions
warranty_assignments
content_approvals
consultation_assignments
```

Neu can phan quyen dong va chi tiet hon, bo sung:

```text
permissions
role_permissions
```

## 2. Thanh toan va giu hang

### Da hoan thanh

1. Da co thao tac nhan vien xac nhan da coc/da thanh toan.
2. Da cap nhat `orderpayments`, `paidamount` va `paymentstatus`.
3. Da chan don online chua coc/thanh toan chuyen sang `Processing`.
4. Da co background service tu huy don online chua thanh toan sau 15 phut.
5. Khi tu huy/het han, ton kho duoc chuyen `Reserved -> InStock`.
6. Khoa guest pending trong Redis duoc xoa khi thanh toan, huy hoac het han.
7. Da co trang thanh toan gia lap Momo, VNPay va chuyen khoan.
8. Man Admin/Sales da hien thi trang thai va cho phep xac nhan thanh toan.
9. Da co migration `AddOrderPaymentLifecycle` va test hoi quy cho luong chinh.

### Can bo sung sau

1. Them nghiep vu hoan tien va trang thai `Refunded`.
2. Tich hop sandbox cua cong thanh toan that neu can demo ngoai gia lap.
3. Luu audit log chi tiet nguoi xac nhan tung giao dich.

### Vong doi muc tieu

```text
InStock
  -> Reserved khi dat hang
  -> Sold khi don Completed
  -> InStock khi don Cancelled/het han thanh toan
```

```text
Unpaid/AwaitingDeposit/AwaitingFullPayment
  -> DepositPaid/Paid
  -> Refunded neu hoan tien
```

## 3. Hoan thien giao dien theo role

Thuc hien sau khi vong doi thanh toan va ton kho da kin.

1. `Sales`
   - Da co danh sach don can xac nhan.
   - Da co nhan/phat hien don da co nguoi phu trach.
   - Da co xac nhan thanh toan/coc va ban giao kho.
   - Tiep theo: lich su don da xu ly va KPI theo nhan vien.

2. `Warehouse`
   - Da co don can dong goi/xuat kho sau khi Sales ban giao.
   - Da co nhan viec va xac nhan chuyen sang giao hang.
   - Da co chon va xac nhan dung IMEI khi dong goi.
   - Da luu lich su giao dich kho va canh bao ton kho thap.

3. `Warranty`
   - Tiep nhan va phan cong phieu bao hanh.
   - Theo doi trang thai va lich su sua chua.

4. `Content`
   - Quan ly noi dung san pham, tin tuc, banner va slider.
   - Khong duoc sua gia, kho hoac don hang.

5. `Consultant`
   - Hang cho chat.
   - Lich su tu van va san pham AI da de xuat.
   - Tao gio hang/don nhap theo yeu cau cua khach.

6. `Manager`
   - Dashboard tong hop.
   - Theo doi KPI va tien do cua cac bo phan.
   - Khong thay the cac thao tac chi danh cho Admin.

## 4. Giao dich kho va dong goi

### Da hoan thanh

1. Da co bang `inventorytransactions` luu cac giao dich:
   - Nhap kho.
   - Giu hang khi dat don.
   - Xuat giao.
   - Hoan kho khi huy/het han thanh toan.
   - Dieu chinh, danh dau loi va hoan tat ban hang.
2. Man Warehouse hien danh sach IMEI cua tung don.
3. Nhan vien kho phai xac nhan du va dung tap IMEI truoc khi `Shipped`.
4. Moi giao dich luu nguoi thao tac, thoi gian, trang thai truoc/sau va
   ghi chu.
5. Man kho co lich su theo tung IMEI va canh bao ton kho thap theo bien
   the.

## 5. Van chuyen gia lap

### Da hoan thanh

1. Da co bang `shipments` va `shipmenthistories`.
2. Warehouse tao van don khi doi chieu du IMEI.
3. Ho tro GHN, GHTK, Viettel Post va J&T o che do demo.
4. Co luong lay hang, dang van chuyen, dang giao, giao that bai, giao lai,
   giao thanh cong va hoan ve kho.
5. `Delivered` tu dong chuyen don sang `Completed`, thu COD/phan con lai va
   kich hoat bao hanh.
6. `ReturnedToWarehouse` tra IMEI ve `InStock` va hoan tien gia lap.

## 6. Chatbot AI sau luong mua hang

### Da hoan thanh

1. Ket qua chatbot tra ve ca noi dung va danh sach bien the co cau truc.
2. Moi de xuat hien thi anh, gia, tinh trang, ton kho va lien ket chi tiet.
3. Khach co the them dung bien the vao gio hang ngay trong cuoc chat.
4. Bang `chatproductrecommendations` luu san pham/bien the da de xuat,
   thu tu xep hang va thoi diem khach them vao gio.
5. Consultant xem duoc toan bo lich su chat va cac the san pham AI da
   de xuat truoc khi tiep nhan.
6. Chatbot hoi lai theo tung buoc neu thieu ngan sach hoac nhu cau, kem
   cac lua chon tra loi nhanh.
7. Phan hoi hoi lai duoc luu co cau truc va giu nguyen khi tai lai lich su.
8. So sanh 2-3 san pham bang bang gia, chipset, RAM, bo nho, camera, pin
   va ton kho.
9. Khach co the tiep tuc loc sau so sanh theo camera, hieu nang, pin hoac
   gia; Consultant cung xem duoc bang so sanh trong lich su.
10. Da co cham diem theo nhu cau va bao cao de xuat -> them gio -> dat hang.

### Uu tien tiep theo

1. Bo sung bo du lieu danh gia de do do chinh xac cua xep hang theo nhu cau.
2. Cho Consultant tao gio hang hoac don nhap tu san pham da tu van.
3. Mo rong bao cao theo tung nhom nhu cau va tung Consultant.
4. Hoan thien tracking hanh vi chatbot:
   - De xuat san pham.
   - Xem chi tiet.
   - Them vao gio.
   - Tao don va thanh toan.
5. Xay dashboard hieu qua chatbot:
   - San pham duoc de xuat nhieu nhat.
   - Ty le de xuat -> them gio -> dat hang.
   - Nhu cau pho bien: camera, gaming, pin va ngan sach.
   - Ty le chuyen sang Consultant.
6. Cho Consultant xem nhu cau da thu thap, tiep tuc dung ngu canh va tao
   gio hang hoac don nhap cho khach.

## 7. Nang cap frontend va nhan dien giao dien

### Van de hien tai

- Nhieu man hinh dang dung chung cong thuc nen xam, card trang, bo tron,
  vien xam va mau xanh duong.
- Trang khach hang, Admin va Staff chua co ngon ngu giao dien rieng.
- Cac card, bang, form va header co mat do va nhan manh tuong tu nhau,
  lam nghiep vu nao cung co cam giac giong nhau.
- Qua nhieu khoi deu duoc bo tron va dat trong card, lam giam phan cap
  noi dung va de tao cam giac giao dien sinh tu dong.

### Dinh huong

1. Customer portal
   - Phong cach ban le cong nghe ro rang, nhieu hinh anh san pham.
   - Mau thuong hieu co diem nhan am, khong chi dung xanh duong.
   - Trang chu, danh sach, chi tiet, gio hang va chatbot co bo cuc rieng
     theo hanh vi mua sam.

2. Admin portal
   - Phong cach dieu hanh, mat do thong tin cao va it card trang long nhau.
   - Dung sidebar/topbar co phan cap ro, bang du lieu va bo loc la trung tam.
   - Mau trang thai duoc dung co he thong, han che gradient va shadow.

3. Staff portal
   - Moi role co dashboard va mau nhan dien nhe theo nghiep vu.
   - Sales uu tien hang doi va doanh so.
   - Warehouse uu tien ton kho, IMEI va dong goi.
   - Warranty uu tien timeline xu ly.
   - Content uu tien preview noi dung.
   - Consultant uu tien hoi thoai va thong tin khach hang.

### Thu tu trien khai

1. Tao design tokens, typography, spacing va component nen tang.
2. Lam lai Customer Home va Product Detail de chot phong cach cua hang.
3. Lam lai Admin Layout, page header, filter bar, table va status badge.
4. Tach trai nghiem Staff theo tung role.
5. Chuan hoa form, modal, empty state, loading va responsive.
6. Ra soat tung trang va loai bo cac mau UI lap lai khong can thiet.

## 8. Truoc khi bao ve

- Kiem thu phan quyen toan he thong.
- Chuan bi tai khoan demo cho moi role.
- Chuan bi du lieu san pham, kho, don hang, thanh toan va chat.
- Viet kich ban demo tu chatbot den mua hang va nhan vien xu ly.
- Chuan bi tinh huong loi: het hang, thanh toan that bai, huy don va
  hai nhan vien cung nhan mot cuoc chat.
