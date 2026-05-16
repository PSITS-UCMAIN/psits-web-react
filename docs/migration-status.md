---
title: Migration Status
last_updated: 2026-05-16
generated_by: agent
---

## Current State

The repository is in an active migration from the legacy JavaScript frontend in `client-side/` to the TypeScript frontend in `client-side-ts/`. New frontend work should go into `client-side-ts/` only.

## Already Migrated in `client-side-ts/`

| Area               | Examples                                                                                                                                                                                                                                       |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth               | `src/features/auth/`, `src/pages/auth/Login.tsx`, `src/pages/auth/ForgotPassword.tsx`, `src/pages/auth/OtpCode.tsx`, `src/pages/auth/SetNewPassword.tsx`                                                                                       |
| Admin UI           | `src/pages/admin/EventManagement.tsx`, `src/pages/admin/EventsPage.tsx`, `src/pages/admin/EventStatisticsPage.tsx`, `src/pages/admin/EventRafflePage.tsx`, `src/pages/admin/GeneralAdminPage.tsx`, `src/pages/admin/MainCampusFinancePage.tsx` |
| Student UI         | `src/pages/student/AccountSettings.tsx`, `src/pages/student/EventAttendance.tsx`, `src/pages/student/MyOrders.tsx`                                                                                                                             |
| Public pages       | `src/pages/events/`, `src/pages/organizations/`, `src/pages/resources/`, `src/pages/PrivacyPolicy.tsx`, `src/pages/TermsOfCondition.tsx`, `src/pages/UnderConstruction.tsx`                                                                    |
| Layout and routing | `src/layouts/`, `src/router.tsx`, `src/App.tsx`                                                                                                                                                                                                |
| Shared UI          | `src/components/ui/`, `src/components/common/`                                                                                                                                                                                                 |

## Still Present in Legacy `client-side/`

| Area               | Examples                                                                                                                                                                                                             |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Root app shell     | `src/App.jsx`, `src/main.jsx`                                                                                                                                                                                        |
| Legacy API helpers | `src/api/*.js`                                                                                                                                                                                                       |
| Legacy auth        | `src/authentication/`                                                                                                                                                                                                |
| Legacy pages       | `src/pages/Home.jsx`, `src/pages/Explore.jsx`, `src/pages/Community.jsx`, `src/pages/Events.jsx`, `src/pages/Faculty.jsx`, `src/pages/Settings.jsx`, `src/pages/admin/*`, `src/pages/docs/*`, `src/pages/students/*` |
| Legacy components  | `src/components/*`                                                                                                                                                                                                   |
| Legacy context     | `src/contexts/DarkModeContext.jsx`                                                                                                                                                                                   |
| Legacy mock data   | `src/@fakedb/`                                                                                                                                                                                                       |

## Migration Conventions Observed

| Convention    | Observed direction                                                                                    |
| ------------- | ----------------------------------------------------------------------------------------------------- |
| Language      | Legacy JavaScript is being replaced by TypeScript in the active client                                |
| Structure     | The active client uses feature folders, layout components, and route-level pages                      |
| Auth state    | The active client centralizes auth in `features/auth` instead of scattered login helpers              |
| Routing       | The active client uses React Router 7 nested route objects instead of the legacy route component tree |
| UI primitives | The active client uses a reusable `components/ui` layer                                               |

## Notes

- The legacy app still contains working page routes and API helpers, so it should be treated as live migration context rather than dead code.
- Some functionality in the active client is marked as under construction, which indicates the migration is not complete.
