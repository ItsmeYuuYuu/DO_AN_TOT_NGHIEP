# Role menu and API matrix

Cap nhat: 2026-06-25

Tai lieu nay dung de doi chieu nhanh khi demo phan quyen. Backend da co test
`RoleAuthorizationTests`, con giao dien can kiem tra thu cong bang cac tai khoan
mau trong `demo-flow-checklist.md`.

## Admin

- Menu chinh: dashboard, hang hoa, don hang, khach hang, nhan vien, khuyen mai,
  noi dung, nhat ky, phan tich.
- API hop le: toan bo module quan tri, audit logs, chatbot metrics.
- Luu y demo: Admin duoc xem consultant, sales, warehouse, warranty, content,
  nhung khong nen tu vo hieu hoa chinh minh.

## Manager

- Menu chinh: dashboard dieu phoi, san pham, don hang, kho, doi tra, bao hanh,
  khach hang, voucher, homepage sections, consultant.
- API hop le: tong hop, dieu phoi don, return requests, shipment/inventory theo
  pham vi quan ly.
- API phai bi chan: quan ly users cap cao.

## Sales

- Menu chinh: don hang, hang doi Sales, khach hang, voucher.
- API hop le: orders, claim/handoff Sales, return review, customers.
- API phai bi chan: inventory truc tiep, warranty, dashboard admin, consultant handoff.

## Warehouse

- Menu chinh: kho, hang doi Warehouse, van don, doi tra nhan hang.
- API hop le: inventory, low stock, warehouse claim, shipments.
- API phai bi chan: danh sach orders tong, warranty, consultant handoff.

## Warranty

- Menu chinh: bao hanh.
- API hop le: warranty claims, warranties.
- API phai bi chan: dashboard admin, orders, shipments, return requests ngoai luong
  duoc cap.

## Content

- Menu chinh: noi dung, tin tuc, banner/slider, homepage sections, san pham neu
  can gan noi dung.
- API hop le: news, promotional contents, product image upload/delete, homepage
  sections.
- API phai bi chan: orders, inventory, return requests.

## Consultant

- Menu chinh: tu van AI, khach hang.
- API hop le: chat handoffs, accept/close consultation, customers, chat metrics
  neu duoc cap.
- API phai bi chan: users, dashboard admin, return requests, warehouse/sales queue.

## Customer

- Menu chinh: trang chu, san pham, chatbot, gio hang, don hang cua toi, doi tra
  cua toi, danh gia cua toi.
- API hop le: chat cua ban than, cart/checkout, return requests mine, profile.
- API phai bi chan: dashboard, orders tong, inventory, users.
