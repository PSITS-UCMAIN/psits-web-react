# Linting Report — 2026-05-16

Generated: 2026-05-16T18:55:08+08:00

## Summary
Performed a repo-wide lint/build pass for client-side-ts and server-side, applied targeted fixes, and re-ran checks.

## Commands run
- client-side-ts: `npm run lint`, `npm run build`
- server-side: `npm run build` (no lint script detected)

## Results
| Workspace | Check | Status | Notes |
|---|---|---|---|
| client-side-ts | npm run lint | Pass (warnings) | react-refresh warnings remain (non-blocking) |
| client-side-ts | npm run build | Pass | Full build succeeded (dist/ created) |
| server-side | lint | Not detected | No ESLint config/script found |
| server-side | npm run build | Pass | TypeScript build succeeded after fixes |

## Key pre-fix failures (representative)
- client: ProtectedRoute accessed refs during render; missing/incorrect imports (backendConnection alias); type-only import errors (verbatimModuleSyntax).
- server: Missing export for Attendee model; Student document fields used incorrectly (used `name`/`studentId` instead of `first_name`/`last_name`/`id_number`); missing middleware wrappers; missing dev types (zod, puppeteer); puppeteer typing mismatch.

## Fixes applied
- Exported `Attendee` model in `server-side/src/models/attendee.model.ts`.
- Replaced usages of `student.name`/`student.studentId` with `(student as any).first_name + ' ' + (student as any).last_name` and `(student as any).id_number` where needed to match schema.
- Added `verifyStudent.middleware.ts` and `verifyAdmin.middleware.ts` as thin wrappers around existing auth middlewares.
- Updated client imports to use correct backend API module and used `import type` for type-only imports to satisfy verbatimModuleSyntax.
- Fixed ProtectedRoute to avoid accessing refs during render (replaced with state/effect pattern) and addressed setState-in-effect warning.
- Installed server dev dependencies and resolved puppeteer `waitUntil` typing by narrowing with a cast.

## Files changed (high level)
- server-side/src/models/attendee.model.ts
- server-side/src/controllers/certificate.controller.ts
- server-side/src/controllers/eligibleCertificate.controller.ts
- server-side/src/middlewares/verifyStudent.middleware.ts
- server-side/src/middlewares/verifyAdmin.middleware.ts
- server-side/src/mail_template/utils/generate-pdf-from-ejs.ts
- client-side-ts/src/features/certificates/api/certificateApi.ts
- client-side-ts/src/components/common/ProtectedRoute.tsx
- client-side-ts/src/features/certificates/components/*

## Validation performed
- Ran `npm run lint` and `npm run build` in `client-side-ts` — lint passed with warnings; build succeeded.
- Ran `npm run build` in `server-side` — build succeeded.

## Recommendations / Next steps
1. Add ESLint config and lint script for `server-side`.
2. Address react-refresh warnings by splitting non-component exports into separate files.
3. Replace temporary `(student as any)` casts by strengthening TypeScript interfaces or updating Mongoose model typings.
4. Run unit/integration tests and CI verification.

## Contact
If further fixes or automatic PR patches are desired, request which workspace to prioritize.
