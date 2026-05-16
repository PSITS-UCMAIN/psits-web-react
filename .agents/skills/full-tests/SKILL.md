---
name: full-tests
description: Use when the user wants to run or plan complete testing across `server-side/` and `client-side-ts/`, including API integration, service/business unit tests, React component/API tests, contract tests, and functional unit tests, with support for module-only scope.
user-invocable: true
---

# Full Tests Skill

## Purpose

This skill runs and reports a complete testing flow for this repository.

It supports two execution modes:

- full suite across `server-side/` and `client-side-ts/`
- module-only scope when the user requests one domain/feature only

It does not auto-fix source code unless explicitly requested.

## Required Test Layers

The skill must cover these layers when available:

1. API integration tests
2. service/business logic unit tests
3. React component + API tests (React Testing Library + MSW)
4. contract tests (API shape source of truth)
5. functional unit tests

## Workflow

### Step 1: Determine scope

Detect whether the user asked for:

- full-repo test run
- module-only test run

If module-only, require the module target and map it to workspace paths.

Examples:

- backend module: `tests/integration/authV2.integration.test.ts`
- frontend module: `src/features/auth/**`

### Step 2: Verify scripts and tooling

Inspect both package manifests before execution:

- `client-side-ts/package.json`
- `server-side/package.json`

Confirm test scripts exist and report missing scripts explicitly.

### Step 3: Execute backend tests

For full scope in `server-side/`:

- `npm run test`

For module-only scope in `server-side/`:

- `npm run test:module -- tests/<target>.test.ts`

### Step 4: Execute frontend tests

For full scope in `client-side-ts/`:

- `npm run test`

For module-only scope in `client-side-ts/`:

- `npm run test:module -- src/features/<target>`

### Step 5: Optional coverage pass

If user asks for coverage, run both:

- `cd server-side && npm run test:coverage`
- `cd client-side-ts && npm run test:coverage`

### Step 6: Report results

Summarize by workspace and test layer:

- pass/fail status
- failed test names
- first actionable error per failure
- whether failures are infra/config vs code behavior

## Constraints

- Never silently skip a test layer that has configured tests.
- Never claim success for a layer that was not run.
- Never auto-install dependencies unless user explicitly asks.
- Never edit source to fix tests unless requested.
- Always respect module-only scope when the user asks for it.

## Output Style

Use a compact table:

| Workspace        | Layer           | Command                                 | Status | Notes                        |
| ---------------- | --------------- | --------------------------------------- | ------ | ---------------------------- |
| `server-side`    | API integration | `npm run test -- tests/integration/...` | Pass   | -                            |
| `server-side`    | Contract        | ...                                     | Fail   | expected `message`, got null |
| `client-side-ts` | Component/API   | ...                                     | Pass   | -                            |

Then provide a short “next actions” list only when failures exist.
