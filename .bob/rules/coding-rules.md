---
title: Coding Rules
last_updated: 2026-05-16
generated_by: agent
---

## Naming Conventions

| Code element | Observed convention | Examples |
|---|---|---|
| Server route files | Lowercase with dot suffix | `admin.route.ts`, `authV2.route.ts`, `studentsV2.route.ts` |
| Server controller files | Lowercase with dot suffix | `authV2.controller.ts`, `eventV2.controller.ts` |
| React page components | PascalCase filenames and exports | `Login.tsx`, `EventManagement.tsx`, `PrivacyPolicy.tsx` |
| Feature folders | lowercase domain folders | `features/auth`, `features/admin`, `features/events` |
| Feature barrels | `index.ts` | `client-side-ts/src/features/auth/index.ts` |
| Utility files | camelCase or dot-suffixed helper names | `backendApi.ts`, `errors.util.ts` |

## Import Style

| Observation | Rule for agents |
|---|---|
| External packages usually appear before local imports | Keep the same grouping when editing a file |
| `@/` aliases are used in the active client | Prefer the alias when the file already uses it |
| Relative imports are still used in many server files | Do not rewrite imports purely for style unless the task requires it |
| No import-order ESLint rule was detected | Follow the local file’s current order rather than inventing a new one |

## Function Style

| Area | Observed style |
|---|---|
| Server request handlers | Mostly `async` arrow functions exported from controller modules |
| Server app bootstrap | Function declarations are also used for top-level orchestration |
| Active client components | Commonly default-exported `function` components, with some `const React.FC` components present |
| Local helpers and callbacks | Arrow functions are common |

## Async and Error Handling

| Topic | Observed pattern |
|---|---|
| Async control flow | `async` / `await` is the standard pattern |
| Server error handling | Controllers call `next(error)` and centralized handlers in `server-side/src/util/errors.util.ts` format responses |
| Custom error classes | `AuthError` is used for auth failures with code/message payloads |
| Client error handling | `try` / `catch` around API calls, then toast notifications for user feedback |

## TypeScript Strictness

| Workspace | Detected flags |
|---|---|
| `server-side/tsconfig.json` | `strict: true`, `esModuleInterop: true`, `skipLibCheck: true`, `outDir: ./dist`, `rootDir: ./src`, custom `typeRoots` |
| `client-side-ts/tsconfig.app.json` | `strict: true`, `noUnusedLocals: true`, `noUnusedParameters: true`, `noFallthroughCasesInSwitch: true`, `noUncheckedSideEffectImports: true`, `noEmit: true`, `erasableSyntaxOnly: true` |
| `client-side-ts/tsconfig.node.json` | Same strictness family for Vite config files |

## Observed Agent-Facing Patterns

- Keep the active frontend in `client-side-ts/` and preserve its feature-based structure.
- Keep route guards and auth state in the existing auth feature rather than scattering them across pages.
- Prefer thin route components that compose existing layouts and feature components.
- Preserve the existing Express route/controller split on the server.
- Do not introduce a new coding pattern when the file already has an established local pattern.