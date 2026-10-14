# System Architecture

## 1. Tổng quan

Monorepo gồm frontend Next.js, backend NestJS, PostgreSQL và Prisma. Frontend chỉ gọi API; logic nghiệp vụ, quyền và kiểm tra capability nằm ở backend.

```text
Browser
  └── Next.js Web (apps/web)
        └── REST API /api/v1
              └── NestJS (apps/api)
                    ├── Auth & RBAC
                    ├── CRM / Customers / Assignments / Tasks
                    ├── Inbox / Messages / Attachments
                    ├── Integration Registry & Capability Verification
                    ├── Campaigns / Reports / Audit Logs
                    └── Prisma ORM
                          └── PostgreSQL
```

Connector bên ngoài nằm sau interface nội bộ; giao diện không gọi API nền tảng trực tiếp bằng secret.

## 2. Nguyên tắc thiết kế

- **CRM-first:** CRM và quy trình bàn giao phải hữu ích kể cả khi không có tích hợp Zalo.
- **Adapter pattern:** từng kênh là adapter riêng, capability được khai báo độc lập.
- **Fail closed:** nếu không xác minh được quyền hoặc trạng thái connector thì khóa thao tác thực tế.
- **Demo transparency:** dữ liệu giả lập phải có nguồn và nhãn rõ ràng.
- **Least privilege:** chỉ cấp quyền cần thiết cho vai trò và connector.
- **Auditability:** thao tác nhạy cảm cần được ghi nhận.
- **No credential scraping:** không thu thập mật khẩu, OTP, cookie hay session trái phép.

## 3. Frontend

- Next.js App Router + TypeScript.
- Tailwind CSS + shadcn/ui + Lucide React.
- TanStack Table cho bảng dữ liệu; Recharts cho biểu đồ.
- React Hook Form + Zod cho form phía client.
- Tổ chức route theo module: dashboard, sales, customers, inbox, archive, campaigns, reports, settings.
- Mọi dữ liệu quan trọng lấy từ API; mock data chỉ dùng trong demo/dev và phải được đánh dấu.

## 4. Backend

NestJS modules:
- AuthModule
- UsersModule
- RolesModule
- SalesTeamsModule
- CustomersModule
- CustomerAssignmentsModule
- CustomerActivitiesModule
- TasksModule
- ConversationsModule
- MessagesModule
- AttachmentsModule
- IntegrationsModule
- IntegrationVerificationsModule
- CampaignsModule
- ReportsModule
- AuditLogsModule
- NotificationsModule

Dùng DTO validation, guards, interceptors/filters phù hợp, Swagger và service layer. Controller không chứa toàn bộ nghiệp vụ.

## 5. Dữ liệu và tệp

- PostgreSQL là nguồn dữ liệu chính.
- Prisma migrations là cách thay đổi schema.
- Tệp lưu qua storage adapter; local storage chỉ cho dev. Production nên dùng object storage được cấu hình riêng.
- Lưu metadata, checksum nếu phù hợp, MIME type, kích thước, nguồn, quyền truy cập và thời hạn lưu.
- Không cho tải tệp chỉ dựa vào ID; phải kiểm tra quyền server-side.

## 6. Connector interface gợi ý

```ts
interface MessagingConnector {
  getCapabilities(): Promise<ConnectorCapabilities>;
  checkConnection(): Promise<ConnectionCheckResult>;
  getConversations?(input: ConversationQuery): Promise<ConversationPage>;
  getMessages?(input: MessageQuery): Promise<MessagePage>;
  syncAttachments?(input: AttachmentSyncInput): Promise<SyncResult>;
  sendMessage?(input: SendMessageInput): Promise<SendMessageResult>;
  handleWebhook?(input: unknown): Promise<void>;
}
```

Các phương thức có thể không được hỗ trợ. Không tạo phương thức giả trả về dữ liệu thật. `DemoConnector` được phép cung cấp dữ liệu mẫu. Connector Zalo chỉ hoạt động trong phạm vi API/quyền đã xác minh.

## 7. Gating nghiệp vụ

Backend phải kiểm tra trước mọi thao tác connector:
- capability được xác minh,
- connector đã cấu hình và kiểm tra kết nối thành công,
- tài khoản/kênh có quyền tương ứng,
- người dùng có quyền nghiệp vụ,
- giới hạn gửi và điều kiện nền tảng được đáp ứng.

Frontend có thể hiển thị lý do bị khóa nhưng backend là nơi quyết định cuối cùng.
