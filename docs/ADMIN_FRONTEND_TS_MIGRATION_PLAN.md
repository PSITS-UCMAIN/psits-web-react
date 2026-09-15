# Admin Frontend TypeScript Migration and Redesign Plan

> **Status: Completed** — The legacy JavaScript app in `client-side/` has been
> removed from the repository. `client-side-ts/` is the sole frontend. This
> document is retained for historical reference only.

## Purpose

Migrate the remaining admin frontend from the legacy JavaScript app in `client-side/` into the active TypeScript app in `client-side-ts/`, while preserving the existing admin behavior and applying the new redesign that will be provided.

Admin is the first priority because the student side is already mostly done. Events are treated as already migrated and should only be touched for navigation/sidebar consistency or bugs discovered during integration.

## Instructions and References Followed

- `AGENTS.md`
  - Prefer `client-side-ts/` for frontend work.
  - Preserve existing behavior unless redesign requires UI changes.
  - Keep changes scoped, type-safe, and consistent with existing patterns.
  - Avoid `any`.
  - Validate with `npm run lint` and `npm run build` in `client-side-ts/`.
- `.agents/skills/frontend-feature/SKILL.md`
  - Inspect existing frontend architecture before editing.
  - Use `client-side-ts/FILE_STRUCTURE_GUIDE.md` for file placement.
  - Before creating new files, check the actual folder structure flow already present in this system and follow it.
  - Keep pages thin and place feature logic inside `src/features/`.
  - Keep data fetching, UI state, types, and components cleanly separated.
- `.agents/skills/plan-enhancer/SKILL.md`
  - List assumptions, unclear areas, risks, and clarification questions before implementation.
- `.agents/skills/backend-feature/SKILL.md`
  - Backend changes are out of scope unless an admin feature cannot work without a missing or broken API contract.
- `.agents/skills/git-committer/SKILL.md`
  - No commits should be made without explicit approval.
- `client-side-ts/FILE_STRUCTURE_GUIDE.md`
  - Routed admin pages go in `client-side-ts/src/pages/admin/`.
  - Admin business logic, components, hooks, types, and API helpers go under `client-side-ts/src/features/admin/`.

## Current State Summary

- Legacy admin routes and behavior live in `client-side/src/App.jsx`.
- Legacy admin layout and sidebar logic live in `client-side/src/components/layout/AdminLayout.jsx`.
- Active TypeScript app routes live in `client-side-ts/src/router.tsx`.
- Active TypeScript admin shell lives in:
  - `client-side-ts/src/layouts/AdminLayout.tsx`
  - `client-side-ts/src/features/admin/components/AdminSidebar.tsx`
- Events are already implemented in TypeScript through:
  - `client-side-ts/src/pages/admin/EventsPage.tsx`
  - `client-side-ts/src/pages/admin/EventManagement.tsx`
  - `client-side-ts/src/pages/admin/EventStatisticsPage.tsx`
  - `client-side-ts/src/pages/admin/EventRafflePage.tsx`
  - `client-side-ts/src/features/admin/event-management/`
  - `client-side-ts/src/features/admin/event-statistics/`
  - `client-side-ts/src/features/admin/event-raffle/`
- `client-side-ts/src/pages/admin/Dashboard.tsx` is currently only a placeholder.
- Several admin sidebar links in `client-side-ts/src/features/admin/components/AdminSidebar.tsx` currently route to `admin/under-construction`.
- A typed admin API file already exists at `client-side-ts/src/features/admin/api/admin.ts`, but some types are still local to that file and should be split only when useful.

## Assumptions

- The legacy `client-side/` behavior is the source of truth for admin workflows.
- The new design will be supplied later as screenshots, Figma, images, or another visual reference.
- The redesign should change layout and visuals, not backend API behavior.
- Admin route names can be modernized in TypeScript if navigation remains clear and redirects are added when needed.
- `Organization` is the new name for the legacy `Officers/Members` admin area.
- `Refund`, `Promo Dashboard`, `Inventory`, and standalone `Resources` are not part of this admin-first scope unless the user adds them later.

## Missing or Unclear Areas

- The final admin design has not been provided yet.
- Need confirmation whether `Organization` should include every legacy officer-related subtab:
  - Admin Account
  - Members
  - Suspended
  - Members Request
  - Admin Request
- Need confirmation whether old admin URLs such as `/admin/officers` should redirect to `/admin/organization`.
- Need confirmation whether `Students` should include only visible legacy tabs or all related legacy pages:
  - All Members
  - Request
  - Deleted
  - Renewal
  - History
