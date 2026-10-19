# Data Model — Khái niệm dữ liệu

Đây là mô hình logic ban đầu; cần được tinh chỉnh khi triển khai Prisma schema.

## 1. Thực thể chính

- **User:** tài khoản đăng nhập, tên, email, trạng thái.
- **Role / Permission:** vai trò và quyền; có thể dùng enum cho giai đoạn đầu hoặc bảng riêng khi cần linh hoạt.
- **SalesTeam:** nhóm Sale.
- **TeamMember:** quan hệ User–SalesTeam nếu một người có thể thuộc nhiều nhóm.
- **Customer:** hồ sơ khách hàng.
- **CustomerAssignment:** lịch sử phân công/bàn giao khách.
- **CustomerActivity:** hoạt động chăm sóc, ghi chú hoặc sự kiện liên quan.
- **Task:** việc cần làm, người phụ trách, hạn hoàn thành, trạng thái.
- **IntegrationConnection:** cấu hình kết nối/kênh và trạng thái kết nối; bí mật chỉ lưu dưới dạng an toàn ở secret manager hoặc biến môi trường, không lưu credential cá nhân Zalo.
- **IntegrationCapabilityVerification:** trạng thái xác minh từng capability, bằng chứng tham chiếu, phạm vi, người xác minh và thời điểm.
- **Conversation:** hội thoại thuộc khách và nguồn/kênh.
- **Message:** tin nhắn, thời gian, loại nội dung, nguồn, trạng thái demo/thật.
- **Attachment:** metadata tệp và vị trí lưu; có kiểm soát quyền.
- **Campaign:** chiến dịch, nội dung, trạng thái, người tạo.
- **CampaignRecipient:** người nhận, kết quả, lỗi và thời điểm.
- **AuditLog:** người thực hiện, hành động, đối tượng, thời điểm và metadata an toàn.
- **Notification:** thông báo trong ứng dụng.

## 2. Trường gợi ý

### Customer
`id`, `fullName`, `phone` (nullable), `email` (nullable), `source`, `status`, `ownerId`, `tags`, `createdAt`, `updatedAt`, `lastContactedAt`, `nextFollowUpAt`, `deletedAt` (nếu dùng soft delete).

### CustomerAssignment
`id`, `customerId`, `fromUserId`, `toUserId`, `changedByUserId`, `reason`, `createdAt`.

### Conversation
`id`, `customerId`, `integrationConnectionId` (nullable), `channelType`, `externalConversationId` (nullable), `title`, `status`, `isDemo`, `lastMessageAt`.

### Message
`id`, `conversationId`, `externalMessageId` (nullable), `direction`, `contentType`, `textContent` (nullable), `sentAt`, `sourceType`, `isDemo`, `deliveryStatus` (nullable).

### IntegrationCapabilityVerification
`id`, `integrationConnectionId` hoặc `salesUserId`, `capability`, `status`, `method`, `evidenceUrl` (nullable), `evidenceReference` (nullable), `scopeNotes`, `verificationNotes`, `verifiedByUserId` (nullable), `verifiedAt` (nullable), `testResult` (nullable), `createdAt`, `updatedAt`.

### IntegrationConnection
`id`, `ownerUserId` (nullable), `provider`, `accountLabel`, `connectionStatus`, `lastCheckedAt`, `lastErrorCode` (nullable), `isDemo`.

## 3. Quan hệ và ràng buộc

- Customer có nhiều CustomerAssignment, CustomerActivity, Task và Conversation.
- Conversation có nhiều Message; Message có thể có nhiều Attachment.
- Campaign có nhiều CampaignRecipient.
- Mỗi capability verification phải unique theo đối tượng kết nối + capability + phiên bản/trạng thái phù hợp với quyết định thiết kế.
- Dùng foreign key và index cho các trường tìm kiếm/lọc thường xuyên.
- Dùng transaction khi bàn giao khách và ghi audit log để không xảy ra trạng thái nửa chừng.
- Cân nhắc soft delete và chính sách lưu trữ trước khi xóa dữ liệu khách.
- Không lưu nội dung tin nhắn/tệp nếu chưa có cơ sở thu thập và quyền truy cập phù hợp.
