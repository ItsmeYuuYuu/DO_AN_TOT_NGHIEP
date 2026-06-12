# E-Commerce Phone Store

![.NET](https://img.shields.io/badge/.NET-8.0-512BD4?style=flat-square&logo=dotnet&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=111827)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=flat-square&logo=vite&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-18-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![JWT](https://img.shields.io/badge/Auth-JWT-000000?style=flat-square&logo=jsonwebtokens&logoColor=white)
![Status](https://img.shields.io/badge/Status-Local%20Demo-F59E0B?style=flat-square)

Hệ thống thương mại điện tử bán điện thoại, được xây dựng cho đồ án tốt
nghiệp. Điểm trọng tâm của dự án là luồng tư vấn sản phẩm bằng chatbot AI,
chuyển tiếp cho nhân viên Consultant và kết nối trực tiếp với giỏ hàng, đặt
hàng, thanh toán và xử lý kho.

Dự án hiện được thiết kế để chạy và trình diễn trên môi trường local.

## Chức năng hiện tại

### Khách hàng

- Xem, tìm kiếm và lọc sản phẩm theo danh mục, thương hiệu và dòng máy.
- Xem chi tiết sản phẩm, thư viện ảnh, mô tả, thông số và đánh giá.
- Chọn đúng biến thể theo màu sắc, RAM, bộ nhớ, tình trạng và xuất xứ.
- Biến thể hết hàng được làm mờ và không thể thêm vào giỏ.
- Giỏ hàng hoạt động cho cả người đã đăng nhập và khách vãng lai.
- Đặt hàng bằng COD, Momo, VNPay hoặc chuyển khoản ngân hàng.
- Tra cứu đơn hàng, xem lịch sử và trạng thái đơn.
- Đăng ký, đăng nhập, cập nhật hồ sơ và đổi mật khẩu.

### Checkout và thanh toán

- Người đã đăng nhập có thể chọn COD hoặc thanh toán online.
- Khách vãng lai không được dùng COD.
- Khách vãng lai phải đặt cọc 30% hoặc thanh toán trước 100%.
- Hàng được giữ trong 15 phút khi chờ thanh toán online.
- Đơn quá hạn chưa thanh toán tự hủy và hoàn tồn kho.
- Momo, VNPay và chuyển khoản hiện dùng luồng thanh toán giả lập phục vụ demo.
- Redis được dùng để hạn chế khách vãng lai spam đặt hàng; nếu chưa cấu hình
  Redis, hệ thống tự dùng distributed memory cache.

### Sản phẩm và kho

- Quản lý danh mục, thương hiệu và dòng sản phẩm như Xiaomi, Redmi, Poco,
  Galaxy S, Galaxy Z Fold.
- Tạo sản phẩm theo quy trình nhiều bước:
  1. Thông tin cơ bản.
  2. Mô tả sản phẩm.
  3. Biến thể và hình ảnh.
  4. Thông số kỹ thuật.
  5. Xác nhận.
- Upload ảnh sản phẩm, ảnh biến thể, ảnh mô tả, slider và banner từ máy.
- Ảnh được lưu tại `BackEnd/ECommerceBackend/wwwroot/uploads/products`.
- Số lượng lô hàng ban đầu phải được phân bổ chính xác cho các biến thể.
- Tồn kho thực tế được quản lý theo từng biến thể và từng IMEI.
- Theo dõi lịch sử nhập kho, giữ hàng, xuất giao, hoàn kho, bán và điều chỉnh.
- Cảnh báo biến thể sắp hết hàng.

### Đơn hàng và nhân viên

- Sales nhận đơn, kiểm tra thanh toán và bàn giao sang Warehouse.
- Warehouse nhận đơn đã bàn giao, đối chiếu IMEI và xác nhận xuất giao.
- Hệ thống ngăn hai nhân viên cùng nhận một công việc trong cùng công đoạn.
- Admin và Manager có thể theo dõi hoặc phân công đơn cho nhân viên.
- Hủy đơn hoặc hết hạn thanh toán sẽ trả IMEI về trạng thái còn hàng.
- Đơn đã chuyển sang giao hàng không thể hủy thẳng và hoàn kho sai nghiệp vụ.

### Bảo hành

- Kích hoạt thời hạn bảo hành theo đúng IMEI khi đơn hoàn tất.
- Tạo phiếu tiếp nhận từ IMEI đã bán; khách hàng và thời hạn được tra tự động.
- Upload tối đa 6 ảnh tình trạng thiết bị từ máy.
- Phân công hoặc cho nhân viên Warranty tự nhận phiếu, có chống nhận trùng.
- Luồng xử lý: tiếp nhận, kiểm tra, chờ linh kiện, sửa chữa, hoàn tất và trả khách.
- Lưu chi phí dự kiến, chi phí thực tế, kết luận và toàn bộ lịch sử thao tác.
- Ảnh bảo hành được lưu tại
  `BackEnd/ECommerceBackend/wwwroot/uploads/warranties`.

### Đổi trả và hoàn tiền

- Khách hàng tạo yêu cầu đổi hoặc trả từ đơn đã hoàn tất trong vòng 30 ngày.
- Mỗi yêu cầu gắn với đúng sản phẩm, biến thể và IMEI đã bán.
- Upload tối đa 6 ảnh tình trạng thiết bị từ máy.
- Sales tiếp nhận, duyệt hoặc từ chối; Admin và Manager có thể phân công xử lý.
- Warehouse kiểm tra máy và phân loại về kho, chuyển bảo hành hoặc đánh dấu hư hỏng.
- Đổi máy chỉ sử dụng IMEI còn hàng thuộc đúng biến thể.
- Hoàn tiền hỗ trợ nhiều lần cho tới đủ số tiền, đồng thời cập nhật trạng thái
  thanh toán và đơn hàng.
- Lưu toàn bộ lịch sử trạng thái, nhân viên xử lý và giao dịch hoàn tiền.
- Ảnh đổi trả được lưu tại
  `BackEnd/ECommerceBackend/wwwroot/uploads/returns`.

### Chatbot và Consultant

- Chatbot truy xuất sản phẩm, giá, cấu hình và tồn kho từ PostgreSQL.
- Kết quả tư vấn hiển thị sản phẩm có cấu trúc và cho phép thêm biến thể vào
  giỏ hàng ngay trong cuộc trò chuyện.
- Lưu lại sản phẩm chatbot đã đề xuất và thời điểm khách thêm vào giỏ.
- Chatbot hỏi lại ngân sách và nhu cầu khi câu hỏi còn quá chung chung.
- Có thể so sánh nhanh 2-3 sản phẩm theo giá, cấu hình, camera, pin và tồn kho.
- Chấm điểm gợi ý theo nhu cầu chơi game, chụp ảnh, pin lâu, học tập hoặc làm việc.
- Theo dõi funnel từ lượt đề xuất, thêm giỏ tới tạo đơn hàng.
- Khách có thể yêu cầu gặp nhân viên tư vấn.
- Consultant tiếp nhận cuộc trò chuyện cùng toàn bộ lịch sử và các sản phẩm AI
  đã đề xuất.
- Có thể chạy với Ollama local, API OpenAI-compatible hoặc chế độ chỉ dùng dữ
  liệu catalog.

## Công nghệ

### Frontend

- React 19
- TypeScript 6
- Vite 8
- React Router 7
- Tailwind CSS 4
- Axios
- Lucide React

### Backend

- ASP.NET Core Web API trên .NET 8
- Entity Framework Core 8
- PostgreSQL
- JWT Bearer Authentication
- BCrypt
- Redis hoặc distributed memory cache
- Serilog
- Swagger/OpenAPI
- xUnit và SQLite cho integration tests

## Phân quyền

| Vai trò | Phạm vi chính |
| --- | --- |
| `Admin` | Toàn quyền hệ thống, nhân viên, nội dung, sản phẩm, đơn và audit log |
| `Manager` | Trung tâm điều phối, dashboard và giám sát các bộ phận |
| `Sales` | Nhận đơn, xác nhận thanh toán và bàn giao kho |
| `Warehouse` | Quản lý tồn kho, IMEI và xuất giao |
| `Warranty` | Tiếp nhận và xử lý bảo hành |
| `Content` | Workspace nội dung, tin tức, slider và banner; không sửa giá hoặc tồn kho |
| `Consultant` | Tiếp nhận hội thoại và theo dõi hiệu quả đề xuất của chatbot |
| `Customer` | Tài khoản mua hàng |

Backend kiểm tra quyền tại API và frontend tiếp tục giới hạn route, menu và thao
tác theo role. Hệ thống cũng bảo vệ Admin cuối cùng và không cho Admin tự vô
hiệu hóa hoặc tự hạ quyền chính mình.

## Cấu trúc dự án

```text
ECommerce/
├── BackEnd/
│   ├── ECommerceBackend/
│   │   ├── Controllers/       # REST API
│   │   ├── DTOs/              # Request/response contracts
│   │   ├── Data/              # Seed dữ liệu và khởi tạo schema hỗ trợ
│   │   ├── Filters/           # Audit action filter
│   │   ├── Middlewares/       # Exception handling, correlation ID
│   │   ├── Migrations/        # EF Core migrations
│   │   ├── Models/            # Entities và ECommerceContext
│   │   ├── Services/          # Chatbot, checkout, upload ảnh, audit
│   │   └── wwwroot/uploads/   # File ảnh upload local
│   └── ECommerceBackend.Tests/
├── FrontEnd/
│   └── src/
│       ├── api/
│       ├── components/
│       ├── features/
│       ├── layouts/
│       └── portals/
├── docs/
├── CHATBOT_SETUP.md
└── PROJECT_ROADMAP.md
```

## Yêu cầu môi trường

- .NET SDK 8
- Node.js 20 trở lên
- PostgreSQL
- Redis, không bắt buộc
- Ollama, không bắt buộc

## Cài đặt và chạy local

### 1. Tạo database PostgreSQL

Tạo đúng database có tên phân biệt hoa thường:

```sql
CREATE DATABASE "ECommerDB";
```

Database dự án đang sử dụng là `ECommerDB`, không phải `ecommerdb`.

Cập nhật connection string trong
`BackEnd/ECommerceBackend/appsettings.json`, hoặc dùng User Secrets:

```powershell
cd BackEnd/ECommerceBackend
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Host=localhost;Port=5432;Database=ECommerDB;Username=postgres;Password=YOUR_PASSWORD"
dotnet user-secrets set "JwtSettings:SecretKey" "YOUR_LOCAL_SECRET_KEY_MINIMUM_32_CHARACTERS"
```

### 2. Áp dụng migration

```powershell
cd BackEnd/ECommerceBackend
dotnet restore
dotnet ef database update
```

Khi backend chạy, `DbInitializer` sẽ bổ sung dữ liệu mẫu còn thiếu. Không cần
chạy lại file SQL seed thủ công.

### 3. Chạy backend

```powershell
cd BackEnd/ECommerceBackend
dotnet run --launch-profile https
```

- API: `https://localhost:7035/api`
- Swagger: `https://localhost:7035/swagger`
- Health check: `https://localhost:7035/api/health`

Nếu máy chưa tin cậy chứng chỉ development:

```powershell
dotnet dev-certs https --trust
```

### 4. Chạy frontend

```powershell
cd FrontEnd
npm install
npm run dev
```

Frontend mặc định chạy tại `http://localhost:5173` và gọi API
`https://localhost:7035/api`.

Để đổi địa chỉ backend, tạo `FrontEnd/.env.local`:

```env
VITE_API_URL=https://localhost:7035/api
```

## Tài khoản demo

| Vai trò | Email | Mật khẩu |
| --- | --- | --- |
| Admin | `admin300475@gmail.com` | `Admin@300475!` |
| Admin | `admin02@gmail.com` | `Admin@123456!` |
| Manager | `manager01@gmail.com` | `Manager@123456!` |
| Manager | `manager02@gmail.com` | `Manager@123456!` |
| Sales | `sales01@gmail.com` | `Sales@123456!` |
| Sales | `sales02@gmail.com` | `Sales@123456!` |
| Warehouse | `staff01@gmail.com` | `Warehouse@123456!` |
| Warehouse | `warehouse02@gmail.com` | `Warehouse@123456!` |
| Warranty | `warranty01@gmail.com` | `Warranty@123456!` |
| Warranty | `warranty02@gmail.com` | `Warranty@123456!` |
| Content | `content01@gmail.com` | `Content@123456!` |
| Content | `content02@gmail.com` | `Content@123456!` |
| Consultant | `consultant01@gmail.com` | `Consultant@123456!` |
| Consultant | `consultant02@gmail.com` | `Consultant@123456!` |
| Customer | `customer01@gmail.com` | `Customer@123456!` |
| Customer | `customer02@gmail.com` | `Customer@123456!` |

Các tài khoản này được seed tự động và có thể dùng ngay sau khi backend khởi
động.

## Cấu hình Redis

Redis là tùy chọn khi chạy local. Thiết lập:

```powershell
dotnet user-secrets set "ConnectionStrings:Redis" "localhost:6379"
```

Nếu chuỗi kết nối Redis để trống, backend vẫn chạy bằng memory cache. Memory
cache chỉ phù hợp cho một instance local và mất dữ liệu khi backend khởi động
lại.

## Cấu hình chatbot

Cấu hình mặc định dùng API tương thích OpenAI của Ollama:

```json
{
  "AiAssistant": {
    "Provider": "OpenAICompatible",
    "BaseUrl": "http://localhost:11434/v1",
    "ApiKey": "",
    "Model": "qwen2.5:3b"
  }
}
```

Chạy model local:

```powershell
ollama pull qwen2.5:3b
ollama serve
```

Nếu không muốn chạy model, đổi `AiAssistant:Provider` thành `Catalog`. Chatbot
vẫn tư vấn dựa trên dữ liệu PostgreSQL nhưng không gọi mô hình ngôn ngữ.

Xem thêm tại [CHATBOT_SETUP.md](CHATBOT_SETUP.md).

## Build và kiểm thử

Backend:

```powershell
cd BackEnd/ECommerceBackend
dotnet build -c Release
dotnet test ECommerceBackend.sln -c Release
```

Frontend:

```powershell
cd FrontEnd
npm run build
```

Kiểm tra ESLint:

```powershell
cd FrontEnd
npm run lint
```

Frontend hiện build production thành công. Tuy nhiên, cấu hình ESLint 10 vẫn
được chạy trong quy trình kiểm tra và hiện đạt `0 lỗi, 0 cảnh báo`.

Backend hiện có `58/58` integration test chạy qua, bao phủ đăng ký/đăng nhập,
chatbot, tranh chấp nhận tư vấn, checkout thành viên và khách vãng lai, thanh
toán/cọc, hoàn kho, Sales/Warehouse, phân quyền API, attribution chatbot và
nghiệp vụ bảo hành, đổi trả và hoàn tiền.

## Trạng thái và giới hạn hiện tại

- Thanh toán Momo, VNPay và ngân hàng đang là mô phỏng, chưa kết nối sandbox
  hoặc cổng thanh toán production.
- IMEI được tạo tạm khi Admin tạo sản phẩm để phục vụ demo. Khi vận hành thực
  tế, IMEI phải được nhập hoặc quét từ lô hàng thật.
- Forgot password chưa gửi email khôi phục thật.
- Redis và Ollama đều là thành phần tùy chọn khi chạy local.
- Dự án chưa cấu hình quy trình deploy production.
- Giao hàng vẫn cập nhật thủ công, chưa kết nối đơn vị vận chuyển thật.
- KPI chuyên sâu cho từng bộ phận vẫn có thể mở rộng thêm.

Kế hoạch tiếp theo được theo dõi tại [PROJECT_ROADMAP.md](PROJECT_ROADMAP.md).
Hướng dẫn migration chi tiết nằm tại
[docs/database_migration_guide.md](docs/database_migration_guide.md).
