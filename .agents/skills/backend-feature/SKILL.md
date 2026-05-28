---
name: backend-feature
description: Use when the task requires implementing or modifying Express + TypeScript backend functionality in `server-side/`. This includes creating or updating API routes, controllers, services, types, models, middleware, or database interactions. Follow existing backend architecture patterns and ensure consistency with current conventions.
---

# Purpose

Use this skill when working on backend functionality in `server-side/`.

This includes:

- new API routes
- new controllers or services
- modifying existing backend logic
- updating request/response behavior
- updating middleware, models, or backend utilities when needed for the feature

Do not use this skill for:

- frontend-only changes
- architectural discussion without implementation
- prompt structuring
- git commit planning
- general Q&A

# Workflow

1. Inspect existing backend architecture.
   - Review routes, controllers, services, models, middlewares, shared utilities, and types.
   - Follow existing naming and folder conventions.

2. Scope the change.
   - Identify required endpoints, controllers, services, model changes, or persistence updates.
   - Keep changes minimal and focused.

3. Implement backend functionality.
   - Follow the existing backend architecture patterns used in `server-side/src/`.
   - Prefer route -> middleware -> controller -> service/model/helper flow when that pattern already exists.

4. Validate consistency.
   - Ensure request/response contracts, models, and shared types remain aligned.

5. Summarize clearly.
   - Backend files changed
   - What was implemented
   - What was validated / needs manual testing

# Backend Standards

## Express + TypeScript Architecture

- Keep routes focused on endpoint wiring and middleware composition.
- Keep controllers focused on request parsing, response shaping, and orchestration.
- Move reusable business logic into services, utilities, or model helpers when existing patterns support that split.
- Reuse existing middleware for auth, rate limiting, uploads, and request checks instead of reimplementing the same behavior.

## Data and Persistence

- Follow existing Mongoose model and interface patterns in `server-side/src/models/`.
- Keep model shapes, related interfaces, and response payloads consistent.
- Be careful with query correctness and performance.
- Avoid repetitive dependent queries when they can be consolidated.
- When a change touches multiple writes, preserve existing transaction/session patterns where they already exist.

## Request and Response Handling

- Keep backend contracts consistent with current frontend expectations.
- Preserve existing success/error JSON response patterns used by nearby endpoints.
- Validate inputs and handle invalid identifiers, missing resources, and empty results explicitly.
- Avoid silent failures and unclear error messages.

## Production Readiness

- Write production-ready Express + TypeScript code.
- Avoid placeholder handlers, dead code, or speculative abstractions.
- Reuse existing patterns before inventing new ones.
- Prefer clarity, maintainability, and predictable behavior.

# Constraints

- Do not bypass existing middleware, service, model, or utility patterns without reason.
- Maintain consistency with existing architecture and conventions.
- Do not introduce unrelated refactors into the same change.
- Do not add new dependencies unless necessary and justified.
- Do not break existing API contracts unless explicitly required.

# File Placement Rule

When creating new backend files:

- place route files in `server-side/src/routes/`
- place controller files in `server-side/src/controllers/`
- place reusable business logic in `server-side/src/services/` when that matches existing patterns
- place models and related interfaces in `server-side/src/models/`
- place middleware in `server-side/src/middlewares/`
- place shared backend types in `server-side/src/types/` when they are not model-local
- place helper logic in `server-side/src/util/` or `server-side/src/utils/` based on nearby conventions

If placement is unclear, inspect nearby backend files and align with the existing structure instead of guessing.

# Final Response Format

1. Summary of backend changes
2. Files changed
3. Validation performed
4. Risks, assumptions, or manual checks needed
