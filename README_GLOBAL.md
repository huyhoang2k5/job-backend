# Hệ Thống Phân Tích CV và Gợi Ý Việc Làm bằng AI (CV Analysis & Job Recommendation System)

Chào mừng bạn đến với dự án **Hệ Thống Phân Tích CV và Gợi Ý Việc Làm bằng AI**! Đây là một nền tảng tìm kiếm và kết hợp việc làm toàn diện, được hỗ trợ bởi trí tuệ nhân tạo (AI) với 3 thành phần chính:
1. **cv-ai-service**: Dịch vụ AI phân tích CV và khớp việc làm viết bằng Python FastAPI.
2. **job-backend**: API server quản lý nghiệp vụ, xác thực người dùng, và chat thời gian thực viết bằng Node.js Express & MongoDB.
3. **job-frontend**: Giao diện người dùng hiện đại, trực quan viết bằng Next.js 14 TypeScript & Tailwind CSS.

---

## 🔍 Đánh Giá Trạng thái Hoạt Động Của Hệ Thống

Sau khi kiểm tra toàn bộ mã nguồn của dự án, hệ thống đang ở trạng thái **Sẵn sàng hoạt động (Ready to Run)**:
- **Cấu trúc mã nguồn**: Đầy đủ, mạch lạc, phân chia module rõ ràng (mô hình MVC cho Backend, App Router cho Frontend, cấu trúc Clean Architecture cho AI Service).
- **Môi trường cục bộ**: Máy tính của bạn đã cài đặt sẵn **Node.js v25.6.1**, **npm v11.9.0**, và **Python 3.9.6** - hoàn toàn tương thích để chạy trực tiếp các dịch vụ này mà không bắt buộc dùng Docker.
- **Yêu cầu bổ sung**: Để chạy ứng dụng, bạn chỉ cần tạo các file cấu hình môi trường `.env` từ file `.env.example` có sẵn trong mỗi thư mục và cài đặt các thư viện phụ thuộc (dependencies).

---

## 🚀 Hướng Dẫn Thiết Lập Nhanh (Quick Start)

### 1. Yêu Cầu Hệ Thống (Prerequisites)
- **Node.js** v18+ (Đã có sẵn `v25.6.1`)
- **Python** 3.9+ (Đã có sẵn `3.9.6`)
- **MongoDB** 5.0+ (Cần cài đặt cục bộ hoặc sử dụng MongoDB Atlas đám mây)
- **Tesseract OCR** (Sử dụng cho trích xuất chữ từ ảnh/PDF của dịch vụ AI)

---

### 2. Thiết Lập Từng Thành Phần (Manual Setup)

#### Bước 2.1: Cài đặt Dịch vụ AI (`cv-ai-service`)
```bash
cd cv-ai-service
# Tạo môi trường ảo Python
python3 -m venv venv
source venv/bin/activate  # Trên Windows dùng: venv\Scripts\activate

# Cài đặt các thư viện phụ thuộc
pip install -r requirements.txt

# Tải mô hình ngôn ngữ tiếng Anh của spaCy
python3 -m spacy download en_core_web_sm

# Tạo cấu hình môi trường (.env)
cp .env.example .env
```
*(Chi tiết cấu hình xem tại [cv-ai-service/README.md](file:///Users/dangquochuy/Documents/Projects/DoAnCN/cv-ai-service/README.md))*

---

#### Bước 2.2: Cài đặt Backend (`job-backend`)
```bash
cd ../job-backend
# Cài đặt thư viện Node.js
npm install

# Tạo cấu hình môi trường (.env)
cp .env.example .env
```
*(Chi tiết cấu hình xem tại [job-backend/README.md](file:///Users/dangquochuy/Documents/Projects/DoAnCN/job-backend/README.md))*

---

#### Bước 2.3: Cài đặt Frontend (`job-frontend`)
```bash
cd ../job-frontend
# Cài đặt thư viện Node.js
npm install

# Tạo cấu hình môi trường (.env.local)
cp .env.local.example .env.local
```
*(Chi tiết cấu hình xem tại [job-frontend/README.md](file:///Users/dangquochuy/Documents/Projects/DoAnCN/job-frontend/README.md))*

---

### 3. Khởi Chạy Ứng Dụng (Running the App)

#### Terminal 1: Khởi động Dịch vụ AI
```bash
cd cv-ai-service
source venv/bin/activate
python3 main.py
```
*Dịch vụ hoạt động tại: http://localhost:8000*
*Tài liệu API (Swagger): http://localhost:8000/docs*

#### Terminal 2: Khởi động Backend API
```bash
cd job-backend
npm run dev
```
*API chạy tại: http://localhost:3001*

#### Terminal 3: Khởi động Frontend
```bash
cd job-frontend
npm run dev
```
*Giao diện chạy tại: http://localhost:3000*

---

## 🛠️ Triển Khai Bằng Docker (Nếu có Docker)

Nếu máy tính của bạn đã được cài đặt và kích hoạt Docker Desktop, bạn có thể khởi chạy toàn bộ hệ thống (bao gồm cả MongoDB và Redis) chỉ bằng **một câu lệnh duy nhất** từ thư mục gốc của dự án:

```bash
docker-compose up -d --build
```

Lệnh này sẽ tự động tải các image cần thiết, build mã nguồn của cả 3 dịch vụ và liên kết chúng lại với nhau.

---

## 📁 Cấu Trúc Dự Án (Project Structure)

```
DoAnCN/
├── cv-ai-service/          # Dịch vụ AI (FastAPI & TensorFlow)
│   ├── app/                # Logic xử lý chính (NLP, OCR, Model AI)
│   ├── main.py             # File khởi chạy dịch vụ
│   └── requirements.txt    # Danh sách thư viện Python
├── job-backend/            # Backend API (Node.js Express & MongoDB)
│   ├── src/                # Controllers, Routes, Models, Services
│   ├── server.js           # Khởi chạy server Node.js
│   └── package.json        # Dependencies của backend
└── job-frontend/           # Frontend (Next.js 14 App Router & Tailwind CSS)
    ├── src/                # Components, Pages, State Management (Zustand)
    ├── package.json        # Dependencies của frontend
    └── next.config.js      # Cấu hình Next.js
```

---

## 📄 Tài Liệu Chi Tiết Từng Repo

Để xem hướng dẫn chi tiết về cấu hình, danh sách API endpoints, và cách khắc phục lỗi thường gặp cho từng thành phần, vui lòng đọc các tài liệu tiếng Việt sau:
- 🐍 **AI Service**: [cv-ai-service/README.md](file:///Users/dangquochuy/Documents/Projects/DoAnCN/cv-ai-service/README.md)
- 🟢 **Backend API**: [job-backend/README.md](file:///Users/dangquochuy/Documents/Projects/DoAnCN/job-backend/README.md)
- 🔵 **Frontend**: [job-frontend/README.md](file:///Users/dangquochuy/Documents/Projects/DoAnCN/job-frontend/README.md)

---

## 📜 Giấy Phép (License)

Dự án này được cấp phép theo giấy phép MIT.
