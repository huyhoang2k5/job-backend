# Job Backend API

Hệ thống RESTful API hoàn chỉnh dành cho nền tảng tuyển dụng và so khớp việc làm, hỗ trợ xác thực người dùng, chat thời gian thực, và quản lý tệp tin.

---

## ✨ Các Tính Năng Nổi Bật

- **Xác Thực JWT**: Đăng nhập an toàn sử dụng cặp Access Token & Refresh Token.
- **Phân Quyền Vai Trò (Role-based Access)**: Phân quyền chặt chẽ giữa 3 nhóm đối tượng: Ứng viên (Candidate), Nhà tuyển dụng (Employer), và Quản trị viên (Admin).
- **RESTful API**: Tập hợp đầy đủ các API CRUD quản lý Người dùng, Việc làm, Hồ sơ ứng tuyển.
- **Chat Thời Gian Thực**: Tích hợp công nghệ **Socket.IO** cho phép trao đổi tin nhắn tức thì giữa Ứng viên và Nhà tuyển dụng.
- **Tải Lên Tệp Tin**: Liên kết dịch vụ đám mây **Cloudinary** để lưu trữ CV và ảnh hồ sơ trực tuyến một cách an toàn.
- **Thông Báo Email**: Gửi email thông báo tự động (Xác nhận tài khoản, trạng thái hồ sơ,...) bằng **Nodemailer**.
- **Cơ Sở Dữ Liệu**: Sử dụng **MongoDB** kết hợp với thư viện ánh xạ **Mongoose ODM**.
- **Xác Thực Đầu Vào**: Kiểm soát dữ liệu đầu vào nghiêm ngặt bằng thư viện **Joi**.
- **Giới Hạn Tần Suất (Rate Limiting)**: Bảo vệ hệ thống khỏi các cuộc tấn công spam và brute-force.

---

## 🛠️ Công Nghệ Sử Dụng (Tech Stack)

- **Node.js 18+** - Môi trường chạy mã nguồn Javascript phía Server.
- **Express.js** - Web framework tối giản và linh hoạt.
- **MongoDB** - Cơ sở dữ liệu NoSQL lưu trữ dữ liệu dạng tài liệu JSON.
- **Mongoose** - Thư viện ODM mạnh mẽ liên kết cấu trúc dữ liệu với MongoDB.
- **Socket.IO** - Giao thức truyền thông hai chiều thời gian thực dựa trên WebSockets.
- **JWT (JSON Web Tokens)** - Xác thực trạng thái đăng nhập.
- **Bcrypt.js** - Băm mật khẩu người dùng bảo mật cao trước khi lưu trữ.
- **Cloudinary** - Nền tảng lưu trữ và tối ưu hóa hình ảnh, tệp tin đa phương tiện đám mây.
- **Nodemailer** - Gửi email từ Node.js.
- **Multer** - Middleware xử lý dữ liệu biểu mẫu `multipart/form-data` (upload file).
- **Joi** - Định nghĩa và xác thực cấu trúc đối tượng dữ liệu đầu vào.
- **Redis** - Hỗ trợ lưu trữ cache và tối ưu hóa phiên làm việc (tùy chọn).

---

## 📋 Yêu Cầu Hệ Thống (Prerequisites)

- **Node.js** phiên bản 18 hoặc cao hơn (Bạn đang có sẵn phiên bản mới nhất `v25.6.1`)
- **npm** hoặc **yarn** (Đã có sẵn npm `11.9.0`)
- **MongoDB** phiên bản 5.0 trở lên
- **Redis** (tùy chọn, cần thiết nếu bạn kích hoạt tính năng lưu cache phiên làm việc)

---

## 🚀 Hướng Dẫn Cài Đặt (Installation)

### 1. Cài đặt trực tiếp (Local Development)

#### Bước 1.1: Di chuyển vào thư mục backend và cài đặt thư viện phụ thuộc
```bash
cd job-backend
npm install
```

#### Bước 1.2: Tạo file cấu hình môi trường `.env`
Sao chép file ví dụ có sẵn để bắt đầu cấu hình:
```bash
cp .env.example .env
```

