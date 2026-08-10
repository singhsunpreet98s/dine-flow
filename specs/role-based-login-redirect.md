# Role-Based Login Redirect

## 1. Overview

After a successful login, the application redirects all roles to the same path logic
that is currently inconsistent: Admins land on `/admin` (a settings/management page)
instead of `/dashboard`, and the Kitchen role is sent to `/kitchen` while Waiters go
to `/dashboard` rather than the more task-relevant `/orders` page.

This specification fixes the post-login redirect so every role lands on the page that
is most useful at the start of their shift.

## 2. Goals

- Redirect Admin and Manager to `/dashboard` after login.
- Redirect Waiter to `/orders` after login.
- Redirect Kitchen to `/kitchen` after login.
- Apply the same role-home mapping consistently in `ProtectedRoute` (the fallback used
  when an unauthorised role tries to access a protected page).

## 3. Scope

### In Scope

- `getPostLoginPath` function in `frontend/src/pages/LoginPage.tsx`.
- `getRoleHomePath` function in `frontend/src/components/shared/ProtectedRoute.tsx`.
- Unit / integration tests covering both functions and the resulting navigation.

### Out of Scope

- Adding new pages or routes.
- Changing role-level route guards (`allowedRoles` on any route).
- Backend changes.
- The "redirect back to original page after login" behaviour (unauthenticated deep-link
  flow) — that is a separate feature and is currently not implemented in `LoginPage`.

## 4. User Stories

- As an **Admin**, I want to land on the Dashboard after logging in, so I can see the
  day's overview before managing settings.
- As a **Manager**, I want to land on the Dashboard after logging in, so I can monitor
  orders and tables immediately.
- As a **Waiter**, I want to land on the Orders page after logging in, so I can start
  taking orders without extra navigation.
- As a **Kitchen** staff member, I want to land on the Kitchen queue after logging in,
  so I can see incoming tickets immediately.

## 5. Functional Requirements

### FR-001: Admin post-login destination

After a successful login where `role === UserRole.Admin` **and** `isSetupComplete === true`,
the application must navigate to `/dashboard`.

### FR-002: Admin first-run destination (unchanged)

After a successful login where `role === UserRole.Admin` **and** `isSetupComplete === false`,
the application must navigate to `/setup` (no change from current behaviour).

### FR-003: Manager post-login destination

After a successful login where `role === UserRole.Manager`, the application must navigate
to `/dashboard`.

### FR-004: Waiter post-login destination

After a successful login where `role === UserRole.Waiter`, the application must navigate
to `/orders`.

### FR-005: Kitchen post-login destination

After a successful login where `role === UserRole.Kitchen`, the application must navigate
to `/kitchen`.

### FR-006: ProtectedRoute fallback alignment

The `getRoleHomePath` utility used in `ProtectedRoute` (called when an unauthorised role
hits a protected route) must return the same destinations as `getPostLoginPath`:

| Role    | Path         |
|---------|--------------|
| Admin   | `/dashboard` |
| Manager | `/dashboard` |
| Waiter  | `/orders`    |
| Kitchen | `/kitchen`   |

This ensures the "wrong role → redirect to your home" behaviour is consistent with the
post-login redirect.

## 6. Business Rules

- The redirect is determined solely by `role` (and `isSetupComplete` for Admin).
- If `role` is `null` or an unrecognised value, fall back to `/dashboard`.
- No role may be redirected to a route their `allowedRoles` guard would reject. The
  table above has been verified against the existing route guards in `App.tsx`.

> **Note — Kitchen and `/orders`:** The `/orders` route currently restricts access to
> `[Admin, Manager, Waiter]`. add orders page for kitchen role too make changes in Be for this if required

## 7. User Flow

1. User opens `/login`.
2. User enters credentials and submits.
3. `authApi.login` succeeds; `AuthResponse` (including `role` and `isSetupComplete`)
   is dispatched via `setCredentials`.
4. `getPostLoginPath(role, isSetupComplete)` determines the destination.
5. `navigate(destination, { replace: true })` is called.
6. User lands on the correct role-home page without seeing a flash of the wrong page.

If a user with an existing session tries to access a route not permitted for their role:

1. `ProtectedRoute` detects the role mismatch.
2. `getRoleHomePath(role)` is called.
3. User is redirected to their role-home page.

## 8. UI Requirements

