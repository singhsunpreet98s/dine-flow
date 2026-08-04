# DineFlow

Restaurant management system with real-time order tracking across Dine-in, Takeaway, Zomato, Swiggy, and custom channels.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend API | .NET Core, SignalR, FluentValidation |
| Backend tests | xUnit |
| Frontend | React TypeScript, Redux Toolkit, RTK Query |
| UI | Shadcn/ui + Tailwind CSS |
| Frontend tests | Jest + React Testing Library |
| E2E | Playwright (`automation/` folder) |
| Database | SQL Server + Entity Framework Core |

## Project Structure

```
Dineflow/
├── backend/
│   ├── DineFlow.sln
│   ├── DineFlow.API/             # Controllers, SignalR hubs, middleware
│   ├── DineFlow.Application/     # MediatR commands/queries, DTOs, validators
│   ├── DineFlow.Domain/          # Entities, value objects, domain events
│   ├── DineFlow.Infrastructure/  # EF Core, repositories, external integrations
│   └── DineFlow.Tests/           # xUnit unit + integration tests
├── frontend/
│   ├── src/
│   │   ├── app/                  # Redux store, SignalR singleton, RTK Query base
│   │   ├── components/           # Shadcn wrappers + shared UI
│   │   ├── features/             # Feature slices (orders, menu, tables, kitchen, admin, auth)
│   │   ├── hooks/                # Custom hooks (useOrderTimer, useSignalR, etc.)
│   │   ├── pages/                # Route-level components per role
│   │   └── types/                # Shared TS interfaces and enums
│   ├── package.json
│   └── tsconfig.json
└── automation/                   # Playwright E2E tests
    └── package.json
```

## Key Commands

```bash
# Backend
cd backend && dotnet build
cd backend && dotnet test
cd backend && dotnet run --project DineFlow.API

# Frontend
cd frontend && npm install
cd frontend && npm run dev
cd frontend && npm run typecheck    # tsc --noEmit
cd frontend && npm run lint         # eslint src/
cd frontend && npm test             # jest

# E2E
cd automation && npx playwright test
```

## Order Lifecycle

```
Placed → SentToKitchen → Preparing → Prepared → Served → Billed → Paid → Closed
                                ↕
                      OutOfStock  (exception — auto-notifies waiter + manager)
```

Status transitions are enforced in the `Order` aggregate root — no bypassing via direct DB update.

## Audit Trail (Non-Negotiable)

Every order status change and every payment action must write an `AuditLog` record:

| Field | Required |
|-------|---------|
| `EntityId` | ✓ |
| `EntityType` | ✓ |
| `Action` | ✓ |
| `FromStatus` | on status change |
| `ToStatus` | on status change |
| `PaymentMode` | on payment |
| `PerformedBy` (staff id) | ✓ |
| `Timestamp` | ✓ |

Implement via EF Core interceptor or domain event handler — must be impossible to skip.

## Modules

**Admin** — Menu management (categories, items, variants, combos, pricing, photos, availability), inventory, user/role/shift management, table & floor setup, discounts/coupons, reports & analytics, audit log viewer, settings (GST, operating hours, receipt template).

**Manager / Counter** — Order dashboard (color-coded by channel), manual order creation, bill generation, mark-as-paid (logs mode + staff), cancel/void with reason, table status overview, day-close/cash reconciliation, print/reprint bill.

**Waiter** — Floor plan (color-coded table status), book/reserve table, take order with notes ("no onion"), send to kitchen (generates KOT), add items to running order, merge/transfer tables, mark items served, mark as paid.

**Kitchen** — Live order queue (oldest first, real-time push), elapsed timer per order card (red when delayed), status flow `New → Preparing → OutOfStock → Prepared`, optional station filters (grill/dessert/bar).

## Timezone

- **Database**: all timestamps stored as UTC (`DateTime` / `DateTimeOffset`). No local-time values in the DB, ever.
- **Per-user preference**: `AppUser.TimeZoneId` stores an IANA timezone string (e.g. `"Asia/Kolkata"`, `"UTC"`). Default is `"UTC"`.
- **Auth response**: `AuthResponse` includes `TimeZoneId` so the frontend receives it at login/register.
- **Frontend utility**: `src/lib/timezone.ts` exports `formatInTz(utcIso, tzId)` and `formatDateInTz(utcIso, tzId)` — use these for every displayed timestamp.
- **Elapsed timers** (`useOrderTimer`) compute a *duration* (minutes since placed) — no timezone conversion needed.
- **Settings**: users change their timezone via `PATCH /api/auth/me/timezone` → the returned `AuthResponse` token + `timeZoneId` are dispatched into `authSlice` via `setCredentials`.
- **Never** use `new Date().toLocaleString()` without an explicit `timeZone` option — always pass the user's `timeZoneId`.

