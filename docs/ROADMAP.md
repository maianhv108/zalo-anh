# Implementation Roadmap

## Phase 0 — Repository inspection
- Kiểm tra code hiện có, package manager, môi trường và các tài liệu.
- Xác nhận các quyết định quan trọng trước khi phá vỡ cấu trúc đang có.
- Cập nhật tài liệu nếu repository khác bản đề xuất.

## Phase 1 — Workspace foundation
- Tạo pnpm workspace, Next.js, NestJS, shared package.
- Thiết lập lint, format, type-check, env validation.
- Docker Compose cho PostgreSQL.
- README chạy local.

## Phase 2 — Database, auth and RBAC
- Prisma schema và migration.
- Auth, user, role/permission, seed demo.
- Guard/authorization tests.

## Phase 3 — CRM core
- Dashboard summary API.
- Users/Sales Teams.
- Customers, activities, tasks.
- Customer assignment/handover + audit log.
- Frontend tables, forms, detail pages.

## Phase 4 — Demo inbox and archive
- Conversation/message/attachment models.
- Demo connector.
- Multi-panel inbox UI.
- Archive/search/download with authorization.

## Phase 5 — Integration verification
- IntegrationConnection and IntegrationCapabilityVerification.
- UI cài đặt theo từng Sale.
- Capability gating ở backend.
- Adapter interface và connection health checks.
- Chỉ thêm connector thực tế khi có tài liệu/quyền được xác minh.

## Phase 6 — Campaigns and reporting
- Campaign editor, preview, dry-run.
- Gating và audit logs.
- Reports/filters/export permission.

## Phase 7 — QA and handover
- Unit/integration/e2e tests.
- Lint, type-check, build.
- Kiểm tra responsive và trạng thái lỗi.
- Hoàn thiện README, API docs và báo cáo phần chưa hoàn thành.

## Ưu tiên

Nếu thời gian hoặc môi trường hạn chế, ưu tiên CRM, RBAC, bàn giao khách, demo inbox, capability verification và tài liệu rõ ràng trước tích hợp Zalo cá nhân.
