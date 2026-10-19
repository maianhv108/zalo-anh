# Proposed Repository Structure

```text
sales-zalo-management/
├── AGENTS.md
├── README.md
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── .env.example
├── .gitignore
├── docker-compose.yml
├── apps/
│   ├── web/
│   │   ├── app/
│   │   │   ├── (auth)/login/
│   │   │   ├── (dashboard)/layout.tsx
│   │   │   ├── (dashboard)/dashboard/
│   │   │   ├── (dashboard)/sales/
│   │   │   ├── (dashboard)/customers/
│   │   │   ├── (dashboard)/inbox/
│   │   │   ├── (dashboard)/archive/
│   │   │   ├── (dashboard)/campaigns/
│   │   │   ├── (dashboard)/reports/
│   │   │   ├── (dashboard)/settings/
│   │   │   ├── layout.tsx
│   │   │   └── globals.css
│   │   ├── components/
│   │   │   ├── ui/
│   │   │   ├── layout/
│   │   │   ├── dashboard/
│   │   │   ├── customers/
│   │   │   ├── inbox/
│   │   │   └── integrations/
│   │   ├── features/
│   │   ├── lib/
│   │   ├── hooks/
│   │   └── tests/
│   └── api/
│       ├── src/
│       │   ├── main.ts
│       │   ├── app.module.ts
│       │   ├── common/
│       │   ├── auth/
│       │   ├── users/
│       │   ├── sales-teams/
│       │   ├── customers/
│       │   ├── customer-assignments/
│       │   ├── customer-activities/
│       │   ├── tasks/
│       │   ├── conversations/
│       │   ├── messages/
│       │   ├── attachments/
│       │   ├── integrations/
│       │   ├── integration-verifications/
│       │   ├── campaigns/
│       │   ├── reports/
│       │   ├── audit-logs/
│       │   └── notifications/
│       ├── prisma/
│       │   ├── schema.prisma
│       │   ├── migrations/
│       │   └── seed.ts
│       └── test/
├── packages/
│   └── shared/
│       └── src/
│           ├── types/
│           ├── constants/
│           └── schemas/
├── infra/
│   ├── docker/
│   └── scripts/
└── docs/
    ├── MRD.md
    ├── PRD.md
    ├── ARCHITECTURE.md
    ├── STRUCTURE.md
    ├── DATA_MODEL.md
    ├── API_SPEC.md
    ├── INTEGRATIONS_ZALO.md
    ├── SECURITY.md
    ├── UI_UX.md
    ├── TESTING.md
    └── ROADMAP.md
```

## Lưu ý

Đây là cấu trúc đề xuất, không phải yêu cầu tạo tất cả thư mục rỗng ngay lập tức. AI cần kiểm tra repository hiện tại trước; nếu đã có cấu trúc tương đương thì giữ lại và cập nhật tài liệu cho khớp.
