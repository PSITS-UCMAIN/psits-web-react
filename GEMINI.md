# Coding Standards for AI Agents

## Quick Reference

For detailed standards, see `.agents/rules/`:
- **agent-behavior.md** - Agent-specific rules and boundaries
- **architecture.md** - Repository structure and API topology
- **coding-rules.md** - Naming conventions and patterns
- **linting.md** - ESLint and Prettier configuration
- **tech-stack.md** - Technology stack details

## General & TypeScript

- **Strict Typing:** Avoid `any`. Use `interface` or `type` for all variables, props, and payloads. Use `unknown` if necessary.
- **Naming Conventions:**
  - `camelCase` for variables/functions
  - `PascalCase` for components/types/React page files
  - `UPPER_SNAKE_CASE` for global constants
  - Lowercase with dot suffix for server files (e.g., `authV2.controller.ts`, `admin.route.ts`)
- **Formatting:** Follow Prettier/ESLint. Document any linting bypasses with `// eslint-disable-next-line`.
- **Documentation:** Avoid over-commenting. Use self-descriptive function names for complex logic. Multi-line documentation comments are encouraged.
- **Pragmatism:** Prioritize practical, efficient solutions.
- **Confidence & Accuracy:** Ensure 95% certainty before committing code; when in doubt, ask for clarification.

## Frontend (`client-side-ts/`)

- **Components:** Functional components only. One component per file.
- **State:** Keep state local; only use global context (e.g., `useAuth`) when essential.
- **Styling:** Use Tailwind CSS. Avoid custom `.css` files unless strictly necessary.
- **Type Safety:** Maintain strict TypeScript. Never use `any`.
- **Imports:** Prefer `@/` path aliases when the file already uses them.
- **Error Handling:** Use `try/catch` around API calls with toast notifications for user feedback.
- **File Structure:** Follow `client-side-ts/FILE_STRUCTURE_GUIDE.md` for file placement.

## Backend (`server-side/`)

- **Async/Await:** Use `async/await` over `.then()` for readability.
- **Error Handling:** Use `try/catch` in controllers and pass errors to middleware via `next(error)`.
- **Security:** Never hardcode secrets. Always use `process.env`.
- **Controllers:** Keep thin; delegate business logic to services/utilities.
- **Models:** Follow existing Mongoose patterns for queries, relationships, and hooks.
- **API Contracts:** Maintain consistent request/response shapes.
- **Performance:** Avoid n+1 queries; consolidate dependent queries when possible.

## Import Style

- External packages before local imports
- Use `@/` aliases in `client-side-ts/` when already present
- Follow local file's current import order; don't rewrite for style alone

## Function Style

- **Server:** Mostly `async` arrow functions exported from controller modules
- **Client:** Default-exported function components; some `const React.FC` patterns exist
- **Helpers:** Arrow functions are common

## Linting & Formatting

- **Client ESLint:** Configured in `client-side-ts/eslint.config.js`
  - `no-explicit-any`: Error
  - `no-unused-vars`: Error (with `_` ignored)
  - `no-console`: Warn (only `console.warn` and `console.error` allowed)
- **Server ESLint:** Not configured
- **Prettier:** Root `.prettierrc` applies project-wide
  - Print width: 80
  - Semicolons: true
  - Single quotes: false
  - Tab width: 2
  - Plugin: `prettier-plugin-tailwindcss`

## Key Boundaries

- **Active Frontend:** `client-side-ts/` - Write all new frontend code here
- **Legacy Frontend:** `client-side/` - Do not modify unless explicitly required
- **Backend:** `server-side/` - Express + TypeScript API
- **Agent Rules:** `.agents/rules/` - Never modify during normal coding tasks

## Validation Commands

- **Frontend:** `cd client-side-ts && npm run lint && npm run build`
- **Backend:** `cd server-side && npm run build`
- **Test infra guide:** See `docs/test-infrastructure.md` for test commands, CI artifact paths, and known gaps. Note: the legacy `client-side/` package.json currently lacks a `test` script and is documented as a gap in that guide.

## Tech Stack Summary

- **Runtime:** Node.js
- **Server:** Express 4.19.2 + Mongoose 8.4.1
- **Frontend:** React 19.2.0 + Vite 7.2.4 + React Router 7.11.0
- **UI:** Tailwind CSS + Radix UI + Framer Motion
- **Forms:** React Hook Form + Zod
- **Auth:** JWT + bcryptjs
- **Cloud:** AWS S3, Google Cloud Storage
- **Deployment:** Vercel (frontend), Koyeb (backend)

## Agent Behavior Rules

- Always write new frontend code in `client-side-ts/`
- Never modify `client-side/` unless explicitly required
- Never modify `.agents/rules/` during normal coding tasks
- Prefer editing existing files over creating new ones
- Do not refactor code outside current task scope
- Ask before adding dependencies; do not run `npm install` autonomously
- When a convention is not covered, ask instead of inventing one