## Real-Time (SignalR)

- Hub: `OrderHub` — clients join role-based groups: `"kitchen"`, `"manager"`, `"waiter-{tableId}"`
- Events: `OrderPlaced`, `OrderStatusChanged`, `KOTGenerated`, `ItemOutOfStock`, `ItemReady`
- Clients update via `updateQueryData` — no refetch polling
- Offline resilience: queue orders locally on network drop, sync on reconnect

## Order Channels

`DineIn` | `Takeaway` | `Zomato` | `Swiggy` | `Other`

Channel is a display property only — all channels share the same order lifecycle code path.

## Backend Conventions

- Architecture: Controller → Service → Repository (no CQRS)
- Controllers are thin — business logic lives in services
- FluentValidation on every service method input — called in the service, not the controller
- `Result<T>` return type everywhere — no exceptions propagating to controllers
- All entities have `CreatedAt`, `CreatedBy`, `UpdatedAt`, `UpdatedBy`
- Soft deletes only (`IsDeleted` flag) — never `DELETE FROM`
- EF config in `IEntityTypeConfiguration<T>` classes, not `OnModelCreating`

## Frontend Conventions

- Feature-based folder structure under `src/features/`
- RTK Query for all server state — no raw fetch/axios in components
- Redux slices for UI state only; server state lives in RTK Query cache
- Named exports only — no default exports from component files
- No `any` type — use `unknown` + type guards at API boundaries
- Enums defined in `src/types/`: `OrderStatus`, `OrderChannel`, `TableStatus`, `PaymentMode`, `UserRole`

## Forms

- **react-hook-form** + **yup** + **@hookform/resolvers** for all forms — no raw `useState` for field values
- Yup schemas colocated in `src/features/<feature>/schemas.ts` (e.g. `authSchemas.ts`, `menuSchemas.ts`)
- Shared reusable form wrapper: `src/components/shared/FormField.tsx` — Label + children + error message
- Shared toggle: `src/components/shared/ToggleSwitch.tsx`
- Shadcn `Input` supports `{...register('field')}` spread directly; Shadcn `Select` requires `<Controller>`
- API errors written to `setError('root', { message })` — rendered as `{errors.root?.message}`
- Shared form component `src/features/admin/components/CreateUserForm.tsx` used by AdminPage and UsersPage
- Dynamic non-input state (item pickers, file uploads) stays as `useState` alongside the RHF form

## Git Branch Naming

All branches must follow this convention — never commit directly to `main`:

| Type | Pattern | Example |
|------|---------|---------|
| New feature | `feature/<short-description>` | `feature/kitchen-station-filters` |
| Bug fix | `bugfix/<short-description>` | `bugfix/table-status-not-updating` |
| Hotfix (production) | `hotfix/<short-description>` | `hotfix/order-total-calculation` |
| Chore / refactor | `chore/<short-description>` | `chore/migrate-forms-to-rhf` |

Rules:
- Use kebab-case only — no spaces, no underscores, no capital letters
- Description must be meaningful — `feature/fix` or `bugfix/bug1` are not acceptable
- Branch off `main` unless told otherwise

## Testing Strategy

- **xUnit**: pure unit tests for domain logic; integration tests hit a real test SQL Server (no mocked EF)
- **Jest**: reducer unit tests; RTL for critical UI flows; mock SignalR via `jest.mock('@microsoft/signalr')`
- **Playwright**: happy-path E2E per role, key exception flows (out-of-stock, cancel, offline sync)

## Custom Agents (Invoke via Agent tool)

| Agent | When to use |
|-------|------------|
| `backend` | .NET Core API, SignalR, EF Core, FluentValidation, xUnit |
| `frontend` | React components, Redux, RTK Query, Shadcn, Jest |
| `code-reviewer` | DineFlow-specific code review with audit trail and real-time checks |
| `orchestrator` | Any cross-cutting feature (new tile, new page, new alert) — decomposes into backend + frontend tasks and delegates to specialists in parallel |
