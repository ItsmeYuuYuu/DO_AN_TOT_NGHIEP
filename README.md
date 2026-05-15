# 🛒 E-Commerce System (Full-Stack)

Dự án Hệ thống Thương mại Điện tử hiện đại, tích hợp đầy đủ tính năng quản trị (Admin), nhân viên (Staff) và khách hàng (Customer).

## 🚀 Công nghệ sử dụng

### Backend
- **Framework:** .NET 8 Web API
- **Database:** PostgreSQL
- **ORM:** Entity Framework Core (Fluent API)
- **Security:** 
  - **JWT (JSON Web Token):** Xác thực và phân quyền (Role-based Authorization).
  - **BCrypt:** Mã hóa mật khẩu an toàn.
- **Features:** 
  - **Audit Logs:** Hệ thống ghi log thao tác chạy ngầm (Background Service) đảm bảo hiệu suất.
  - **Database Indexing:** Tối ưu hóa truy vấn cho hàng triệu bản ghi.
  - **Auto-seeding:** Tự động khởi tạo dữ liệu mẫu khi chạy ứng dụng.

### Frontend
- **Framework:** React 18 + Vite
- **Styling:** Tailwind CSS (Modern Retail Light Mode)
- **State Management:** Hooks & Context API
- **Networking:** Axios (Interceptor tích hợp JWT)
- **Routing:** React Router v6 (Auth Guard bảo vệ tuyến đường)

---

## 🏗️ Cấu trúc dự án

```text
ECommerce/
├── BackEnd/
│   └── ECommerceBackend/      # .NET 8 Web API Project
│       ├── Controllers/       # API Endpoints (Auth, Products, Orders,...)
│       ├── Data/              # DbContext & Seeding logic
│       ├── Filters/           # Custom Filters (Audit Logs)
│       ├── Models/            # Database Entities
│       └── Services/          # Background Services
├── FrontEnd/                  # React Application
│   ├── src/
│   │   ├── api/               # Axios client configuration
│   │   ├── components/        # Shared components (DataTable, Modal, AuthGuard,...)
│   │   ├── features/          # Business logic per module
│   │   ├── layouts/           # Page structures (Admin, Staff, Customer)
│   │   └── portals/           # Main views for each role
└── .gitignore                 # Cấu hình bỏ qua các file rác
```

---

## 🔐 Tài khoản mặc định (Dành cho Testing)

| Vai trò | Email | Mật khẩu |
| :--- | :--- | :--- |
| **Quản trị (Admin)** | `admin300475@gmail.com` | `Admin@300475!` |
| **Nhân viên (Staff)** | `staff01@gmail.com` | `Staff@123456!` |

---

## 🛠️ Hướng dẫn cài đặt

### 1. Backend
1. Đảm bảo đã cài đặt **PostgreSQL**.
2. Cấu hình chuỗi kết nối trong `appsettings.json`.
3. Mở Terminal tại `BackEnd/ECommerceBackend`:
   ```bash
   dotnet restore
   dotnet run
   ```
   *Lưu ý: Ứng dụng sẽ tự động tạo bảng và đổ dữ liệu mẫu ở lần chạy đầu tiên.*

### 2. Frontend
1. Mở Terminal tại `FrontEnd`:
   ```bash
   npm install
   npm run dev
   ```
2. Truy cập: `http://localhost:5173`

---

## ✨ Tính năng nổi bật
- **Giao diện Modern Light Mode:** Tối ưu trải nghiệm mua sắm bán lẻ.
- **Bảo mật đa lớp:** Từ validation ở client đến hashing và JWT ở server.
- **Hệ thống Quản trị toàn diện:** Quản lý sản phẩm, đơn hàng, người dùng với bảng dữ liệu thông minh (Data Table).
- **Audit Logging:** Theo dõi mọi thay đổi dữ liệu (POST/PUT/DELETE) của người dùng.
