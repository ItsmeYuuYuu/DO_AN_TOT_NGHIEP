
# 🛒 E-Commerce - Đồ Án Tốt Nghiệp

Dự án Hệ thống Thương mại Điện tử bán điện thoại xách tay hiện đại, tích hợp đầy đủ tính năng với 3 vai trò chính:
- **Admin** (Quản trị viên)
- **Staff** (Nhân viên)
- **Customer** (Khách hàng)

Dự án được triển khai Full-stack với Frontend (React + Vite), Backend (ASP.NET Core Web API), và Database (PostgreSQL).

## 🚀 1. Công nghệ sử dụng

### Frontend
- **Framework:** React 18 + TypeScript + Vite
- **Routing:** React Router v6 (Auth Guard bảo vệ tuyến đường)
- **Networking:** Axios (Interceptor tích hợp JWT)
- **Styling:** Tailwind CSS (Modern Retail Light Mode)
- **State Management:** Hooks & Context API

### Backend
- **Framework:** ASP.NET Core Web API (.NET 8/9)
- **Database:** PostgreSQL
- **ORM:** Entity Framework Core (Fluent API)
- **Security:**
  - JWT Authentication + Role-based Authorization.
  - BCrypt password hashing.
- **Features:**
  - **Audit Logs:** Hệ thống ghi log thao tác chạy ngầm (Background Service) đảm bảo hiệu suất.
  - **Database Indexing:** Tối ưu hóa truy vấn.
  - **Auto-seeding:** Tự động khởi tạo dữ liệu mẫu khi chạy ứng dụng lần đầu.

---

## 🏗️ 2. Cấu trúc dự án

```text
ECommerce/
├── BackEnd/
│   └── ECommerceBackend/        # .NET 8 Web API Project
│       ├── Controllers/         # API endpoints (Auth, Products, Orders...)
│       ├── DTOs/                # Request/Response DTOs theo module
│       ├── Models/              # EF entities & Database Context
│       ├── Data/                # EF DbContext & Seeding logic
│       ├── Services/            # Background services (Audit logs...)
│       ├── Filters/             # Action filters (Custom Filters)
│       ├── Middlewares/         # Global exception, correlation id...
│       └── Migrations/          # EF migrations
├── FrontEnd/                    # React Application
│   ├── src/
│   │   ├── api/                 # Axios client configuration
│   │   ├── components/          # Shared components (DataTable, Modal, AuthGuard...)
│   │   ├── features/            # Feature modules (Business logic)
│   │   ├── layouts/             # Page structures (Admin/Staff/Customer)
│   │   ├── portals/             # Main views for each role
│   │   ├── hooks/               # Reusable hooks
│   │   └── utils/               # Helpers/formatters
│   └── ...
├── docs/
│   └── database_migration_guide.md
├── .github/
│   └── workflows/ci.yml
├── ANTIGRAVITY_EXECUTION_SPEC.md
└── .gitignore

```


## 🌟 3. Tổng quan chức năng & Tình trạng roadmap

### Đã hoàn thiện đến cuối Phase 4

* **Auth:** Login, Get Me, Change Password, Logout, Register, Forgot Password (hiện tại là stub - chưa gửi email thật).
* **Catalog:** Quản lý danh sách sản phẩm, chi tiết, tìm kiếm, danh mục, thương hiệu, biến thể (variants).
* **Order Core Flow (Phase 2):** Tạo đơn, trừ tồn kho, áp dụng voucher, chuyển đổi trạng thái đơn, hủy đơn và hoàn kho.
* **Customer Pages:** Home, Product Detail, Cart, Checkout, Profile, Products, Search, News, Promotions, Order Lookup.
* **Admin Pages:** Dashboard, Products, Orders, Users, Customers, Categories/Brands, Vouchers.
* **Staff Pages:** Orders, Inventory (List/Create/Update), Purchase Orders (List/Create/Update), Warranties (List/Create/Update).
* **Security (Phase 1):** DTO-first, Validation, Role guards, Standardized error format (`ApiErrorDto`), dọn dẹp secrets.
* **Quality/Ops (Phase 3):** Tests, Migrations baseline, Logging middleware, Correlation ID, Health check, CI workflow.

### Tình trạng Roadmap

* **P0 - P4:** Done ✅
* **Phase tiếp theo (P5):** Nâng cấp UX / Chốt nghiệp vụ còn lại + E2E browser tests (Playwright) + Tối ưu hiệu năng nâng cao.

---

## 🔐 4. Tài khoản mặc định (Dành cho Testing)

| Vai trò | Email | Mật khẩu |
| --- | --- | --- |
| **Quản trị (Admin)** | `admin300475@gmail.com` | `Admin@300475!` |
| **Nhân viên (Staff)** | `staff01@gmail.com` | `Staff@123456!` |

---

## 🛠️ 5. Yêu cầu môi trường & Cài đặt

### Yêu cầu hệ thống

* **Node.js** 20+ (Khuyến nghị)
* **.NET SDK** 8+
* **PostgreSQL**

### Hướng dẫn chạy Local

#### Bước 1: Khởi động Backend

Mở Terminal tại thư mục `BackEnd/ECommerceBackend` và chạy các lệnh sau:

```bash
dotnet restore

```

Thiết lập secrets local (Bắt buộc) để bảo mật thông tin:

```bash
dotnet user-secrets init
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Host=localhost;Port=5432;Database=ECommerDB;Username=postgres;Password=YOUR_PASSWORD"
dotnet user-secrets set "JwtSettings:SecretKey" "YOUR_SECRET_KEY_MIN_32_CHARS"

```

Chạy Backend:

```bash
dotnet run

```

*Lưu ý: Ứng dụng sẽ tự động tạo bảng và đổ dữ liệu mẫu ở lần chạy đầu tiên.*

#### Bước 2: Khởi động Frontend

Mở Terminal tại thư mục `FrontEnd`:

```bash
npm install
npm run dev

```

Mặc định truy cập Frontend tại: `http://localhost:5173`

---

## 🧪 6. Build, Test & Migration

### Build & Test

**Backend:**

```bash
cd BackEnd/ECommerceBackend
dotnet build
dotnet test

```

**Frontend:**

```bash
cd FrontEnd
npm run build

```

### Database Migration

Tham khảo hướng dẫn chi tiết tại: `docs/database_migration_guide.md`

Lệnh cơ bản:

```bash
cd BackEnd/ECommerceBackend
dotnet ef migrations add <MigrationName>
dotnet ef database update

```

---

## 🛡️ 7. Ghi chú về API và Bảo mật

* Xác thực hoàn toàn bằng **JWT Bearer token**.
* Ma trận phân quyền (Role matrix) bao gồm: `Admin`, `Staff`, `Customer`.
* Format lỗi trả về chuẩn hóa: `ApiErrorDto { message, errors? }`.
* **Tuyệt đối không** hardcode thông tin nhạy cảm (credentials) trong source code đẩy lên Git.

```</MigrationName>

```