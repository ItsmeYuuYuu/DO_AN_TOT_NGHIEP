# ECommerce - Do An Tot Nghiep

He thong thuong mai dien tu ban dien thoai xach tay, gom 3 vai tro chinh:
- Admin
- Staff
- Customer

Du an duoc trien khai full-stack voi Frontend (React + Vite), Backend (ASP.NET Core Web API), va Database (PostgreSQL).

## 1) Cong nghe chinh

### Frontend
- React 18 + TypeScript + Vite
- React Router v6
- Axios
- Tailwind CSS

### Backend
- ASP.NET Core Web API (.NET 8/9)
- Entity Framework Core
- JWT Authentication + Role-based Authorization
- BCrypt password hashing

### Database
- PostgreSQL

## 2) Tong quan chuc nang

### Da hoan thien den cuoi P4
- Auth: login, me, change-password, logout, register, forgot-password (stub).
- Catalog: products list/detail/search, categories, brands, variants.
- Order core flow (P2): tao don, tru ton kho, ap voucher, transition status, cancel hoan kho.
- Customer pages: home, product detail, cart, checkout, profile, products, search, news, promotions, order lookup.
- Admin pages: dashboard, products, orders, users, customers, categories/brands, vouchers.
- Staff pages: orders, inventory (list/create/update), purchase orders (list/create/update), warranties (list/create/update).
- Security (P1): DTO-first, validation, role guards, standardized error format (`ApiErrorDto`), secrets cleanup.
- Quality/ops (P3): tests, migrations baseline, logging middleware, correlation id, health check, CI workflow.

### Luu y
- `forgot-password` hien la stub (khong gui email that).
- Chua co E2E browser test cho frontend (Playwright) trong scope hien tai.

## 3) Cau truc thu muc

```text
ECommerce/
├─ BackEnd/
│  ├─ ECommerceBackend/
│  │  ├─ Controllers/         # API endpoints
│  │  ├─ DTOs/                # Request/Response DTOs theo module
│  │  ├─ Models/              # EF entities + DbContext
│  │  ├─ Data/                # Seed/init data
│  │  ├─ Services/            # Background services (audit...)
│  │  ├─ Filters/             # Action filters
│  │  ├─ Middlewares/         # Global exception, correlation id...
│  │  └─ Migrations/          # EF migrations
│  └─ ECommerceBackend.Tests/ # xUnit integration tests
├─ FrontEnd/
│  ├─ src/
│  │  ├─ api/                 # Axios client
│  │  ├─ components/          # Shared UI components
│  │  ├─ features/            # Feature modules (auth/products/orders...)
│  │  ├─ layouts/             # Admin/Staff/Customer layouts
│  │  ├─ portals/             # Page-level screens
│  │  ├─ hooks/               # Reusable hooks
│  │  └─ utils/               # Helpers/formatters
│  └─ ...
├─ docs/
│  └─ database_migration_guide.md
├─ .github/
│  └─ workflows/ci.yml
└─ ANTIGRAVITY_EXECUTION_SPEC.md
```

## 4) Yeu cau moi truong

- Node.js 20+ (khuyen nghi)
- .NET SDK 8+ (hoac version dang dung trong project)
- PostgreSQL

## 5) Huong dan chay local

### 5.1 Backend

```bash
cd BackEnd/ECommerceBackend
dotnet restore
```

Thiet lap secrets local (bat buoc):

```bash
dotnet user-secrets init
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Host=localhost;Port=5432;Database=ECommerDB;Username=postgres;Password=YOUR_PASSWORD"
dotnet user-secrets set "JwtSettings:SecretKey" "YOUR_SECRET_KEY_MIN_32_CHARS"
```

Chay backend:

```bash
dotnet run
```

### 5.2 Frontend

```bash
cd FrontEnd
npm install
npm run dev
```

Mac dinh truy cap: `http://localhost:5173`

## 6) Build va test

### Backend
```bash
cd BackEnd/ECommerceBackend
dotnet build
dotnet test
```

### Frontend
```bash
cd FrontEnd
npm run build
```

## 7) Migration database

Tham khao huong dan chi tiet:
- `docs/database_migration_guide.md`

Lenh co ban:

```bash
cd BackEnd/ECommerceBackend
dotnet ef migrations add <MigrationName>
dotnet ef database update
```

## 8) Nhanh ve API va bao mat

- Auth bang JWT Bearer token.
- Role matrix chinh: `Admin`, `Staff`, `Customer`.
- Error format chuan:
  - `ApiErrorDto { message, errors? }`
- Khong hardcode credentials trong source tracked.

## 9) Tinh trang roadmap

- P0: done
- P1: done
- P2: done
- P3: done
- P4: done

Phase tiep theo (goi y):
- P5: nang cap UX/chot nghiep vu con lai + E2E browser tests + toi uu hieu nang nang cao.

