# Project Handoff Summary - Cuong Dien Thoai

Last updated: 2026-06-28

This note is written for continuing work from another Codex/OpenAI account. It summarizes the current codebase, business flows, local setup, and the latest uncommitted changes.

## 1. Project Overview

Cuong Dien Thoai is a local-demo ecommerce system for a graduation thesis. The core thesis angle is AI-assisted phone consulting connected to a realistic buying flow:

```text
Customer browsing/chatbot
  -> product recommendation
  -> cart
  -> checkout/payment/deposit
  -> Sales confirmation
  -> Warehouse IMEI dispatch
  -> shipping
  -> completion
  -> warranty/return workflows
```

The project is intended to run locally for thesis defense. Real production deployment, real payment gateway integration, and full security hardening are intentionally not finished yet.

## 2. Tech Stack

Backend:

- ASP.NET Core Web API, .NET 8
- Entity Framework Core 8
- PostgreSQL
- JWT Bearer authentication
- BCrypt password hashing
- Redis optional, memory cache fallback
- Serilog
- Swagger/OpenAPI
- xUnit + SQLite integration tests

Frontend:

- React 19
- TypeScript 6
- Vite 8
- React Router 7
- Tailwind CSS 4
- Axios
- Lucide React

Local database:

- PostgreSQL database name is `ECommerDB`.
- Do not confuse it with lowercase `ecommerdb`.

## 3. Important Folders

```text
BackEnd/ECommerceBackend
  Controllers/       REST APIs
  DTOs/              request/response contracts
  Models/            EF entities and ECommerceContext
  Data/              DbInitializer and demo seed data
  Services/          chatbot, checkout, email, upload, audit
  Migrations/        EF Core migrations
  wwwroot/uploads/   local uploaded files

BackEnd/ECommerceBackend.Tests
  integration tests using SQLite/test host

FrontEnd/src
  layouts/           customer/admin/staff layouts
  portals/customer   customer pages
  portals/admin      admin pages
  portals/staff      role-based staff pages
  features/          API clients, hooks, reusable feature components
  data/              static/fallback data such as Vietnam administrative units

docs
  project notes, ERD scripts, backup guide, demo checklist
```

## 4. Roles and Portals

Roles currently used:

- Admin
- Manager
- Sales
- Warehouse
- Warranty
- Content
- Consultant
- Customer

Legacy generic `Staff` role has been removed from the active role model.

Main portals:

- Customer: `/`
- Admin: `/admin`
- Staff: `/staff`

Frontend route guards and menu visibility are role-aware, but API authorization is the real source of protection.

## 5. Major Business Flows

### Product and Inventory

- Products have categories, brands, series, variants, images, specs, and slugs.
- Variant stock is tracked through actual IMEI inventory items.
- Admin product create/edit is the heaviest UI flow: basic info, description/images, variants/images, specs, and final review.
- Product images and description images are stored as files under backend `wwwroot/uploads/products`; DB stores metadata/paths.
- There is cleanup logic for unused product images.

### Cart and Checkout

- Registered customers and guest customers can buy.
- Registered customer can use COD, Momo, VNPay, or Bank transfer.
- Guest checkout cannot use COD.
- Guest checkout must pay 30 percent deposit or 100 percent upfront.
- Online payment orders reserve stock for 15 minutes.
- Expired unpaid online orders are canceled and stock is restored.
- Redis is optional for anti-spam guest checkout; memory cache fallback is used if Redis is not configured.

### Payment

- Momo/VNPay/Bank are still sandbox/demo style for thesis defense.
- Bank uses VietQR URL generation.
- Momo/VNPay QR payload is generated, but not integrated with a real provider callback yet.
- Sales can confirm payment from staff/admin screens.

### Order Operations

- Sales receives/accepts orders and confirms payment/deposit.
- Sales hands eligible orders to Warehouse.
- Warehouse verifies IMEI and creates shipment.
- Shipment flow supports demo carriers: GHN, GHTK, Viettel Post, J&T.
- Delivered shipment completes the order, records remaining payment where applicable, and activates warranty.
- Returned shipment returns IMEI to stock and records refund-like payment history.

### Warranty

- Warranty is tied to sold IMEI.
- Warranty claims can include images, assignment, status history, costs, and final resolution.

### Returns and Refunds

- Customer can request return/refund for completed orders within business rules.
- Request is tied to exact order item and IMEI.
- Staff can approve/reject, warehouse can inspect, and refund records are stored.

### Chatbot and Consultant

- Chatbot uses product/catalog data from PostgreSQL.
- It recommends real variants with price, stock, and product links.
- It stores recommended variants and attribution from recommendation -> cart -> order.
- It asks clarification for vague requests, especially budget, needs, and unclear comparisons.
- It supports comparison tables.
- Floating chat widget allows chatting without leaving current customer page.
- `/chat` page is used for full chat history and larger conversation view.
- Consultant can accept AI handoff and continue conversation with context.
- Typing status is implemented with polling rather than SignalR.

## 6. Email

Email services exist under `BackEnd/ECommerceBackend/Services/Email`.

Supported:

- registration OTP by email
- order created email
- payment updated email
- order status updated email
- admin email test endpoint

Use `dotnet user-secrets` for Gmail SMTP settings. Do not commit real Gmail app passwords.

Important settings:

