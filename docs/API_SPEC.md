# API Specification — Initial Contract

Base path: `/api/v1`. API cụ thể cần được cập nhật cùng Swagger khi triển khai.

## Quy ước chung

- JSON request/response.
- DTO validation ở backend.
- Pagination: `page`, `pageSize`; response có `items`, `page`, `pageSize`, `total`.
- Filter/sort phải dùng allowlist, không ghép SQL thủ công.
- Lỗi dùng định dạng thống nhất, ví dụ `{ "statusCode": 400, "code": "VALIDATION_ERROR", "message": "...", "details": [] }`.
- Endpoint cần xác thực trừ login và health check.

## Nhóm endpoint đề xuất

### Auth
- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`
- `POST /auth/refresh` nếu chọn refresh-token architecture.

### Dashboard & reports
- `GET /dashboard/summary`
- `GET /reports/customers`
- `GET /reports/activities`
- `GET /reports/conversions`

### Users & teams
- `GET /users`
- `POST /users`
- `GET /users/:id`
- `PATCH /users/:id`
- `POST /users/:id/disable`
- `GET /sales-teams`
- `POST /sales-teams`
- `PATCH /sales-teams/:id`

### Customers & assignments
- `GET /customers`
- `POST /customers`
- `GET /customers/:id`
- `PATCH /customers/:id`
- `POST /customers/:id/activities`
- `GET /customers/:id/activities`
- `POST /customers/:id/assignments`
- `GET /customers/:id/assignments`
- `POST /customers/bulk-assign` (chỉ khi có kiểm tra quyền và xác nhận rõ ràng)

### Tasks
- `GET /tasks`
- `POST /tasks`
- `PATCH /tasks/:id`
- `POST /tasks/:id/complete`

### Inbox
- `GET /conversations`
- `GET /conversations/:id`
- `GET /conversations/:id/messages`
- `POST /conversations/:id/messages` — chỉ thực sự gửi nếu capability/connector được phép; demo gửi chỉ cập nhật dữ liệu demo.
- `POST /conversations/:id/read-state` nếu connector hỗ trợ.

### Attachments / archive
- `GET /attachments`
- `GET /attachments/:id`
- `GET /attachments/:id/download` — phải kiểm tra quyền ở server.

### Integrations
- `GET /integrations`
- `POST /integrations` — chỉ tạo cấu hình không nhạy cảm hoặc tham chiếu secret đã lưu an toàn.
- `GET /integrations/:id`
- `POST /integrations/:id/check-connection`
- `GET /integrations/:id/capabilities`
- `PATCH /integrations/:id/capabilities/:capability/verification`
- `POST /integrations/:id/capabilities/:capability/test`

### Campaigns
- `GET /campaigns`
- `POST /campaigns`
- `GET /campaigns/:id`
- `POST /campaigns/:id/preview`
- `POST /campaigns/:id/dry-run`
- `POST /campaigns/:id/confirm-send` — backend phải chặn nếu chưa đáp ứng gating.
- `POST /campaigns/:id/cancel` nếu connector hỗ trợ.

### Audit & notifications
- `GET /audit-logs`
- `GET /notifications`
- `POST /notifications/:id/read`

## Quy tắc API nhạy cảm

- Bàn giao khách: ghi audit log và lịch sử phân công trong cùng transaction.
- Gửi tin: cần idempotency/deduplication, xác nhận rõ ràng và kiểm tra giới hạn.
- Cập nhật verification: chỉ vai trò được phép; `VERIFIED` yêu cầu bằng chứng và ghi rõ người xác minh.
- Không trả secret/token đầy đủ về frontend.
- API docs phải mô tả role/capability cần thiết cho mỗi endpoint.