#### Bước 1.3: Khởi động cơ sở dữ liệu MongoDB
* **Cách 1: Khởi động cục bộ hệ thống**: Chạy dịch vụ `mongod` trên máy của bạn.
* **Cách 2: Sử dụng Docker**:
  ```bash
  docker run -d -p 27017:27017 --name job-matching-mongo mongo:5.0
  ```
* **Cách 3: Sử dụng MongoDB Atlas**: Tạo một database miễn phí trên đám mây và lấy đường dẫn kết nối dán vào file `.env`.

---

### 2. Sử dụng Docker (Nếu có)

#### Build Docker Image:
```bash
docker build -t job-backend .
```

#### Khởi chạy Container:
```bash
docker run -d -p 3001:3001 --env-file .env --name job-backend job-backend
```

---

## ⚙️ Cấu Hình Môi Trường (Configuration)

Hãy chỉnh sửa các giá trị thực tế của bạn trong file `.env` vừa tạo:

```env
# Cấu hình Máy chủ Backend
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Đường dẫn Kết nối MongoDB (Atlas hoặc Cục bộ)
MONGODB_URI=mongodb://localhost:27017/job-matching

# Cấu hình Bảo mật JWT
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRE=7d
JWT_REFRESH_SECRET=your-refresh-token-secret
JWT_REFRESH_EXPIRE=30d

# Cấu hình Gửi Email (Ví dụ dùng Gmail SMTP)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password             # Cần tạo "Mật khẩu ứng dụng" trong cài đặt tài khoản Google
FROM_EMAIL=noreply@jobmatching.com

# Cấu hình Lưu trữ Đám mây Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Liên kết dịch vụ AI
AI_SERVICE_URL=http://localhost:8000

# Cấu hình Upload File
MAX_FILE_SIZE=10485760                   # 10MB
ALLOWED_FILE_TYPES=pdf,docx,jpg,jpeg,png

# Giới hạn Tần suất Yêu cầu (Rate Limiting)
RATE_LIMIT_WINDOW_MS=900000              # 15 phút
RATE_LIMIT_MAX_REQUESTS=100              # Tối đa 100 requests trên mỗi IP trong 15 phút
```

---

## 🏃 Khởi Chạy Ứng Dụng (Running)

### Chế độ phát triển (Development Mode)
Sử dụng công cụ `nodemon` để tự động khởi động lại server mỗi khi bạn lưu thay đổi mã nguồn:

```bash
npm run dev
```

### Chế độ vận hành (Production Mode)
Khởi chạy dịch vụ chính thức sử dụng trực tiếp lệnh Node.js hoặc thông qua trình quản lý tiến trình PM2 (khuyên dùng):

```bash
# Thiết lập môi trường sản xuất
export NODE_ENV=production

# Chạy thông thường
npm start

# Hoặc chạy thông qua PM2 để tự động khôi phục khi gặp crash
npm install -g pm2
pm2 start src/server.js --name "job-backend"
```

---

## 📖 Danh Sách Các Endpoint API Chính

Tất cả các API (ngoại trừ đăng nhập/đăng ký) đều yêu cầu đính kèm JWT token vào header: `Authorization: Bearer <token>`

### 1. Xác thực tài khoản (`/api/auth`)
- `POST /api/auth/register` - Đăng ký tài khoản mới (Candidate / Employer / Admin).
- `POST /api/auth/login` - Đăng nhập nhận Access Token & Refresh Token.
- `POST /api/auth/refresh-token` - Tạo mới Access Token khi token cũ hết hạn.
- `POST /api/auth/logout` - Đăng xuất tài khoản.
- `POST /api/auth/forgot-password` - Yêu cầu khôi phục mật khẩu qua email.
- `POST /api/auth/reset-password` - Đặt lại mật khẩu mới.

### 2. Quản lý việc làm (`/api/jobs`)
- `GET /api/jobs` - Duyệt danh sách việc làm đang mở (Dành cho ứng viên tìm kiếm).
- `GET /api/jobs/:id` - Xem chi tiết một công việc cụ thể.
- `POST /api/jobs` - Đăng tuyển công việc mới (Chỉ dành cho Nhà tuyển dụng).
- `PUT /api/jobs/:id` - Cập nhật nội dung tuyển dụng (Chỉ dành cho Nhà tuyển dụng).
- `DELETE /api/jobs/:id` - Xóa tin tuyển dụng (Chỉ dành cho Nhà tuyển dụng).