```powershell
dotnet user-secrets set "Email:Enabled" "true" --project BackEnd\ECommerceBackend
dotnet user-secrets set "Email:RequireRegistrationOtp" "true" --project BackEnd\ECommerceBackend
dotnet user-secrets set "Email:Host" "smtp.gmail.com" --project BackEnd\ECommerceBackend
dotnet user-secrets set "Email:Port" "587" --project BackEnd\ECommerceBackend
dotnet user-secrets set "Email:EnableSsl" "true" --project BackEnd\ECommerceBackend
dotnet user-secrets set "Email:Username" "your_gmail@gmail.com" --project BackEnd\ECommerceBackend
dotnet user-secrets set "Email:Password" "your_gmail_app_password" --project BackEnd\ECommerceBackend
dotnet user-secrets set "Email:FromEmail" "your_gmail@gmail.com" --project BackEnd\ECommerceBackend
dotnet user-secrets set "Email:FromName" "Cuong Dien Thoai" --project BackEnd\ECommerceBackend
```

The app password was already configured once in the local user-secrets during the previous session. Do not expose it in commits or chat.

## 7. Latest Uncommitted Changes Since Last Commit

The working tree is dirty. Main changes in the current batch:

- Gmail SMTP registration OTP and email notifications.
- Safer email failure handling for registration code.
- Customer account disable/enable from admin, with tests.
- Phone validation tightened in frontend and backend:
  - phone input strips non-digits
  - valid phone must match `0` + 9 digits
- Chatbot response improvements:
  - more human wording
  - better clarification behavior
  - comparison quick prompt no longer forces random products
  - structured segmented chat display
  - typing status for consultant/customer chat
- Customer UI polish:
  - home/product/chat/login/footer/dashboard/admin/staff styling improvements
  - floating AI chat widget
  - scroll-to-top fixes for product/chat navigation
  - less rounded customer cards
- Product detail fixes:
  - similar product stock state aligned with actual variants
  - removed irrelevant decorative icon on cards
- Checkout update:
  - detailed address remains text input
  - province/city dropdown
  - ward dropdown based on selected province
  - uses `FrontEnd/src/data/vietnamAdministrativeUnits.ts`
  - dynamic fetch from `https://provinces.open-api.vn/api/v2/?depth=2`
  - fallback 34 province-level units and a few common wards
- Payment update:
  - non-COD checkout now redirects directly to `/payment/{orderId}?token=...`
  - no intermediate "order created then pay now" step
  - QR display hides technical payload from customer
  - customer sees short payment content like `CDT13`
  - main UI no longer says "mo phong" in the payment action
- Audit log export and backup docs were added earlier:
  - CSV/XLSX-ish export improvements may still need checking
  - `scripts/backup-postgres.ps1`
  - `docs/database/backup_postgres.md`

New untracked files include:

```text
BackEnd/ECommerceBackend/Services/Email/
BackEnd/ECommerceBackend/Services/Chat/ChatTypingService.cs
BackEnd/ECommerceBackend/Services/Chat/IChatTypingService.cs
BackEnd/ECommerceBackend.Tests/CustomersControllerTests.cs
BackEnd/ECommerceBackend.Tests/UsersControllerTests.cs
FrontEnd/src/data/vietnamAdministrativeUnits.ts
FrontEnd/src/features/chat/components/ChatAssistantSegments.tsx
docs/integrations/email_payment_chat_demo.md
```

## 8. Verification Already Run

Recently passed:

```powershell
dotnet build BackEnd\ECommerceBackend\ECommerceBackend.csproj --no-restore
npm run build
```

Earlier tests passed before the most recent checkout/payment edits:

```powershell
dotnet test BackEnd\ECommerceBackend.Tests\ECommerceBackend.Tests.csproj --no-restore
```

Recommended before final commit:

```powershell
dotnet test BackEnd\ECommerceBackend.Tests\ECommerceBackend.Tests.csproj --no-restore
npm run build
```

## 9. Things To Check Next

High-priority demo checks:

1. Registration with Gmail OTP.
2. Login with new customer.
3. Customer checkout:
   - phone cannot accept letters
   - province dropdown loads
   - ward dropdown works
   - guest cannot select COD
   - member can select COD
4. Online payment:
   - after confirming checkout, it goes straight to QR page
   - VNPay/Momo QR shows short payment content
   - Bank QR uses VietQR
   - Sales can confirm bank payment
5. Chatbot:
   - vague recommendation asks for budget/need
   - generic "so sanh san pham" asks which products
   - comparison does not auto-pick unrelated products
   - floating chat and `/chat` history match
6. Product detail:
   - variant selection
   - out-of-stock options disabled
   - similar product cards show correct stock
7. Admin/staff:
   - product create/edit with images, variants, specs
   - customer disable/enable
   - user role protection
   - Sales/Warehouse order workflow
8. Audit log:
   - export file opens correctly in Excel
   - columns are separated and Vietnamese text is readable

## 10. Known Caveats

- VNPay/Momo are not real merchant integrations yet. Current QR/payment flow is sandbox/demo style.
- Gmail SMTP requires a real Gmail account with 2FA and App Password.
- Province/ward data uses a public API when online. Fallback is not a complete ward database.
- Some old docs may display mojibake in PowerShell because of terminal encoding; browser/editor display should still be checked.
- Admin/staff responsive mobile is not a top priority compared with customer mobile.
- Real deployment still needs:
  - environment variables/secrets
  - production DB backup/restore plan
  - HTTPS/domain setup
  - real payment callbacks
  - stronger security review

## 11. Good Commit Message For Current Batch

Recommended:

```text
feat: add email OTP and streamline checkout payments
```

Alternative if you want a broader message:

```text
feat: polish customer checkout, chat, and account workflows
```