- No new UI components required.
- No visual changes to any page.
- The redirect is transparent to the user — they simply arrive on the correct page.

## 9. API Requirements

No API changes required. The `AuthResponse` already includes `role` and
`isSetupComplete`.

## 10. Data Model

No data model changes required.

## 11. Authorization

No changes to route-level `allowedRoles` guards. The new redirect destinations are all
within routes the respective roles are already permitted to access.

| Role    | Redirected to | Route `allowedRoles` includes role? |
|---------|---------------|--------------------------------------|
| Admin   | `/dashboard`  | ✅ Yes (`Admin, Manager, Waiter`)    |
| Manager | `/dashboard`  | ✅ Yes (`Admin, Manager, Waiter`)    |
| Waiter  | `/orders`     | ✅ Yes (`Admin, Manager, Waiter, Kitchen`)    |
| Kitchen | `/orders`    | ✅ Yes (`Kitchen, Admin`)            |

## 12. Validation Rules

Not applicable — this feature performs navigation only; no form input or data
validation is involved.

## 13. Error Handling

- If `getPostLoginPath` receives an unexpected `role` value, it must return `/dashboard`
  as a safe default (current behaviour for the fallback branch is preserved).
- Network or auth errors during login are handled by existing RTK Query error handling
  in `LoginPage` and are out of scope for this change.

## 14. Non-Functional Requirements

- **Performance**: The redirect must happen synchronously in the `.then` / success
  callback of the login mutation — no extra network round-trip.
- **Consistency**: Both `getPostLoginPath` (LoginPage) and `getRoleHomePath`
  (ProtectedRoute) must produce identical results for the same role.
- **Testability**: Both functions should be pure (input → output) so they can be unit-
  tested without rendering.

## 15. Testing Requirements

### Frontend — Jest

| Test subject | Test description | Location |
|---|---|---|
| `getPostLoginPath` | Returns `/dashboard` for Admin when setup complete | `src/__tests__/pages/LoginPage.test.tsx` |
| `getPostLoginPath` | Returns `/setup` for Admin when setup incomplete | `src/__tests__/pages/LoginPage.test.tsx` |
| `getPostLoginPath` | Returns `/dashboard` for Manager | `src/__tests__/pages/LoginPage.test.tsx` |
| `getPostLoginPath` | Returns `/orders` for Waiter | `src/__tests__/pages/LoginPage.test.tsx` |
| `getPostLoginPath` | Returns `/kitchen` for Kitchen | `src/__tests__/pages/LoginPage.test.tsx` |
| `getRoleHomePath` | Returns `/dashboard` for Admin | `src/__tests__/components/shared/ProtectedRoute.test.tsx` |
| `getRoleHomePath` | Returns `/dashboard` for Manager | `src/__tests__/components/shared/ProtectedRoute.test.tsx` |
| `getRoleHomePath` | Returns `/orders` for Waiter | `src/__tests__/components/shared/ProtectedRoute.test.tsx` |
| `getRoleHomePath` | Returns `/orders` for Kitchen | `src/__tests__/components/shared/ProtectedRoute.test.tsx` |
| `LoginPage` integration | Successful Admin login navigates to `/dashboard` | `src/__tests__/pages/LoginPage.test.tsx` |
| `LoginPage` integration | Successful Waiter login navigates to `/orders` | `src/__tests__/pages/LoginPage.test.tsx` |
| `ProtectedRoute` | Kitchen user visiting `/orders` is redirected to `/orders` | `src/__tests__/components/shared/ProtectedRoute.test.tsx` |

Do not create the tests — document only.

## 16. Dependencies

- `frontend/src/types/enums.ts` — `UserRole` enum (existing, unchanged).
- `frontend/src/features/auth/authSlice.ts` — `role` field in auth state (existing, unchanged).
- `frontend/src/features/auth/authApi.ts` — `AuthResponse` shape (existing, unchanged).
- `react-router-dom` `useNavigate` — already used in `LoginPage`.

## 17. Acceptance Criteria

### AC-001 — Admin redirected to Dashboard

**Given** a user with role `Admin` and `isSetupComplete = true` exists  
**When** they submit valid credentials on the Login page  
**Then** they are navigated to `/dashboard`

---

### AC-002 — Admin first-run redirected to Setup

