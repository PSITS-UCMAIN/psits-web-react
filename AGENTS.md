# AGENTS.md

## Project Structure & Module Organization

This repository is split into three main apps/modules:

- `client-side-ts/`: Active React 19 + TypeScript + Vite frontend. Main entry points include `src/main.tsx`, `src/App.tsx`, and `src/router.tsx`. Static assets live in `src/assets/` and `public/`. Prefer this module for new frontend work unless the task is explicitly legacy-only.
- `client-side/`: Legacy React + JavaScript + Vite frontend. Main entry points include `src/main.jsx` and `src/App.jsx`.
- `server-side/`: Express + TypeScript API. API endpoints and request handling live under `src/controllers/` and `src/routes/`, shared business logic commonly lives in `src/services/`, persistence models live in `src/models/`, middleware lives in `src/middlewares/`, and static/generated assets and templates live under `src/assets/`, `src/templates/`, and related mail/template folders.

Supporting documentation also exists in `docs/` and `server-side/docs/`.

Do not commit generated output from `client-side/dist/`, `client-side/node_modules/`, `client-side-ts/dist/`, `client-side-ts/node_modules/`, `server-side/dist/`, or `server-side/node_modules/`.

## Detailed Standards Reference

For comprehensive coding standards, architecture details, and technical specifications, refer to:

- **`.agents/rules/agent-behavior.md`** - Agent-specific coding rules and boundaries
- **`.agents/rules/architecture.md`** - Repository layout, API topology, and routing patterns
- **`.agents/rules/coding-rules.md`** - Naming conventions, import style, function patterns, and TypeScript strictness
- **`.agents/rules/linting.md`** - ESLint and Prettier configuration details
- **`.agents/rules/tech-stack.md`** - Complete technology stack and dependencies
- **`docs/test-infrastructure.md`** - Test infrastructure guide: how to run tests locally and in CI; notes that the legacy `client-side/` workspace currently has no tests configured (see Known gaps).

## Working Style

- Make minimal, high-confidence changes. Do not introduce large refactors unless explicitly requested.
- Preserve existing UI/UX unless the task clearly requires changes.
- Prioritize clarity, maintainability, and consistency with the current codebase over "clever" solutions.
- Follow existing patterns in both frontend and backend before introducing new approaches.
- Avoid unnecessary abstractions. Prefer simple, readable implementations that match current project style.
- When uncertain, inspect surrounding files and reuse existing patterns instead of guessing.
- Do not assume missing requirements; surface assumptions clearly in the final response.
- If the task is blocked by missing credentials, dashboard-only values, external service configuration, environment variables, secrets, third-party account access, local machine setup, or any other required manual step, do not invent code-based workarounds just to avoid asking.
- In those cases, explicitly stop and tell the user exactly what manual action is needed.
- Prefer the most practical path to completion, even when that means asking the user to retrieve or configure something manually.
- When requesting manual intervention, be specific:
  - explain what is needed
  - explain where to get it
  - explain why it is needed
  - give exact step-by-step instructions when helpful
- Do not replace a required manual setup step with speculative or impractical implementation changes.

## Architecture

### General

- Respect the separation between `client-side-ts/`, `client-side/`, and `server-side/`. Do not mix concerns.
- Prefer incremental, additive changes over rewriting existing logic.

### Frontend (React + Vite; prefer `client-side-ts`)

- Keep components focused and reusable.
- Do not introduce broad state management changes unless necessary.
- Follow the existing state management, routing, and API access patterns already present in the specific frontend you are editing.
- Avoid breaking component props/contracts.
- Keep UI logic separate from data-fetching logic where possible.
- Maintain TypeScript type safety in `client-side-ts`; avoid using keyword `any`.
- For shared API work, keep frontend request/response handling aligned with the backend's existing JSON structure.
- Have proper UI success and error handling using the notification/toast patterns already used in the app being changed.

### Backend (Express + TypeScript)

- Keep controllers thin; business logic should not live in controllers when an existing service/helper pattern already covers it.
- Place reusable logic in appropriate services, utilities, middleware, or model helpers rather than scattering it across routes/controllers.
- Follow existing Mongoose/model usage patterns for queries, relationships, hooks, and data shaping.
- Avoid breaking existing API contracts unless explicitly required.
- Ensure request validation, response payloads, and model shapes remain consistent.
- Be careful with query behavior and performance.
- Avoid n + 1 style data-fetching issues where repeated dependent queries can be consolidated.
- Have proper error handling and return consistent success and error JSON bodies based on existing backend conventions.
- Reuse existing middleware and helper patterns for auth, uploads, rate limits, and shared request handling instead of bypassing them with one-off logic.