- Need confirmation whether logs/settings/documentation should stay UC-Main only or follow the current access helpers exactly.

## Risks and Edge Cases

- The legacy JS app uses dependencies that are not all present in `client-side-ts`, such as `react-data-table-component`, `react-csv`, `react-to-print`, and Chart.js. Prefer existing TS dependencies such as shadcn/ui tables and `recharts` before adding new packages.
- Legacy components mix UI, filtering, API calls, modals, and permissions in large files. Migrate behavior incrementally instead of copying large files directly.
- React Router differs between the apps: legacy uses `react-router-dom` v6 with `<Routes>`, while TS uses `createBrowserRouter` and route objects.
- Some legacy API functions return inconsistent shapes. The TS migration must type actual response shapes carefully and handle empty, false, or void responses.
- Access control exists at multiple levels: route guards, campus guards, and per-action helpers. Losing any of these can expose actions to the wrong admin role.
- New design could conflict with existing table density, modals, or mobile behavior; each feature needs responsive verification.

## Clarification Questions Before Implementation

1. Please send the admin redesign reference before UI implementation begins.
2. Should `Organization` fully replace the old `Officers` naming in routes and UI?
3. Should `Students` include Renewal and History even though the current legacy tab list only shows All Members, Request, and Deleted?
4. Are `Refund`, `Promo Dashboard`, `Inventory`, and `Resources` intentionally excluded from this admin migration phase?
5. Should old legacy admin URLs redirect to the new TypeScript routes?

## Migration Principles

- First inspect the matching legacy JS files in `client-side/`.
- Record the existing behavior before converting anything.
- Convert behavior to TypeScript with real types and no `any`.
- Apply the new design after behavior is understood.
- Before creating any new file, inspect the current `client-side-ts` folder flow in this system and place the file where the existing structure indicates it belongs.
- Keep `client-side-ts` pages thin; place feature logic in `src/features/admin/`.
- Reuse existing TS UI primitives from `src/components/ui/`.
- Reuse existing auth, campus, toast, and API patterns.
- Keep Events unchanged except for sidebar, route, or shared layout integration.
- Avoid new dependencies unless existing TS dependencies cannot reasonably support the required behavior.

## Target Admin Routes

| Feature | Target TS Route | Legacy Source |
| --- | --- | --- |
| Dashboard | `/admin/dashboard` | `client-side/src/pages/admin/AdminDashboard.jsx` |
| Organization | `/admin/organization` | `client-side/src/pages/admin/Officers.jsx`, `client-side/src/pages/admin/officers/` |
| Students | `/admin/students` | `client-side/src/pages/admin/Students.jsx`, `client-side/src/pages/admin/membership/`, membership pages |
| Events | `/admin/events` | Already migrated in `client-side-ts` |
| Merchandise | `/admin/merchandise` | `client-side/src/pages/admin/Merchandise.jsx`, `Product.jsx`, `EditProduct.jsx` |
| Orders | `/admin/orders` | `client-side/src/pages/admin/Orders.jsx` |
| Reports | `/admin/reports` | `client-side/src/pages/admin/Reports.jsx` |
| Settings | `/admin/settings` | `client-side/src/pages/admin/Settings.jsx` |
| Documentation | `/admin/documentation` | `client-side/src/pages/admin/documentation/` |
| Logs | `/admin/logs` | `client-side/src/pages/admin/Logs.jsx` |

## Proposed File Organization

Use this structure as the default. Adjust only if the existing TS code suggests a cleaner nearby pattern.

Before creating a file from this proposed structure, inspect the real folders and nearby files in `client-side-ts/` first. Follow the existing folder flow, naming style, barrel exports, and feature boundaries already used in this system. If the proposed structure and the actual system flow disagree, prefer the actual system flow and document the reason in the implementation notes.

```txt
client-side-ts/src/pages/admin/
  Dashboard.tsx
  Organization.tsx
  Students.tsx
  Merchandise.tsx
  Orders.tsx
  Reports.tsx
  Settings.tsx
  Documentation.tsx
  Logs.tsx

client-side-ts/src/features/admin/
  api/
    admin.ts
    documentation.ts
  dashboard/
    components/
    hooks/
    types/
  organization/
    components/
    hooks/
    types/
  students/
    components/
    hooks/
    types/
  merchandise/
    components/
    hooks/
    types/
  orders/
    components/
    hooks/
    types/
  reports/
    components/
    hooks/
    types/
  settings/
    components/
    hooks/
    types/
  documentation/
    components/
    hooks/
    types/
  logs/
    components/
    hooks/
    types/
```