**Given** a user with role `Admin` and `isSetupComplete = false` exists  
**When** they submit valid credentials on the Login page  
**Then** they are navigated to `/setup`

---

### AC-003 — Manager redirected to Dashboard

**Given** a user with role `Manager` exists  
**When** they submit valid credentials on the Login page  
**Then** they are navigated to `/dashboard`

---

### AC-004 — Waiter redirected to Orders

**Given** a user with role `Waiter` exists  
**When** they submit valid credentials on the Login page  
**Then** they are navigated to `/orders`

---

### AC-005 — Kitchen redirected to orders 

**Given** a user with role `Kitchen` exists  
**When** they submit valid credentials on the Login page  
**Then** they are navigated to `/orders`

---

### AC-006 — ProtectedRoute fallback for Admin

**Given** an authenticated user with role `Admin` is in session  
**When** they navigate to a route not in their `allowedRoles` (e.g. `/kitchen`)  
**Then** `ProtectedRoute` redirects them to `/dashboard`

---

### AC-007 — ProtectedRoute fallback for Waiter

**Given** an authenticated user with role `Waiter` is in session  
**When** they navigate to a route not in their `allowedRoles` (e.g. `/admin/users`)  
**Then** `ProtectedRoute` redirects them to `/orders`

---

### AC-008 — ProtectedRoute fallback for Kitchen

**Given** an authenticated user with role `Kitchen` is in session  
**When** they navigate to a route not in their `allowedRoles` (e.g. `/orders`)  
**Then** `ProtectedRoute` redirects them to `/orders`

---

## 18. Implementation Notes

### Files to change (two files only)

**`frontend/src/pages/LoginPage.tsx`**

Replace the `getPostLoginPath` function with:

```ts
function getPostLoginPath(role: UserRole, isSetupComplete: boolean): string {
  if (role === UserRole.Admin && !isSetupComplete) return '/setup'
  if (role === UserRole.Waiter)  return '/orders'
  if (role === UserRole.Kitchen) return '/orders'
  return '/dashboard'          // Admin (setup complete) + Manager
}
```

**`frontend/src/components/shared/ProtectedRoute.tsx`**

Replace the `getRoleHomePath` function with:

```ts
function getRoleHomePath(role: UserRole): string {
  if (role === UserRole.Waiter)  return '/orders'
  if (role === UserRole.Kitchen) return '/orders'
  return '/dashboard'          // Admin + Manager
}
```

### Export helper for testability (optional but recommended)

To keep the functions unit-testable without rendering the full component, consider
exporting them as named exports from their respective files:

```ts
// LoginPage.tsx
export function getPostLoginPath(...) { ... }

// ProtectedRoute.tsx
export function getRoleHomePath(...) { ... }
```

### No route guard changes needed

The `/orders` route is already accessible to `Waiter` (and Admin, Manager). Redirecting
Waiter to `/orders` will succeed without any `allowedRoles` change.

## 19. Open Questions

**Q1 — Should Kitchen staff see `/kitchen` or `/orders` after login?**

The user request stated "if kitchen then orders page", but `/orders` is currently
restricted to `[Admin, Manager, Waiter]` — Kitchen staff are not in that list and would
immediately be redirected away by `ProtectedRoute`. This spec therefore redirects Kitchen
to `/kitchen` (their dedicated page) and flags this as an open question.

**Resolution options:**
- (A) Keep Kitchen → `/kitchen` (recommended — no route guard changes needed).
- (B) Add `Kitchen` to `/orders` allowedRoles AND redirect Kitchen → `/orders`.

Confirm the intended behaviour before implementation.
use option (b) Add `Kitchen` to `/orders` allowedRoles AND redirect Kitchen → `/orders`.

## 20. Definition of Done

The feature is considered complete when:

- [ ] `getPostLoginPath` in `LoginPage.tsx` produces the correct path for all four roles.
- [ ] `getRoleHomePath` in `ProtectedRoute.tsx` produces the correct path for all four roles.
- [ ] Both functions are consistent with each other (same role → same path).
- [ ] All acceptance criteria (AC-001 through AC-008) pass.
- [ ] Unit tests for both helper functions are implemented and passing.
- [ ] Integration / RTL tests for login navigation are implemented and passing.
- [ ] No existing tests are broken.
- [ ] No new TypeScript errors (`npm run typecheck` passes).
- [ ] No new lint errors (`npm run lint` passes).
