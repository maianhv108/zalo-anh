# Security, Privacy and Access Control

## 1. Nguyên tắc

- Least privilege.
- Server-side authorization.
- Secure defaults and fail closed.
- Data minimization.
- Audit sensitive actions.
- Separate demo data from production data.

## 2. Authentication

- Hash mật khẩu bằng thuật toán phù hợp như Argon2id hoặc bcrypt với cấu hình an toàn.
- Không lưu mật khẩu dạng rõ.
- Không cho phép tạo Admin công khai.
- Dùng cookie/session an toàn hoặc chiến lược token được thiết kế rõ; bảo vệ CSRF nếu phù hợp.
- Rate-limit login và các endpoint nhạy cảm.
- Không ghi mật khẩu, token hoặc cookie vào logs.

## 3. Authorization

- `ADMIN`, `MANAGER`, `SALE` là vai trò khởi đầu.
- Sale chỉ được truy cập khách được giao hoặc phạm vi cụ thể đã được chính sách cho phép.
- Manager chỉ xem/điều phối đội thuộc phạm vi mình quản lý.
- Kiểm tra quyền trên mỗi endpoint và thao tác tải tệp.
- Thử nghiệm IDOR/BOLA bằng cách truy cập ID của người dùng/khách khác.

## 4. Customer data

- Chỉ thu thập dữ liệu cần thiết và có căn cứ sử dụng.
- Xác định retention, quy trình xóa/ẩn danh và xử lý yêu cầu dữ liệu.
- Hạn chế quyền export; ghi audit log.
- Không dùng dữ liệu khách thật trong seed/test.
- Không đưa nội dung tin nhắn nhạy cảm vào telemetry/logs.

## 5. Secrets and integrations

- Dùng biến môi trường hoặc secret manager; `.env` không commit.
- `.env.example` chỉ chứa placeholder.
- Không hiển thị lại secret đầy đủ sau khi lưu.
- Không lưu credential đăng nhập Zalo cá nhân, OTP, cookie hoặc session thu thập trái phép.
- Thu hồi và xoay vòng token khi cần.

## 6. Files

- Kiểm tra MIME type và kích thước.
- Tên tệp do server tạo; không dùng trực tiếp đường dẫn do người dùng cung cấp.
- Không thực thi tệp tải lên.
- Download qua endpoint có authorization hoặc signed URL thời hạn ngắn.
- Có thể quét malware nếu môi trường triển khai hỗ trợ.

## 7. Audit events

Tối thiểu ghi:
- Thay đổi vai trò/người dùng.
- Xuất dữ liệu khách.
- Bàn giao khách.
- Thay đổi verification/cấu hình connector.
- Preview/dry-run/xác nhận chiến dịch.
- Hành động quản trị quan trọng.

Không ghi nội dung secret hoặc dữ liệu nhạy cảm không cần thiết vào audit payload.