## Phase 0: Design and Behavior Audit

- Receive the new admin design reference.
- Extract reusable design decisions:
  - layout density
  - sidebar state
  - table style
  - card style
  - empty/loading/error states
  - modal/dialog style
  - action button hierarchy
  - filter/search patterns
  - mobile behavior
- Audit each legacy JS feature before implementation:
  - route paths
  - API calls
  - state variables
  - filters and search
  - modals and confirmations
  - role/campus permissions
  - loading/error/success states
  - side effects such as printing, CSV export, reloads, polling, or intervals
- Create a small checklist per feature before coding it.

## Phase 1: Admin Shell, Routes, Shared Patterns

- Update `client-side-ts/src/router.tsx` with target admin routes.
- Update `client-side-ts/src/features/admin/components/AdminSidebar.tsx` so required tabs point to real routes.
- Add active route styling instead of hardcoding Events as active.
- Preserve campus and admin guard behavior from the current TS app.
- Add redirects from old route names if confirmed.
- Create shared admin UI helpers only when repeated by at least two features:
  - page header
  - search/filter toolbar
  - data table wrapper
  - status badge
  - confirm dialog pattern
  - empty/loading/error state

## Phase 2: Dashboard

Legacy files to inspect first:

- `client-side/src/pages/admin/AdminDashboard.jsx`
- `client-side/src/pages/admin/dashboard/BarGraph.jsx`
- `client-side/src/pages/admin/dashboard/DashboardCard.jsx`
- `client-side/src/pages/admin/dashboard/DoughnutChart.jsx`
- `client-side/src/pages/admin/dashboard/PieChart.jsx`
- `client-side/src/pages/admin/dashboard/OrderTable.jsx`
- `client-side/src/api/admin.js`

Behavior to preserve:

- Fetch student, merchandise, order, and active membership counts.
- Fetch pending order counts with page, limit, sort, and search support.
- Show loading and error states.
- Display dashboard cards and charts.
- Keep the pending orders table behavior.

Implementation notes:

- Replace Chart.js usage with `recharts` if it can represent the same data cleanly.
- Keep count animation only if it fits the new design and does not cause repeated API calls.
- Use typed responses from `features/admin/api/admin.ts`.

***AFTER IMPLEMENTATION***
Findings (After implementation)
High: dashboard can still show 0 after silent refresh or legacy-token expiry.
The legacy token is only created during login in auth.api.ts (line 52), but AuthProvider can restore a user through V2 refresh in AuthContext.tsx (line 29) without recreating sessionStorage.Token. Since admin APIs still read only sessionStorage.Token in admin.ts (line 229), opening a new tab or staying logged in past the old 4h token can make admin data fail again.

High/Medium: Dashboard route access and sidebar access disagree.
The sidebar disables Dashboard for non-UC Main admins in AdminSidebar.tsx (line 152), but the route is open to all admins in router.tsx (line 100). A non-UC Main admin could manually visit /admin/dashboard. If Dashboard is supposed to be UC-Main-only, this needs a route guard too.

Medium: Daily Revenue fetches all paid orders on every dashboard load.
useDashboardData.ts (line 145) fetches every paid-order page so the frontend can calculate revenue. It works now, but as orders grow this can slow the dashboard and spam backend logs. Better long-term: backend endpoint for revenue by date range.

Low: course chart only displays BSIT and BSCS.
dashboard.types.ts (line 16) only allows BSIT | BSCS, while the data calculation includes ACT. If ACT students exist, the chart percentages can look incomplete because ACT is counted in the total but not shown.

## Phase 3: Organization

Legacy files to inspect first:

- `client-side/src/pages/admin/Officers.jsx`
- `client-side/src/pages/admin/officers/AllOfficers.jsx`
- `client-side/src/pages/admin/officers/Members.jsx`
- `client-side/src/pages/admin/officers/Suspend.jsx`
- `client-side/src/pages/admin/officers/Request.jsx`
- `client-side/src/pages/admin/officers/AdminAccountRequest.jsx`
- `client-side/src/pages/admin/AddOfficer.jsx`
- `client-side/src/pages/admin/EditOfficer.jsx`
- `client-side/src/api/admin.js`
- `client-side/src/components/tools/clientTools.js`

Behavior to preserve:

- Organization subtabs for admin accounts, members, suspended users, member role requests, and admin account requests.
- Role/access gating currently handled by `executiveAndAdminConditionalAccess`.
- Fetch, search, edit, suspend, restore, remove role, approve, and decline actions.
- Add officer flow.
- Change password action where currently available.
- Confirmation modal behavior and toast feedback.

Implementation notes:

- Rename user-facing label to `Organization`.
- Keep data and actions typed around officer/member/admin request models.
- Use route child tabs or local tab state depending on final design.

***AFTER IMPLEMENTATION***
Findings

High: Organization is still route-accessible to non-UC Main admins. The sidebar blocks the link at client-side-ts/src/features/admin/components/AdminSidebar.tsx:186, but the real route at client-side-ts/src/router.tsx:102 has no AdminCampusRouteGuard. A user can manually visit /admin/organization. This matters more because backend read routes like server-side/src/routes/admin.route.ts:107, :156, and :162 only require admin_authenticate.

High: Organization depends on the legacy sessionStorage.Token. The admin API reads from sessionStorage at client-side-ts/src/features/admin/api/admin.ts:230, while the token is only synced during login at client-side-ts/src/features/auth/api/auth.api.ts:28 and :52. If the user restores a session, opens a new tab, or the legacy token expires while the V2 auth still works, Organization can fail or show empty data.

Medium: API fetch failures can look like “no records” instead of an error. In useOrganizationData.ts:189, failed API helpers become result || [], and several helpers catch errors without throwing, like admin.ts:595, :607, :631, :733, and :808. For deployment, this can hide backend/auth problems.

Medium: Rapid tab switching can show stale data. fetchAccounts in useOrganizationData.ts:173 has no cancellation or stale-response guard. If a slow Members request returns after switching to Admin Request, it can overwrite the current tab’s data.

Medium: Bulk actions can partially succeed but leave the UI stale. runAction uses Promise.all at useOrganizationData.ts:409, then only refetches if every result succeeds at :425. If 3 approvals work and 1 fails, the successful rows may still remain until refresh.

Low/Medium: The last sortable column is misleading in request tabs. The header changes to Requested By or Status at OrganizationView.tsx:251, but sorting still uses campus at :298. Clicking that column will not sort the visible value.

Low: Add Account actually creates an admin request, not an active account. That is from status: "Request" in useOrganizationData.ts:352. Functionally okay if intended, but the button label may confuse admins.

Low: Bulk request actions only support Approve. Row-level Deny exists, but selected rows default to approve at OrganizationView.tsx:1279. If admins expect bulk deny, it is missing.

## Phase 4: Students

Legacy files to inspect first:

- `client-side/src/pages/admin/Students.jsx`
- `client-side/src/pages/admin/membership/AllMembers.jsx`
- `client-side/src/pages/admin/membership/EditMember.jsx`
- `client-side/src/pages/admin/membership/StudentMembershipHistory.jsx`
- `client-side/src/pages/admin/MembershipRequest.jsx`
- `client-side/src/pages/admin/Renewal.jsx`
- `client-side/src/pages/admin/Delete.jsx`
- `client-side/src/pages/admin/MembershipHistory.jsx`
- `client-side/src/api/admin.js`
- `client-side/src/api/students.js`
- `client-side/src/utils/editStudentData.js`

Behavior to preserve:

- Student counts from `getCountStudent`.
- All members list.
- Membership request approval and cancellation.
- Deleted student list and restore/delete behavior.
- Student edit modal.
- Membership status/history modal and print behavior if kept in scope.
- Current polling behavior should be reviewed and replaced with safer refresh behavior if possible.

Implementation notes:

- Confirm whether Renewal and History are in scope for the first TS Students page.
- Avoid a 3-second polling loop unless the user explicitly wants live counts.
- Keep membership status data shaped exactly as backend expects.

***AFTER IMPLEMENTATION***
Findings
High: Students route is not campus-guarded.
client-side-ts/src/router.tsx:104 exposes /admin/students to any authenticated admin. The UI blocks actions for non-UC Main admins in StudentsView.tsx:1342, but data still loads. If Students is UC-Main-only, add an AdminCampusRouteGuard.

High: failed mutations can be treated as success.
client-side-ts/src/features/admin/students/hooks/useStudentsData.ts:376 treats undefined as success. But helpers like cancelMembership, studentDeletion, studentRestore, and approveMembership return undefined on catch. A failed deny/delete/restore/approve can close the modal and refresh as if it worked.

High/Medium: Students depends on legacy sessionStorage.Token.
client-side-ts/src/features/admin/api/admin.ts:240 reads only sessionStorage.getItem("Token"). New tabs or restored V2 sessions may not have that token, causing empty data or unauthorized requests.

