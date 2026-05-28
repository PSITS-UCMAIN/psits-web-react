---
name: frontend-feature
description: Implement or modify React + TypeScript frontend functionality in client-side-ts/ using existing project patterns, production-ready code, and the file organization defined in client-side-ts/FILE_STRUCTURE_GUIDE.md.
---

# Purpose

Use this skill when working on frontend functionality in `client-side-ts/`.

This includes:

- new UI screens or flows
- new components
- modifying existing React frontend logic
- integrating frontend with backend APIs
- updating state handling, forms, tables, dialogs, and user interactions
- improving frontend data handling, validation, or error handling

This skill should produce production-ready React + TypeScript code that matches the current codebase patterns.

# Required References

Before making changes, inspect and follow:

- `client-side-ts/FILE_STRUCTURE_GUIDE.md`
- relevant existing frontend files near the area being changed
- current routing, hooks, and state handling patterns
- existing type/interface usage
- existing API integration and error handling patterns
- existing UI feedback patterns such as toasts

Always use `client-side-ts/FILE_STRUCTURE_GUIDE.md` to determine where new files should live.

Do not invent file placement if the repository already defines it.

# Workflow

1. Inspect existing frontend architecture.
   - Review relevant pages, components, hooks, API utilities, types, layouts, and utility patterns.
   - Review `client-side-ts/FILE_STRUCTURE_GUIDE.md` before creating or moving files.

2. Scope the change.
   - Identify which UI parts, state logic, API integrations, and types need updates.
   - Keep the implementation minimal and focused on the requested functionality.

3. Implement frontend functionality.
   - Follow existing React + TypeScript patterns.
   - Keep components focused, reusable, and consistent with project style.
   - Use production-ready code quality, not placeholder or prototype-style code.

4. Preserve architectural consistency.
   - Keep UI logic separate from data-fetching logic where possible.
   - Follow existing routing, hooks, and feature organization patterns.
   - Avoid introducing broader architectural changes unless clearly necessary.

5. Validate consistency.
   - Ensure success/error handling aligns with backend response structure.
   - Ensure types and interfaces stay aligned with backend contracts.
   - Ensure props/contracts are not broken unintentionally.

6. Summarize clearly.
   - Frontend files changed
   - What was implemented
   - What was validated
   - What still needs manual verification

# Frontend Standards

## Component Design

- Keep components focused and reusable.
- Avoid overly large components when logic can be separated cleanly.
- Preserve existing component responsibilities where possible.
- Do not break existing component props/contracts unless explicitly required.

## State Management

- Do not introduce broad state changes unless necessary.
- Follow existing state handling patterns already present in `client-side-ts/`.
- Prefer local state when the concern is local.
- Do not add new state abstractions unless justified by the task and consistent with the project.

## Data Fetching and UI Logic

- Keep UI logic separate from data-fetching logic where possible.
- Reuse existing API/service patterns if they already exist.
- Avoid mixing presentation concerns with networking concerns unnecessarily.

## Type Safety

- Maintain TypeScript type safety.
- Do not introduce `any`.
- Implement interfaces and types where appropriate.
- Keep frontend contracts aligned with backend request/response shapes.

## Error Handling and Feedback

- Have proper UI toast/error feedback where applicable.
- Handle consistent success and error JSON bodies based on backend structure.
- Avoid silent failures.
- Surface meaningful user-facing feedback for failure states where the UI already supports it.

## Production Readiness

- Write production-ready React code.
- Avoid temporary hacks, placeholder structures, or dead code.
- Reuse existing patterns before inventing new ones.
- Prefer clarity, maintainability, and predictable behavior.
- Keep implementations clean enough for real project use, not just proof of concept.

# File Placement Rule

When creating new frontend files:

- place them according to `client-side-ts/FILE_STRUCTURE_GUIDE.md`
- follow existing naming conventions
- avoid creating ad hoc folders or structures that conflict with the documented frontend layout

If the correct placement is unclear, inspect nearby files and align with the documented structure instead of guessing.

# Constraints

- Do not introduce `any`.
- Do not break existing props/contracts unless explicitly required.
- Do not introduce broad architectural or state changes unless necessary.
- Do not ignore `client-side-ts/FILE_STRUCTURE_GUIDE.md`.
- Do not mix unrelated refactors into the same change.
- Do not add new dependencies unless necessary and justified.
- Do not bypass existing API/data handling patterns without reason.

# Final Response Format

When actual frontend files are changed, include:

1. Summary of frontend changes
2. Files changed
3. How it works
4. Validation performed
5. Risks, assumptions, or manual checks needed

For non-implementation discussion, do not force this format unless code or files were actually changed.

# Quality Standard

A good result should be:

- production-ready
- type-safe
- consistent with the existing frontend architecture
- aligned with backend contracts
- placed correctly according to `client-side-ts/FILE_STRUCTURE_GUIDE.md`
- easy for the team to review and continue working on
