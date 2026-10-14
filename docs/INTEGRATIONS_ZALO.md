# Zalo Integration — Verification and Guardrails

## 1. Mục tiêu

Thiết kế ứng dụng để có thể gắn connector nhắn tin sau này mà không giả định rằng mọi khả năng đều có sẵn. CRM phải hoạt động độc lập bằng demo connector.

## 2. Phân biệt phạm vi

- **Zalo Official Account (OA):** tích hợp phải dựa vào tài liệu API chính thức, quyền được cấp, loại tài khoản và chính sách hiện hành.
- **Zalo cá nhân:** không được mặc định rằng API OA cho phép đọc hộp thư cá nhân, đồng bộ tệp hoặc gửi hàng loạt từ tài khoản cá nhân.
- **Demo connector:** dùng dữ liệu giả lập, phục vụ phát triển giao diện và test.

## 3. Ba capability riêng biệt

### `READ_CHATS`
Cần xác minh:
- Tài liệu chính thức có cho phép lấy danh sách hội thoại trong phạm vi tài khoản này không?
- Phạm vi dữ liệu và quyền được cấp là gì?
- Có giới hạn phân trang, thời gian lưu hoặc webhook không?
- Đã thử nghiệm trên môi trường/tài khoản được phép chưa?

### `SYNC_MESSAGES_FILES`
Cần xác minh:
- Có thể đọc lịch sử tin nhắn đến mức nào?
- Có hỗ trợ hình ảnh/tệp và URL tải hợp lệ không?
- Token/URL tệp hết hạn ra sao?
- Có giới hạn lịch sử, loại tệp, dung lượng hoặc thời hạn không?
- Cơ chế lưu trữ, quyền riêng tư và xóa dữ liệu đã được xác định chưa?

### `BULK_SEND`
Cần xác minh:
- API/loại tài khoản có hỗ trợ gửi theo cách dự kiến không?
- Có yêu cầu người nhận đồng ý, cửa sổ tương tác hoặc mẫu tin không?
- Có quota, rate limit, chống spam và giới hạn nội dung nào?
- Có cơ chế dừng chiến dịch, retry có kiểm soát và idempotency không?
- Đã kiểm thử bằng tài khoản và người nhận được phép chưa?

## 4. Trạng thái

Capability:
- `PENDING`: chưa xem xét.
- `IN_REVIEW`: đang kiểm tra tài liệu/phạm vi.
- `VERIFIED`: có bằng chứng và test được ghi nhận.
- `REJECTED`: phương thức không được hỗ trợ/không được phép.
- `NEEDS_VERIFICATION`: hiện chưa đủ thông tin.

Connection:
- `NOT_CONFIGURED`
- `NOT_CONNECTED`
- `CONNECTING`
- `ACTIVE`
- `ERROR`
- `DISABLED`

`VERIFIED` không đồng nghĩa với connection `ACTIVE`, và `ACTIVE` không có nghĩa mọi capability đều được hỗ trợ.

## 5. Bằng chứng tối thiểu để đánh dấu VERIFIED

- URL tài liệu chính thức hoặc tài liệu được tổ chức cho phép sử dụng.
- Tên API/phương thức và phạm vi quyền.
- Ngày kiểm tra, người kiểm tra, môi trường kiểm thử.
- Kết quả thử nghiệm có thể tái lập và ghi nhận lỗi.
- Điều kiện/giới hạn rõ ràng.
- Đánh giá quyền riêng tư, retention và tuân thủ chính sách phù hợp.

Một đường link hoặc lời khẳng định của người dùng không tự động đủ làm bằng chứng.

## 6. Không được làm

- Không yêu cầu hoặc lưu mật khẩu Zalo cá nhân, OTP, cookie hay session token lấy bằng cách không được phép.
- Không dùng browser automation để vượt qua kiểm soát đăng nhập hoặc scrape dữ liệu không được phép.
- Không giả lập dữ liệu nhưng hiển thị như hội thoại thật.
- Không gửi hàng loạt thật khi capability chưa được xác minh.
- Không tuyên bố khôi phục tin nhắn đã xóa nếu không có cơ chế hỗ trợ được xác nhận.

## 7. Fallback

Nếu không có phương thức phù hợp:
- Duy trì CRM, bàn giao khách, ghi chú, tác vụ và báo cáo.
- Cho phép nhập dữ liệu thủ công hoặc import file chỉ khi dữ liệu được thu thập hợp pháp và người dùng có quyền xử lý.
- Giữ inbox ở chế độ demo hoặc hiển thị connector không khả dụng.
- Ghi rõ lý do và hướng dẫn người quản trị xem lại khi có tài liệu chính thức mới.
