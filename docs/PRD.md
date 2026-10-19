# PRD — Product Requirements Document

## 1. Tóm tắt sản phẩm

**Tên làm việc:** Sales Zalo Management System  
**Loại sản phẩm:** Web CRM nội bộ, giao diện tiếng Việt.  
**Mục tiêu:** Quản lý Sale, khách hàng, lịch sử chăm sóc, hộp thư hội thoại (demo hoặc connector đã xác minh), kho lưu trữ, chiến dịch và báo cáo.

## 2. Vai trò và quyền

- `ADMIN`: quản trị người dùng, quyền, tích hợp, cài đặt và toàn bộ nhật ký.
- `MANAGER`: quản lý Sale trong phạm vi được phân quyền, xem và phân công khách, xem báo cáo đội nhóm.
- `SALE`: xem và cập nhật khách được giao, ghi chú, tác vụ và hoạt động được phép.
- API phải kiểm tra quyền ở server; ẩn nút ở frontend không được xem là kiểm soát truy cập.

## 3. Yêu cầu chức năng

### FR-01 — Đăng nhập và phiên làm việc
- Đăng nhập an toàn, đăng xuất, trạng thái phiên rõ ràng.
- Không có đăng ký Admin công khai.
- Hỗ trợ seed tài khoản demo trong môi trường phát triển; mật khẩu demo phải được ghi rõ là chỉ dùng local.

### FR-02 — Dashboard
- KPI: tổng khách, khách mới, khách đang chăm sóc, khách chờ phản hồi, khách chuyển đổi, tác vụ quá hạn.
- Biểu đồ khách theo trạng thái và hoạt động chăm sóc theo thời gian.
- Hiển thị nhãn `DEMO DATA` khi dữ liệu là dữ liệu mẫu.
- Các số liệu lấy từ API/backend, không gán số cố định trong component.

### FR-03 — Quản lý Sale
- Danh sách, tìm kiếm, lọc theo nhóm và trạng thái.
- Tạo/sửa/khóa tài khoản theo quyền.
- Trang chi tiết Sale có thông tin cơ bản, khách phụ trách, hoạt động và tab tích hợp.
- Không lưu mật khẩu Zalo cá nhân của Sale.

### FR-04 — CRM khách hàng
- Tạo, xem, sửa, tìm kiếm, lọc, phân trang khách.
- Trường đề xuất: tên, số điện thoại (nếu có căn cứ lưu), email, nguồn, trạng thái, Sale phụ trách, nhãn, ngày tạo, lần chăm sóc gần nhất, lần chăm sóc tiếp theo.
- Trạng thái: `NEW`, `CONTACTED`, `CONSULTING`, `WAITING_REPLY`, `FOLLOW_UP`, `CONVERTED`, `DROPPED`.
- Xuất CSV chỉ cho vai trò được phép; ghi audit log khi xuất dữ liệu nhạy cảm.

### FR-05 — Hồ sơ khách hàng
- Tab Tổng quan, Lịch sử chăm sóc, Hội thoại, Ghi chú, Tệp, Tác vụ, Lịch sử phân công.
- Cho phép ghi hoạt động, ghi chú và tạo tác vụ tiếp theo.
- Lịch sử phân công không bị ghi đè khi đổi Sale.

### FR-06 — Hộp thư đa hội thoại
- Bố cục ba vùng: danh sách Sale/hộp thư, danh sách hội thoại, nội dung hội thoại và thông tin khách.
- Có thể mở nhiều hội thoại trong các tab/panel, ghim, đóng và đổi thứ tự.
- Có tìm kiếm và lọc theo Sale, trạng thái, kênh và thời gian.
- Hội thoại demo phải có nhãn demo rõ ràng.
- Không giả lập trạng thái “đã đồng bộ từ Zalo” nếu dữ liệu chưa được connector thực sự cung cấp.

### FR-07 — Kho lưu trữ
- Danh sách tin nhắn/tệp đã thu thập hợp pháp, có nguồn, thời gian, khách/hội thoại liên quan và quyền truy cập.
- Tìm kiếm/lọc theo loại tệp, ngày, Sale và khách.
- Kiểm tra quyền khi tải xuống.
- Không tuyên bố khôi phục được tin nhắn đã xóa hoặc tệp không được hệ thống thu thập.

### FR-08 — Xác minh khả năng tích hợp cho từng Sale
Mỗi Sale có trang cài đặt gồm ba capability:
- `READ_CHATS`: khả năng đọc hội thoại.
- `SYNC_MESSAGES_FILES`: khả năng đồng bộ tin nhắn và tệp.
- `BULK_SEND`: khả năng gửi tin hàng loạt.

