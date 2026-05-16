---
title: Architecture
last_updated: 2026-05-16
generated_by: agent
---

## Repository Layout

```text
psits-web-react/
├── client-side/                 # Legacy React + JavaScript frontend
├── client-side-ts/              # Active React + TypeScript frontend
├── docs/                        # Human-facing documentation
├── server-side/                 # Express + TypeScript API
├── .agent/rules/                # Agent guidance docs
├── README.md                    # Project overview and setup notes
└── package-lock.json            # Root npm lockfile for shared tooling
```

## Key Boundaries

| Area | Responsibility |
|---|---|
| `server-side/` | API routes, controllers, middleware, persistence models, mail templates, asset copying, and background jobs |
| `client-side-ts/` | Canonical frontend implementation, route UI, feature modules, reusable UI primitives, and auth state |
| `client-side/` | Legacy frontend kept for migration reference and fallback context |
| `docs/` | Human-readable project documentation |
| `.agent/rules/` | Machine-readable repo guidance for coding agents |

## Frontend Migration Boundary

| Folder | Status | Agent instruction |
|---|---|---|
| `client-side-ts/` | Active | Write new frontend code here |
| `client-side/` | Legacy | Do not add new work here unless the task explicitly targets the legacy app or migration |

## Active Client Structure

| Path | Purpose |
|---|---|
| `client-side-ts/src/App.tsx` | App shell and auth/provider composition |
| `client-side-ts/src/router.tsx` | Route tree definition with nested layouts and route guards |
| `client-side-ts/src/features/` | Feature modules grouped by domain, such as auth, admin, events, orders, and student |
| `client-side-ts/src/layouts/` | Page shells and layout composition |
| `client-side-ts/src/pages/` | Route-level pages |
| `client-side-ts/src/components/` | Shared UI and common components |
| `client-side-ts/src/api/` | Frontend API helpers and backend connection logic |

## Server Structure

| Path | Purpose |
|---|---|
| `server-side/src/index.ts` | Express app setup, middleware registration, route mounting, MongoDB connect, cron scheduling |
| `server-side/src/routes/` | Route modules grouped by domain |
| `server-side/src/controllers/` | Request handlers and application logic |
| `server-side/src/middlewares/` | Authentication and other request middleware |
| `server-side/src/models/` | Mongoose models and interfaces |
| `server-side/src/util/` | Shared server utilities such as errors, JWT, cookies, rate limiting |
| `server-side/src/mail_template/` | Email templates and mail helpers |
| `server-side/src/assets/` | Runtime assets copied into `dist/` during build |

## Path Aliases

| Workspace | Alias | Maps to |
|---|---|---|
| `client-side-ts/` | `@/*` | `./src/*` |

| Workspace | Alias status |
|---|---|
| `server-side/` | Not detected |

## API Topology

| Mounted prefix | Route module | Notes |
|---|---|---|
| `/api` | `server-side/src/routes/index.route.ts`, `students.route.ts`, `private.route.ts` | Legacy auth, student, and protected sample routes |
| `/api/admin` | `admin.route.ts` | Admin dashboards, membership, role, and officer operations |
| `/api/merch` | `merchandise.route.ts` | Merchandise CRUD, publishing, reports, and S3-backed uploads |
| `/api/orders` | `orders.route.ts` | Student and admin order flows, refunds, approvals |
| `/api/cart` | `cart.route.ts` | Student cart operations |
| `/api/logs` | `logs.route.ts` | Admin log inspection |
| `/api/events` | `events.route.ts` | Legacy event management and attendance flows |
| `/api/docs` | `documentation.route.ts` | Documentation content CRUD and status toggles |
| `/api/v2/auth` | `authV2.route.ts` | New auth flow with access and refresh tokens |
| `/api/v2/events` | `eventsV2.route.ts` | New event flow with layered auth middleware |
| `/api/v2/students` | `studentsV2.route.ts` | New student lookup and profile endpoints |

## Routing Pattern

- The server uses Express routers mounted explicitly in `server-side/src/index.ts`; there is no file-based router.
- Route modules group endpoints by domain and import handlers from same-named controller files.
- The active client uses React Router with nested route objects and layout components rather than file-based routing.