# Sales Zalo Management System

Hệ thống quản lý khách hàng (CRM) và hoạt động đội ngũ Sale tập trung nhiều tài khoản Zalo theo kiến trúc Monorepo, bảo mật chuẩn SaaS và kiểm soát chặt chẽ khả năng tích hợp Zalo (Capability Gating).

---

## 1. Truy Cập Nhanh Ứng Dụng (Đang Chạy Local)

| Thành phần | Địa chỉ URL | Ghi chú |
| :--- | :--- | :--- |
| **Frontend Portal** | [http://localhost:3000](http://localhost:3000) | Next.js 14 App Router, Tailwind CSS, Lucide icons |
| **Backend REST API** | [http://localhost:4000/api/v1](http://localhost:4000/api/v1) | NestJS, TypeScript, Prisma ORM, PostgreSQL 16 |
| **Swagger API Docs** | [http://localhost:4000/api/docs](http://localhost:4000/api/docs) | Tài liệu OpenAPI tương tác trực tiếp |

### Tài khoản Kiểm thử Sẵn có (Demo Accounts)

Hệ thống đã được nạp sẵn dữ liệu mẫu (`db:seed`) với 3 cấp độ phân quyền:

| Vai trò | Email đăng nhập | Mật khẩu | Quyền hạn |
| :--- | :--- | :--- | :--- |
| **ADMIN** | `admin@saleszalo.local` | `Admin@123456` | Toàn quyền cấu hình hệ thống, quản lý nhân viên, bàn giao khách, audit logs |
| **MANAGER** | `manager1@saleszalo.local` | `Manager@123456` | Quản lý đội ngũ Sale Hà Nội, giám sát khách hàng, duyệt bàn giao |
| **SALE** | `sale01@saleszalo.local` | `Sale@123456` | Quản lý 14 khách hàng được phân công, hộp thư tương tác, gửi ghi chú chăm sóc |

*(Ngoài ra có các tài khoản `manager2`, `sale02` đến `sale08` với cùng định dạng mật khẩu).*

---

## 2. Kiến Trúc Dự Án (Monorepo)

```
sales-zalo-project-docs/
├── apps/
│   ├── api/                    # NestJS REST API (Port 4000, prefix /api/v1)
│   │   ├── prisma/             # Schema Prisma & Migration PostgreSQL 16
│   │   │   ├── schema.prisma   # 13 Models: User, Customer, Message, AuditLog...
│   │   │   └── seed.ts         # Script sinh 100 khách hàng, 8 Sales, demo chats
│   │   └── src/                # 18 Modules nghiệp vụ tách bạch
│   └── web/                    # Next.js 14 App Router Portal (Port 3000)
│       ├── app/                # 14 Routes: login, dashboard, customers, sales, inbox...
│       ├── components/         # Reusable UI & Modal components
│       └── lib/                # API client fetchApi & utils
├── packages/
│   └── shared/                 # Shared TypeScript types, enums, Zod validation schemas
├── docs/                       # Bộ 11 tài liệu thiết kế (MRD, PRD, ARCHITECTURE, ...)
├── scripts/                    # Kịch bản kiểm thử tích hợp (test-e2e-all-phases.mjs)
├── AGENTS.md                   # Quy tắc bắt buộc dành cho AI coding agent
└── docker-compose.yml          # Cấu hình container PostgreSQL dự phòng
```

---

## 3. Quy Tắc Gating Tích Hợp Zalo Cá Nhân

Dự án áp dụng nguyên tắc **Fail-Closed Security** đối với các tài khoản Zalo cá nhân của nhân viên Sale:
1. **Phân biệt Zalo OA và Zalo Cá nhân:** Zalo OA có API chính thức, trong khi Zalo cá nhân không hỗ trợ API công khai cho việc đọc toàn bộ hội thoại hoặc gửi tin tự động hàng loạt.
2. **Ba Capability Độc Lập:**
   - `READ_CHATS`: Đọc danh sách và nội dung hội thoại.
   - `SYNC_MESSAGES_FILES`: Tự động đồng bộ hóa tin nhắn và tệp tin vào kho lưu trữ.
   - `BULK_SEND`: Gửi tin nhắn tiếp thị hàng loạt từ tài khoản cá nhân.
3. **Chặn gửi thật khi chưa xác minh (Fail-Closed):** Mọi hành vi kích hoạt gửi thật tin nhắn hàng loạt từ tài khoản cá nhân đều bị chặn ở tầng Controller của Backend (`HTTP 400 Bad Request: GATING VIOLATION`) cho đến khi có chứng chỉ tích hợp được phê duyệt.
4. **Không thu thập dữ liệu trái phép:** Không lưu mật khẩu, OTP, cookie phiên Zalo cá nhân, không can thiệp scraping trình duyệt vi phạm điều khoản của Zalo.

---

## 4. Hướng Dẫn Chạy Kiểm Thử Toàn Diện (E2E Integration)

Hệ thống đã tích hợp 2 kịch bản kiểm thử tự động toàn diện:

```bash
# 1. Kiểm thử toàn diện 6 giai đoạn CRM & Capability Gating
pnpm test:e2e

# 2. Kiểm thử riêng tính năng Mời nhân viên Sale bằng Mã QR
pnpm test:qr
```

### 4.1. Quy Trình Mời Nhân Viên Sale Bằng Mã QR (QR Invite Workflow)

1. **Admin / Manager:** Bấm **"Mời nhân viên Sale (Mã QR)"** tại màn hình Quản lý Sale (`/sales`):
   - Chọn Đội nhóm kinh doanh phân công (Đội Hà Nội, Đội TP.HCM hoặc Chưa phân đội).
   - Hệ thống sinh mã QR bảo mật cao (Token `inv_...` ngẫu nhiên 48 ký tự hex, thời hạn 15 phút).
   - Hiển thị Live Badge: `Đang chờ quét` 🟡 → `Đã quét mã` 🔵 → `Tham gia thành công` 🟢.
   - Khi hoàn tất, danh sách Sale tự động làm mới thời gian thực mà không cần tải lại trang!
2. **Nhân viên Sale (Mobile / Browser):**
   - Quét mã QR mở trang `/invite/:token`.
   - Hệ thống tự động ghi nhận trạng thái `SCANNED` về máy chủ.
   - Nhân viên chỉ cần xác nhận thông tin cơ bản: Họ tên, Email, Số điện thoại và Mật khẩu nội bộ.
   - Tuyệt đối **không thu thập mật khẩu Zalo cá nhân**.
   - Quyền hạn được gán cố định là `SALE` ở máy chủ (chống tự nâng quyền).
   - Tự động khởi tạo kết nối Zalo cá nhân và 3 Capability ở trạng thái kiểm soát (Gated Mode).

---

## 5. Lệnh Quản Trị Hệ Thống (Development Commands)

```bash
# Khởi động đồng thời Frontend và Backend
pnpm dev

# Chạy riêng Backend
pnpm --filter @sales-zalo/api dev

# Chạy riêng Frontend
pnpm --filter @sales-zalo/web dev

# Chạy database migration
pnpm --filter @sales-zalo/api prisma:migrate

# Nạp lại toàn bộ dữ liệu mẫu (Demo seed)
pnpm --filter @sales-zalo/api seed
```
