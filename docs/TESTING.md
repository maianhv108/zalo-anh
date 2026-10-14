# Testing Strategy

## 1. Các tầng test

- Unit tests: service, validation, permission checks, capability gating.
- Integration tests: API + database test.
- E2E tests: luồng đăng nhập, CRM, bàn giao, inbox demo, verification và campaign dry-run.
- UI checks: responsive, empty/error/loading states, form validation.
- Security checks: role boundaries, IDOR/BOLA, export permissions, file download permissions.

## 2. Các ca kiểm thử bắt buộc

### Auth/RBAC
- Chưa đăng nhập không truy cập được endpoint bảo vệ.
- Sale không sửa người dùng/verification/campaign ngoài quyền.
- Sale không đọc khách ngoài phạm vi được cấp.
- Manager không vượt phạm vi đội nếu hệ thống giới hạn theo đội.

### CRM
- Tạo/sửa/tìm kiếm/lọc/phân trang khách.
- Validation số điện thoại/email nếu có.
- Bàn giao khách yêu cầu lý do và ghi lịch sử.
- Lỗi transaction không để assignment và audit log lệch nhau.

### Inbox/archive
- Demo inbox hiển thị nhãn demo.
- Tệp chỉ tải được bởi người có quyền.
- Không hiển thị dữ liệu giả như dữ liệu đồng bộ thật.

### Integration verification
- Capability `PENDING` không cho dùng chức năng thực tế.
- Capability `VERIFIED` nhưng connector không active vẫn bị khóa.
- Connection `ACTIVE` nhưng capability chưa verified vẫn bị khóa.
- URL bằng chứng đơn lẻ không tự động làm capability verified.
- Zalo personal connector mặc định `NEEDS_VERIFICATION`/`NOT_AVAILABLE`.

### Campaign
- Dry-run không gửi tin thật.
- Gửi thật bị chặn khi capability/permission/connection chưa đạt.
- Chống gửi lặp hoặc idempotency được kiểm thử.
- Lưu log kết quả và lỗi.

## 3. Lệnh kiểm tra đề xuất

Điều chỉnh theo package scripts thực tế:
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm test:e2e`
- `pnpm build`

AI phải ghi rõ lệnh nào thực sự chạy và kết quả; không được suy đoán.
