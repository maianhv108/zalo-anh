# MRD — Market Requirements Document

## 1. Mục đích

Xây dựng hệ thống hỗ trợ doanh nghiệp quản lý khách hàng và quy trình chăm sóc của nhiều nhân viên Sale trong một giao diện thống nhất. Hệ thống giúp quản lý nắm được dữ liệu khách hàng, lịch sử chăm sóc, việc bàn giao và hiệu quả công việc; đồng thời tạo nền tảng để đánh giá khả năng tích hợp các kênh Zalo theo phương thức được cho phép.

## 2. Vấn đề kinh doanh

- Thông tin khách hàng và lịch sử chăm sóc có thể bị phân tán ở từng nhân viên.
- Khi Sale nghỉ việc hoặc bàn giao, quản lý cần quy trình chuyển khách rõ ràng và có nhật ký.
- Quản lý cần theo dõi tình trạng chăm sóc, khách đang chờ phản hồi và công việc tiếp theo.
- Doanh nghiệp cần phân biệt dữ liệu CRM nội bộ, dữ liệu demo và dữ liệu thực sự lấy được từ một kênh tích hợp.
- Nhu cầu gom hội thoại hoặc gửi tin từ tài khoản Zalo cá nhân có rủi ro về tính khả thi, quyền truy cập, điều khoản dịch vụ và quyền riêng tư; phải xác minh trước khi cam kết.

## 3. Nhóm người dùng

- **Admin:** cấu hình hệ thống, người dùng, quyền, tích hợp và nhật ký.
- **Manager:** xem đội nhóm, phân công khách, bàn giao, theo dõi báo cáo.
- **Sale:** quản lý khách được giao, cập nhật trạng thái, ghi chú và lịch chăm sóc.
- **Người kiểm thử/demo:** dùng dữ liệu mẫu để đánh giá giao diện mà không tác động tài khoản thật.

## 4. Mục tiêu

- Tập trung dữ liệu khách hàng và lịch sử hoạt động trong CRM.
- Giảm thất lạc thông tin khi chuyển giao khách.
- Cho phép tìm kiếm, lọc và phân công khách nhanh.
- Cung cấp dashboard có nguồn dữ liệu rõ ràng.
- Có trang xác minh riêng cho từng khả năng tích hợp.
- Không trình bày tính năng Zalo chưa được xác minh như thể đã hoạt động.

## 5. Ngoài phạm vi giai đoạn đầu

- Cam kết đọc mọi hội thoại từ tài khoản Zalo cá nhân.
- Tự động đăng nhập Zalo bằng mật khẩu/OTP/cookie hoặc scrape phiên đăng nhập.
- Khôi phục tin nhắn đã xóa mà không có cơ chế được hỗ trợ.
- Gửi hàng loạt thực tế khi chưa xác minh quyền, connector, giới hạn và chính sách chống spam.
- Thay thế hoàn toàn hệ thống CRM/CSKH doanh nghiệp hiện có.

## 6. Giả định và rủi ro

- Có thể phát triển CRM nội bộ độc lập với tích hợp Zalo.
- Zalo OA và Zalo cá nhân là hai phạm vi khác nhau; không được suy ra quyền truy cập tài khoản cá nhân từ API OA.
- Dữ liệu khách hàng và tệp đính kèm cần có căn cứ thu thập, mục đích sử dụng, phân quyền và thời hạn lưu giữ phù hợp.
- Tích hợp thực tế phụ thuộc tài liệu chính thức, quyền được cấp, điều khoản nền tảng và kiểm thử.

## 7. Chỉ số đánh giá đề xuất

- Tỷ lệ khách có Sale phụ trách.
- Số khách chưa có hoạt động chăm sóc trong khoảng thời gian quy định.
- Số lượt bàn giao có đủ lý do và người nhận.
- Tỷ lệ tác vụ chăm sóc được hoàn thành đúng hạn.
- Số lỗi phân quyền được phát hiện trong kiểm thử.
- Số khả năng tích hợp đã xác minh bằng bằng chứng và thử nghiệm, không chỉ bằng khai báo thủ công.