Mỗi capability lưu:
- Trạng thái: `PENDING`, `IN_REVIEW`, `VERIFIED`, `REJECTED`, `NEEDS_VERIFICATION`.
- Phương thức/connector được đề xuất.
- URL tài liệu hoặc mã tham chiếu bằng chứng.
- Phạm vi đã xác minh, ghi chú, người xác minh, thời điểm xác minh.
- Kết quả kiểm thử và lý do từ chối/chưa đạt.

Trạng thái kết nối tài khoản tách biệt:
`NOT_CONFIGURED`, `NOT_CONNECTED`, `CONNECTING`, `ACTIVE`, `ERROR`, `DISABLED`.

Không tự động đánh dấu `VERIFIED` chỉ vì có URL. Việc xác minh cần người có thẩm quyền xem xét tài liệu và kết quả kiểm thử.

### FR-09 — Kiến trúc connector
- Định nghĩa interface chung cho connector.
- Có `DemoConnector` hoạt động với dữ liệu seed.
- Có adapter riêng cho Zalo OA nếu được cấu hình với API/quyền hợp lệ.
- Connector tài khoản Zalo cá nhân giữ `NEEDS_VERIFICATION`/`NOT_AVAILABLE` cho tới khi có phương thức hợp pháp, được hỗ trợ và thử nghiệm.
- Mỗi connector khai báo capability hỗ trợ; không dùng một cờ “connected” để suy ra tất cả capability.

### FR-10 — Chiến dịch gửi tin
- Soạn nội dung, chọn đối tượng hợp lệ, xem trước, kiểm tra trùng lặp và xác nhận.
- Hiển thị số người nhận dự kiến và trạng thái connector trước khi gửi.
- Mặc định chạy preview/dry-run.
- Gửi thật bị khóa khi `BULK_SEND` chưa `VERIFIED`, connector chưa active hoặc thiếu quyền.
- Lưu log kết quả theo người nhận, thời gian và lỗi; có cơ chế giới hạn tốc độ, chống gửi lặp và hủy chiến dịch nếu connector hỗ trợ.

### FR-11 — Bàn giao khách
- Chuyển khách giữa Sale theo quyền.
- Bắt buộc ghi lý do; ghi Sale cũ, Sale mới, người thao tác, thời điểm.
- Giữ nguyên lịch sử hoạt động, hội thoại và ghi chú.
- Có thể chọn nhiều khách để bàn giao hàng loạt nếu quyền cho phép.

### FR-12 — Báo cáo
- Báo cáo khách theo trạng thái/nguồn/Sale.
- Báo cáo hoạt động chăm sóc, tác vụ quá hạn và chuyển đổi.
- Có bộ lọc thời gian.
- Ghi rõ nguồn dữ liệu và trạng thái demo nếu áp dụng.

### FR-13 — Nhật ký hoạt động
- Ghi các hành động quan trọng: đăng nhập quản trị, tạo/sửa/khóa người dùng, xuất dữ liệu, bàn giao khách, thay đổi cài đặt tích hợp, thao tác chiến dịch.
- Nhật ký không được cho người dùng thông thường sửa/xóa.

### FR-14 — Cài đặt hệ thống
- Quản lý cấu hình an toàn, trạng thái connector, phân quyền và thông tin môi trường.
- Không hiển thị bí mật đầy đủ trên UI sau khi lưu.

## 4. Yêu cầu phi chức năng

- Responsive desktop/tablet; tối ưu desktop vì đây là công cụ nội bộ.
- Tất cả giao diện và thông báo hướng tới người dùng bằng tiếng Việt.
- Loading, empty, error, success và confirmation state cho thao tác quan trọng.
- Phân quyền server-side; validation đầu vào; xử lý lỗi thống nhất.
- Không ghi dữ liệu nhạy cảm vào log.
- Hỗ trợ migration và seed.
- Có Swagger/OpenAPI và hướng dẫn chạy local.
- Bảo đảm phân trang server-side cho danh sách lớn.

## 5. Acceptance criteria cốt lõi

- Người dùng chỉ truy cập đúng dữ liệu theo vai trò/phạm vi được cấp.
- CRM CRUD, tìm kiếm, lọc, phân trang hoạt động với PostgreSQL.
- Bàn giao khách tạo lịch sử bất biến và giữ lại lịch sử chăm sóc.
- Dashboard lấy dữ liệu từ API, demo data có nhãn.
- Inbox demo không tạo ấn tượng rằng đã kết nối Zalo thật.
- Capability verification và connection status tách biệt.
- Gửi thật bị chặn nếu capability chưa verified hoặc connector không active.
- Không có mật khẩu Zalo/OTP/cookie trong database, code, logs hoặc UI.
- Lint, type-check, tests và build được chạy; kết quả được báo cáo trung thực.
