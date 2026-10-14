# Instructions for AI Coding Agents

## 1. Source of truth

Before implementing or changing code, read:
- `README.md`
- `docs/MRD.md`
- `docs/PRD.md`
- `docs/ARCHITECTURE.md`
- `docs/STRUCTURE.md`
- `docs/DATA_MODEL.md`
- `docs/API_SPEC.md`
- `docs/INTEGRATIONS_ZALO.md`
- `docs/SECURITY.md`
- `docs/UI_UX.md`
- `docs/TESTING.md`
- `docs/ROADMAP.md`

If instructions conflict, prioritize security and legal constraints first, then PRD acceptance criteria, then architecture. If the repository already has a valid implementation, inspect it before replacing files or changing conventions.

## 2. Product goal

Build a Vietnamese-language SaaS-style CRM for managing customers and sales workflows across a team of sales employees. The application may show a multi-account inbox UI, but must clearly distinguish demo/simulated data from data obtained through a verified integration.

## 3. Required stack

- Monorepo with `pnpm` workspaces.
- Frontend: Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui, Lucide React.
- Backend: NestJS, TypeScript, Prisma ORM, PostgreSQL.
- API prefix: `/api/v1`.
- Validation: DTO validation on the server; Zod and React Hook Form on the client where useful.
- API documentation: Swagger/OpenAPI.
- Local development: Docker Compose for PostgreSQL; `.env.example` with placeholders only.

Do not silently swap the stack. If the repository already uses a different stack, explain the discrepancy before making a major migration.

## 4. Implementation rules

- First inspect the repository, package manager, existing code, and available environment.
- Implement in small, testable increments.
- Keep UI responsive and Vietnamese-first.
- Use reusable components and typed DTOs.
- Keep frontend and backend responsibilities separate.
- Use database migrations; do not rely on manual database edits.
- Add seed data that is visibly labelled as demo data.
- Add loading, empty, error, and success states to screens and forms.
- Never hard-code production secrets, API tokens, passwords, or real customer data.
- Never claim a feature is integrated if it is a mock, stub, or unverified connector.
- Do not build browser automation or unauthorized session scraping for personal Zalo accounts.
- Do not implement real bulk sending until a connector and permission path are verified and an explicit confirmation step is in place.
- Do not promise recovery of deleted messages.
- Keep audit logs for sensitive administrative actions and customer reassignment.
- Avoid destructive commands and overwriting existing user work without inspecting it first.

## 5. Integration gating

Every integration capability must be represented independently:
- `READ_CHATS`
- `SYNC_MESSAGES_FILES`
- `BULK_SEND`

Each capability has a verification status and evidence/notes. The account connection status is a separate field. A feature is available only if:
1. The capability is verified,
2. The connector is configured and tested,
3. Required permissions are present,
4. The current account connection is healthy.

If any condition is missing, show a clear unavailable/needs-verification state and provide demo mode where appropriate. Never treat a user-entered URL alone as proof of verification.

## 6. Code quality

- Use meaningful names and avoid giant components.
- Handle errors centrally and return safe, consistent API errors.
- Validate and authorize requests on the server, not only in the UI.
- Enforce tenant/team and role boundaries on every relevant endpoint.
- Add tests for business-critical logic.
- Run lint, type-check, unit tests, and build where the environment allows.
- If a command cannot run, report exactly why; do not say it passed.
- Update docs when routes, models, capabilities, or implementation decisions change.

## 7. Completion report

At the end of each implementation phase, report:
1. What was implemented,
2. Files created/changed,
3. Commands and tests run, with pass/fail status,
4. What remains incomplete,
5. Any decisions requiring user approval,
6. Any Zalo capability still awaiting official/legal verification.

Do not report a task as complete solely because the UI renders.
