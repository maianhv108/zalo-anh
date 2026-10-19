# UI/UX Guidelines

## 1. Phong cách

- SaaS CRM hiện đại, rõ ràng, ít rối.
- Sidebar xanh navy; vùng nội dung nền sáng; màu nhấn vàng hoặc xanh dương dùng có tiết chế.
- Tiếng Việt là ngôn ngữ chính.
- Desktop-first nhưng responsive cho tablet và mobile.
- Dùng spacing nhất quán, typography dễ đọc, icon Lucide React.
- Tránh lạm dụng gradient, badge màu sặc sỡ và biểu đồ trang trí không có ý nghĩa.

## 2. Điều hướng

Sidebar:
1. Tổng quan
2. Nhân viên Sale
3. Khách hàng
4. Hội thoại
5. Kho lưu trữ
6. Chiến dịch gửi tin
7. Báo cáo
8. Nhật ký hoạt động
9. Cài đặt hệ thống

## 3. Màn hình quan trọng

### Dashboard
- KPI cards, biểu đồ trạng thái khách, hoạt động theo thời gian, danh sách việc cần chú ý.
- Nhãn demo nếu dùng dữ liệu seed.

### Customers
- Bảng có search, filter, sorting, pagination, chọn hàng và hành động theo quyền.
- Hiển thị trạng thái và Sale phụ trách rõ ràng.
- Hạn chế cột quá rộng; thông tin phụ nằm trong trang chi tiết.

### Customer detail
- Header tên khách + trạng thái + Sale phụ trách.
- Tabs: Tổng quan, Lịch sử chăm sóc, Hội thoại, Ghi chú, Tệp, Tác vụ, Lịch sử phân công.

### Inbox
- Cột trái: bộ lọc/tài khoản Sale.
- Cột giữa: danh sách hội thoại.
- Vùng chính: nội dung hội thoại.
- Panel phải: thông tin khách và tác vụ.
- Nhãn demo/thật phải dễ nhận ra; không chỉ dựa vào màu.

### Integration settings per Sale
- Ba thẻ capability riêng: Đọc hội thoại, Đồng bộ tin nhắn/tệp, Gửi hàng loạt.
- Mỗi thẻ có trạng thái, phương thức, bằng chứng, phạm vi, ghi chú, người xác minh và ngày xác minh.
- Trạng thái kết nối là phần riêng, không gộp với capability.
- Nếu chưa xác minh, nêu rõ lý do và khóa thao tác liên quan.

### Campaigns
- Wizard: nội dung → đối tượng → preview → dry-run → xác nhận.
- Hiển thị số người nhận dự kiến, cảnh báo quyền và tình trạng connector.
- Không có nút gửi thật khả dụng khi chưa đáp ứng điều kiện.

## 4. Trạng thái giao diện bắt buộc

Mỗi trang dữ liệu có:
- Loading/skeleton.
- Empty state có hướng dẫn.
- Error state có nút thử lại phù hợp.
- Success feedback.
- Validation tại trường và thông báo lỗi dễ hiểu.
- Confirmation dialog cho thao tác khó hoàn tác.

## 5. Accessibility

- Có label cho form control.
- Điều hướng bàn phím và focus state rõ.
- Không truyền đạt trạng thái chỉ bằng màu.
- Bảng và modal có tiêu đề/nhãn dễ hiểu.