### 3. Hồ sơ ứng tuyển (`/api/applications`)
- `POST /api/applications` - Ứng tuyển vào công việc bằng file CV và thư xin việc (Chỉ dành cho Ứng viên).
- `GET /api/applications` - Danh sách hồ sơ đã gửi hoặc hồ sơ nhận được (Tùy theo vai trò người dùng).
- `PATCH /api/applications/:id/status` - Cập nhật trạng thái duyệt hồ sơ (Duyệt/Từ chối - Chỉ dành cho Nhà tuyển dụng).
- `POST /api/applications/:id/interview` - Lên lịch hẹn phỏng vấn (Chỉ dành cho Nhà tuyển dụng).

### 4. Quản lý CV (`/api/cv`)
- `POST /api/cv/upload` - Tải lên file CV mới nhất và tự động kích hoạt AI xử lý trích xuất thông tin kỹ năng.
- `GET /api/cv` - Xem dữ liệu phân tích chi tiết của CV hiện tại.
- `PUT /api/cv` - Chỉnh sửa thông tin kỹ năng thủ công nếu cần thiết.

### 5. Trò chuyện thời gian thực (`/api/messages`)
- `GET /api/messages/conversations` - Danh sách các cuộc trò chuyện hiện tại.
- `GET /api/messages/conversations/:id` - Đọc lịch sử tin nhắn của cuộc trò chuyện.
- `POST /api/messages` - Gửi tin nhắn mới.

---

## 💬 Giao Thức Tin Nhắn Socket.IO (Real-time Chat)

Backend hỗ trợ kết nối WebSocket hai chiều cho phép chat thời gian thực.

### 1. Kết nối từ Client:
```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3001', {
  auth: {
    token: 'jwt-token-cua-nguoi-dung'
  }
});
```

### 2. Các sự kiện chính:
- **Join phòng chat**: Gửi sự kiện `joinRoom` với tham số `{ roomId: "id_cuoc_tro_chuyen" }` để tham gia phòng chat riêng.
- **Gửi tin nhắn**: Gửi sự kiện `sendMessage` với nội dung tin nhắn dạng `{ roomId, content }`.
- **Nhận tin nhắn**: Lắng nghe sự kiện `newMessage` để nhận tin nhắn mới tức thì từ người kia và cập nhật lên UI.
- **Trạng thái đang gõ**: Gửi sự kiện `typing` `{ roomId, isTyping: true/false }` và lắng nghe sự kiện `userTyping` để hiển thị hiệu ứng "đang soạn tin...".

---

## 🧪 Kiểm Thử (Testing)

Dự án tích hợp sẵn framework **Jest** để viết và chạy các ca kiểm thử tự động (Unit Test / Integration Test):

```bash
# Chạy toàn bộ các test cases
npm test

# Chạy test và theo dõi thay đổi trực tiếp (Watch Mode)
npm run test:watch
```

---

## 🛠️ Khắc Phục Lỗi Thường Gặp (Troubleshooting)

### 1. Không thể kết nối cơ sở dữ liệu (`Connected to MongoDB error`)
- **Khắc phục**: Đảm bảo dịch vụ MongoDB cục bộ của bạn đang chạy ở cổng mặc định `27017` hoặc cập nhật chính xác đường dẫn kết nối `MONGODB_URI` trong file `.env`. Nếu kết nối đến MongoDB Atlas, đảm bảo bạn đã cấu hình Whitelist IP trên bảng điều khiển Atlas của mình.

### 2. Lỗi tải lên ảnh/tài liệu bị từ chối (`Cloudinary upload failed`)
- **Khắc phục**: Hãy kiểm tra kỹ 3 thông số bảo mật Cloudinary trong `.env` (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, và `CLOUDINARY_API_SECRET`). Đảm bảo thông tin sao chép từ tài khoản Cloudinary của bạn là chính xác và không chứa dấu cách thừa.


Vai trò (Role)	Email	Mật khẩu (Password)
Ứng viên (Candidate)	candidate_1655@test.com	Password123
Nhà tuyển dụng (Employer)	employer_1655@test.com	Password123
Quản trị viên (Admin)	admin_1655@test.com	Password123