## Manual Intervention Rules

- Recognize when a task cannot be completed correctly without user action.
- Examples include:
  - retrieving connection strings, API keys, secrets, or project IDs from dashboards
  - configuring third-party services
  - updating local environment variables or machine-specific settings
  - running commands that require user-owned access, authentication, approvals, or devices
  - verifying behavior that depends on external systems not available to the agent

- When such a blocker exists:
  1. Do not guess.
  2. Do not create workaround code unless the user explicitly asked for an alternative approach.
  3. Tell the user exactly what needs to be done manually.
  4. Keep the instructions concrete and minimal.
  5. Resume implementation only after the required manual dependency is satisfied.

- If partial progress is still possible, complete the safe code changes first, then clearly separate:
  - what was completed
  - what still requires manual action from the user

## File Reference Style

- Always reference files using repo-relative paths, not absolute local machine paths.
- Paths should start from the repository root.

Examples:

- Use: `client-side-ts/src/features/auth/components/LoginForm.tsx:42`
- Use: `client-side/src/pages/Home.jsx:18`
- Use: `server-side/src/controllers/eventV2.controller.ts:101`
- Do not use: `C:/Users/.../PsitsWeb/client-side-ts/src/...`

- If mentioning the repository root is useful for clarity, refer to it as `PsitsWeb` in prose, but do not prepend `PsitsWeb/` to every file path unless explicitly needed.
- Keep file references short, readable, and easy to scan.

## Safety

- Only modify files directly related to the task.
- Do not rename, move, or delete files unless explicitly required.
- Do not introduce breaking changes to APIs, schemas, or frontend contracts without clear instruction.
- Avoid touching authentication, critical business logic, or data models unless the task explicitly requires it.
- Do not introduce new dependencies unless necessary and justified.
- Prefer reversible changes (easy to rollback via Git).
- If a change has potential side effects, explicitly call it out.

## Validation

- Ensure logic correctness before focusing on optimization.
- Validate both success and failure cases where applicable.
- For backend:
  - Ensure endpoints handle edge cases such as nulls, invalid input, and empty results.
  - Ensure queries return expected data shapes.
- For frontend:
  - Ensure UI does not break existing layouts or flows.
  - Ensure data is correctly rendered and handled.
- Run the relevant checks for the module you changed when possible:
  - `client-side-ts`: `npm run lint` and `npm run build`
  - `client-side`: `npm run lint` and `npm run build`
  - `server-side`: `npm run build`, and run `npm run dev` for manual endpoint verification when backend behavior changes
- If full validation cannot be executed, clearly state what was not verified.
- Prefer predictable, testable behavior over assumptions.

## Interaction Rules

- Do not assume every request is an implementation task.
- If the user is asking a question, giving feedback, requesting review, or asking for planning help, answer directly without pretending code changes were made.
- Only use implementation-oriented response structure when files or code were actually modified.
- Prefer the narrowest applicable behavior for the current request.

## Final Response

When actual code, configuration, or file changes are made, include:

1. **Summary of Changes**
   - What was implemented or modified and why.

2. **Files Changed**
   - List of files touched with brief description per file.

3. **How It Works**
   - Brief explanation of the implementation.

4. **Validation**
   - What was checked or verified.
   - What still needs manual testing (if any).

5. **Assumptions / Risks**
   - Any assumptions made due to missing context.
   - Any potential side effects or edge cases.

6. **Manual Steps Required** (only if applicable)
   - List any required user actions that the agent could not perform directly.
   - Provide exact, practical instructions.
   - Do not hide required manual intervention behind speculative workaround suggestions.

For non-implementation requests such as:

- answering questions
- explaining concepts
- reviewing architecture
- planning
- prompt/task structuring
- discussing options

do **not** force the implementation response format. Respond in the format most appropriate to the user's request.

Keep explanations concise, practical, and focused on helping the developer quickly verify and move forward.
Avoid unnecessary verbosity or theoretical explanations.