Medium: API errors can become empty tables.
getDashboardActiveStudents() catches errors and returns [] at client-side-ts/src/features/admin/api/admin.ts:287. The hook then renders an empty table instead of showing an error. Same risk exists for requests/deleted endpoints that swallow errors.

Medium: hidden selected rows can still be bulk-mutated.
Selection is based on all loaded students at useStudentsData.ts:258, not the filtered visible list. If you select rows, then search/filter, hidden selected rows can still be deleted/restored/approved from the bulk bar.

Medium: edit-student failures have weak UI feedback.
updateStudent() throws after console.error at client-side-ts/src/features/admin/api/admin.ts:927, while saveStudent() has no catch around it at useStudentsData.ts:292. Failed edits may show only console output instead of a clean toast.

Medium: Membership History print is not real receipt printing.
StudentsView.tsx:1076 uses window.print(), so it prints the whole page/modal, unlike the legacy receipt-specific print flow. If receipt reprint is required, this is incomplete.

Medium/Low: membership approval confirmation can show wrong fee if price fetch fails.
Default fee is 50 at useStudentsData.ts:139. If membershipPrice() fails, the confirmation/payment payload may show/send 50 even if backend settings differ.

Low: date filter may be off by timezone.
formatDateKey() uses toISOString() at useStudentsData.ts:121, which converts to UTC. For dates near midnight, Applied on filtering can shift by one day.

Low: reference code generation can theoretically collide.
createReferenceCode() uses random 9-digit numbers at useStudentsData.ts:124. Backend has unique reference codes, so rare collisions can fail approval.
## Phase 5: Merchandise

Legacy files to inspect first:

- `client-side/src/pages/admin/Merchandise.jsx`
- `client-side/src/pages/admin/Product.jsx`
- `client-side/src/pages/admin/EditProduct.jsx`
- `client-side/src/pages/admin/MerchandiseHistory.jsx`
- `client-side/src/pages/admin/MerchandiseOrders.jsx`
- `client-side/src/pages/students/merchandise/FilterOptions.jsx`
- `client-side/src/api/admin.js`

Behavior to preserve:

- Fetch merchandise with `merchandiseAdmin`.
- Search by ID, name, category, price, batch, and control.
- Filter by category, control, size, variation, and design-specific filters.
- Compute product status from start date, end date, and `is_active`.
- Add product.
- Edit product.
- View product.
- Publish product.
- Delete product.
- Multi-row selection if still needed.

Implementation notes:

- Use typed merchandise models and normalize legacy field names such as `name`, `imageUrl`, `batch`, `control`, `start_date`, and `end_date`.
- Keep upload/FormData behavior compatible with the backend.
- Use existing TS order merchandise APIs only if the admin-specific behavior matches; otherwise extend admin API.

## Phase 6: Orders

Legacy files to inspect first:

- `client-side/src/pages/admin/Orders.jsx`
- `client-side/src/components/admin/AddOrderModal.jsx`
- `client-side/src/components/admin/ApproveModal.jsx`
- `client-side/src/components/common/Receipt.jsx`
- `client-side/src/api/orders.js`
- `client-side/src/api/refund.api.js`

Behavior to preserve:

- Pending and Paid tabs.
- Fetch paginated pending and paid orders.
- Search with debounce.
- Add manual order.
- Approve order.
- Cancel order.
- Refund paid order where available.
- Print receipt.
- Display tab totals and pagination.

Implementation notes:

- `client-side-ts/src/features/orders/api/orders.ts` already exists but may need pagination parameters restored to match legacy admin behavior.
- Avoid adding `react-to-print` unless necessary; consider browser print or a lightweight in-app receipt flow if the redesign allows it.
- Keep finance/admin-only actions behind equivalent access checks.

## Phase 7: Reports

Legacy files to inspect first:

- `client-side/src/pages/admin/Reports.jsx`
- `client-side/src/api/admin.js`
- `client-side/src/utils/normalize.js`
- `client-side/src/components/tools/clientTools.js`

Behavior to preserve:

- Membership report tab.
- Merchandise report tab.
- Filters for ID, name, RFID, type, course, year, date range, product name, batch, size, and color.
- CSV export.
- Sales calculations.
- Delete merchandise report item.
- Admin action logging when currently used.
- Finance/admin access gating.

Implementation notes:

- Prefer native table/download logic or existing TS dependencies before adding `react-csv` or `react-data-table-component`.
- Keep filtering logic in a hook or utility, not directly inside a huge page component.
- Verify date formatting and comparison behavior with Philippine timezone expectations.

## Phase 8: Settings

Legacy files to inspect first:

- `client-side/src/pages/admin/Settings.jsx`
- `client-side/src/api/admin.js`
- `client-side/src/authentication/Authentication.js`
- `client-side/src/components/tools/clientTools.js`

Behavior to preserve:

- Fetch officers/admin users.
- Edit individual admin access.
- Reload if the current user's own access changes.
- Change membership price.
- Revoke/reset student memberships.
- Preserve access labels:
  - none
  - standard
  - finance
  - executive
  - admin

Implementation notes:

- Use a strongly typed access-level union.
- Keep dangerous actions behind confirmation dialogs.
- Validate price input before sending it.

## Phase 9: Documentation

Legacy files to inspect first:

- `client-side/src/pages/admin/documentation/DocumentationManagement.jsx`
- `client-side/src/pages/admin/documentation/AddEndpointModal.jsx`
- `client-side/src/pages/admin/documentation/EditEndpointModal.jsx`
- `client-side/src/pages/admin/documentation/DeleteEndpointModal.jsx`
- `client-side/src/pages/admin/documentation/ViewEndpointModal.jsx`
- `client-side/src/pages/admin/documentation/AddFeatureModal.jsx`
- `client-side/src/pages/admin/documentation/EditFeatureModal.jsx`
- `client-side/src/pages/admin/documentation/DeleteFeatureModal.jsx`
- `client-side/src/pages/admin/documentation/ViewFeatureModal.jsx`
- `client-side/src/api/documentation.js`
- `client-side-ts/src/features/auth/api/documentation.ts`

Behavior to preserve:

- Fetch API endpoints and features.
- Transform endpoint and feature response data.
- Add, edit, view, and delete endpoints.
- Add, edit, view, and delete features.
- Search and category/method/status filtering where currently present.
- Toast success and error feedback.

Implementation notes:

- Move documentation admin API to `client-side-ts/src/features/admin/api/documentation.ts` if it is admin-only.
- Keep modal forms typed with endpoint and feature request/response types.
- Consider splitting large modal forms into smaller field groups if the redesign supports it.

## Phase 10: Logs

Legacy files to inspect first:

- `client-side/src/pages/admin/Logs.jsx`
- `client-side/src/api/admin.js`

Behavior to preserve:

- Fetch admin logs from `/api/logs`.
- Show timestamp, admin, action, target, and target model.
- Format timestamps using `Asia/Manila`.
- Show loading state.

Implementation notes:

- Add table sorting/filtering only if included in the redesign.
- Keep log records read-only.

## Phase 11: Integration and Validation

For every migrated feature:

- Compare against the legacy JS behavior before marking done.
- Confirm route access through the TS admin sidebar.
- Verify loading, empty, error, and success states.
- Verify modals and destructive confirmations.
- Verify mobile/sidebar behavior.
- Run:

```bash
npm run lint
npm run build
```

from `client-side-ts/`.

Manual test routes:

- `/admin/dashboard`
- `/admin/organization`
- `/admin/students`
- `/admin/events`
- `/admin/merchandise`
- `/admin/orders`
- `/admin/reports`
- `/admin/settings`
- `/admin/documentation`
- `/admin/logs`

## Tracking Checklist

- [ ] Receive and review admin redesign reference.
- [ ] Audit legacy admin files feature by feature.
- [ ] Update admin routes and sidebar.
- [ ] Migrate Dashboard.
- [ ] Migrate Organization.
- [ ] Migrate Students.
- [ ] Preserve Events and verify existing TS implementation still works.
- [ ] Migrate Merchandise.
- [ ] Migrate Orders.
- [ ] Migrate Reports.
- [ ] Migrate Settings.
- [ ] Migrate Documentation.
- [ ] Migrate Logs.
- [ ] Run lint/build.
- [ ] Perform manual route verification.
- [ ] Confirm parity with legacy admin behavior.

## Definition of Done

- All required admin tabs exist in `client-side-ts`.
- Events remain functional and unchanged unless integration requires minor updates.
- Legacy behavior is preserved for all migrated admin workflows.
- New design is applied consistently across admin screens.
- TypeScript build passes without `any`-based shortcuts.
- Lint passes or any remaining lint issue is documented with a reason.
- Admin permissions, campus restrictions, and destructive confirmations still work.
- No unrelated student-side or backend changes are included unless explicitly approved.
