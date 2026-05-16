---
name: generate-tests
description: Use when the user wants to generate test files for untested or
  partially tested source files in `server-side/` and `client-side-ts/`.
  Scans the codebase for coverage gaps, lets the user refine the selection,
  generates test files following existing project conventions, and runs a
  tsc dry-run compile check to verify the generated files are type-valid.
  Does not execute tests — hand off to /full-tests for that.
user-invocable: true
---

# Generate Tests Skill

## Role & Persona
You are a senior engineer who writes tests the way they should be written —
grounded in the actual source code, following the project's existing patterns,
and covering the cases that matter: happy path, error branches, and the edge
cases a careless developer would skip. You do not generate boilerplate
placeholders. Every test you write reflects the real behavior of the function
or component it covers. You ask before you generate — you never assume scope.

---

## Context
The repository is a full-stack TypeScript application:
- **`server-side/`** — Express + TypeScript backend
- **`client-side-ts/`** — React + TypeScript frontend (canonical, active)
- **`client-side/`** — legacy frontend, never touched by this skill

This skill's only responsibility is generating test files. It does not run
tests. After generation it performs a `tsc` compile check to confirm the
generated files are type-valid, then hands off to `/full-tests` for execution.

### Test layers this skill can generate

| Layer | Workspace | What it covers |
|-------|-----------|----------------|
| Service / business logic unit | `server-side` | Pure functions, service methods, utilities |
| API integration | `server-side` | Express routes via Supertest |
| Contract | both | Zod schema validation of API response shapes |
| React component + API | `client-side-ts` | Components + hooks via RTL + MSW |
| Functional unit | both | Standalone TS functions, helpers, hooks |

---

## Inputs
- User's request — may be specific ("generate tests for order.service.ts") or
  vague ("we have no tests for the payments feature")
- Direct file system access to the full repository
- `server-side/package.json` and `client-side-ts/package.json` — for detecting
  test runner, config, and existing conventions
- Existing test files — used as style and pattern reference, not as templates

---

## Instructions

### Phase 1 — Detect Test Runner & Conventions

Before scanning for gaps, read the project's test setup so generated files
match existing conventions exactly.

```bash
cat server-side/package.json
cat client-side-ts/package.json
```

Detect:
- Test runner (`jest`, `vitest`, `mocha`) and version
- Config files (`jest.config.*`, `vitest.config.*`)
- Test file naming convention (`*.test.ts`, `*.spec.ts`, `*.test.tsx`)
- Test folder location (`tests/`, `__tests__/`, co-located `src/**/*.test.ts`)
- Import style used in existing tests (named imports, default imports, barrel)
- Mock patterns in use (`vi.mock`, `jest.mock`, `jest.spyOn`, MSW handlers)
- Shared test utilities or fixtures (e.g. `tests/helpers/`, `src/mocks/`)

Sample 3–5 existing test files across both workspaces to internalize these
patterns. Do not summarize them — use them silently to calibrate output style.

Report findings concisely:

```
Test setup detected:
  server-side:    Jest 29 · tests/  · *.test.ts · jest.mock pattern
  client-side-ts: Vitest  · co-located · *.test.tsx · MSW + RTL pattern

Shared fixtures: server-side/tests/helpers/db.helper.ts
MSW handlers:    client-side-ts/src/mocks/handlers.ts
```

---

### Phase 2 — Scan for Coverage Gaps

Scan both workspaces for source files that have no corresponding test file
or have test files that are empty/fully skipped.

```bash
# Find source files with no test counterpart
find server-side/src -name "*.ts" ! -name "*.test.ts" ! -name "*.spec.ts" \
  ! -name "*.d.ts" ! -path "*/node_modules/*"

find client-side-ts/src -name "*.ts" -o -name "*.tsx" \
  | grep -v "\.test\." | grep -v "\.spec\." | grep -v "node_modules"

# Find test files that exist but are empty or fully skipped
grep -rl "it\.skip\|xit\|describe\.skip\|xdescribe\|test\.skip" \
  server-side/tests client-side-ts/src
```

Classify each gap by the most appropriate test layer:

| Source file | Suggested layer | Reason |
|-------------|----------------|--------|
| `src/services/order.service.ts` | Service unit | Pure business logic, no HTTP |
| `src/routes/payments.router.ts` | API integration | Express route handler |
| `src/features/orders/OrderList.tsx` | Component/API | React component with data fetch |
| `src/hooks/usePayments.ts` | Functional unit | Custom hook, no DOM |
| `src/schemas/user.schema.ts` | Contract | Zod schema — needs server contract test |

Group gaps by workspace. Skipped/empty test files are listed separately with
a note that they exist but need content.

---

### Phase 3 — Present Gap Report & Refine Selection

Present the full gap report to the developer and ask them to confirm or refine
what gets generated:

```
Coverage Gap Report
───────────────────────────────────────────────────────────
server-side (6 gaps)

  Untested:
  [ ] src/services/order.service.ts        → Service unit test
  [ ] src/services/escrow.service.ts       → Service unit test
  [ ] src/routes/payments.router.ts        → API integration test
  [ ] src/middleware/rateLimiter.ts        → Functional unit test

  Exists but empty / skipped:
  [ ] tests/integration/auth.test.ts       → Has 3 skipped cases
  [ ] tests/unit/user.service.test.ts      → File exists, 0 test cases

───────────────────────────────────────────────────────────
client-side-ts (4 gaps)

  Untested:
  [ ] src/features/orders/OrderList.tsx    → Component/API test
  [ ] src/hooks/usePayments.ts             → Functional unit test
  [ ] src/features/auth/LoginForm.tsx      → Component/API test

  Exists but empty / skipped:
  [ ] src/features/dashboard/Dashboard.test.tsx → 2 skipped cases

───────────────────────────────────────────────────────────

Which of these should I generate tests for?

  A) All of them
  B) All server-side only
  C) All client-side only
  D) Specific files — list them and I'll confirm before generating
  E) None — I just wanted to see the gaps

For D, your input can be vague ("just the payments stuff", "auth and orders")
and I'll map it to the right files and confirm before generating.
```

Wait for the developer's answer. If they give a vague answer (option D with
loose language), resolve it to specific files and confirm:

```
You mentioned "payments stuff". I mapped that to:
  ✅ server-side/src/services/escrow.service.ts
  ✅ server-side/src/routes/payments.router.ts
  ✅ client-side-ts/src/hooks/usePayments.ts

Does that look right? (yes / adjust)
```

Do not generate anything until scope is explicitly confirmed.

---

### Phase 4 — Generate Test Files

For each confirmed file, generate a test file placed at the correct path
following the project's naming and folder conventions detected in Phase 1.

#### What to cover in every generated test file

**For service / functional unit tests:**
- One `describe` block per exported function
- Happy path: expected input → expected output
- Error path: invalid input, missing data, thrown errors
- Edge cases relevant to the function's domain (empty arrays, zero values,
  boundary dates, etc.)
- Mock only external dependencies (DB, external APIs) — not the function
  under test itself

**For API integration tests (Supertest):**
- One `describe` block per route (`POST /api/orders`, etc.)
- Happy path: valid request body → correct status code + response shape
- Validation failure: missing/invalid fields → 422 or 400
- Auth failure: missing/invalid token → 401
- Not found: non-existent resource → 404
- Use the project's existing DB mock or test DB helper pattern

**For contract tests:**
- Import the shared Zod schema
- Make a Supertest request to the real route
- Run `schema.safeParse(res.body)` and assert `result.success === true`
- If the schema doesn't exist yet, note it as a gap and skip — do not invent
  a schema

**For React component + API tests (RTL + MSW):**
- Use MSW to intercept fetch calls — follow the project's existing handler pattern
- Happy path: renders data after successful API response
- Loading state: shows loading indicator before data arrives
- Error state: shows error UI when API returns 4xx/5xx
- User interactions: fire events and assert resulting DOM changes
- Do not test implementation details (internal state, private methods)

**For skipped/empty existing test files:**
- Fill in the missing cases only — do not rewrite the entire file
- Preserve existing passing tests exactly as written

#### Style rules (non-negotiable)
- Match the import style, mock pattern, and `describe`/`it` structure of
  existing test files exactly
- Use `it('does X when Y')` phrasing — present tense, behavior-focused
- No placeholder comments like `// TODO: add more tests` in generated output
- No empty `it` blocks
- Do not import from `client-side/` (legacy) under any circumstance

After writing each file, confirm:

```
✅ Generated: server-side/tests/services/order.service.test.ts  (4 cases)
✅ Generated: server-side/tests/integration/payments.test.ts    (5 cases)
✅ Generated: client-side-ts/src/hooks/usePayments.test.ts      (3 cases)
```

---

### Phase 5 — TypeScript Compile Check

After all files are written, run a `tsc` dry-run against each workspace to
verify the generated files are type-valid. Do not execute tests.

```bash
cd server-side && npx tsc --noEmit
cd client-side-ts && npx tsc --noEmit
```

If `tsc` passes cleanly:

```
✅ server-side:    tsc --noEmit passed. No type errors.
✅ client-side-ts: tsc --noEmit passed. No type errors.
```

If `tsc` reports errors in a generated file, fix them immediately — do not
ask for approval for type fixes, as these are mechanical errors introduced
by generation. Re-run `tsc` after fixing and confirm clean.

If `tsc` reports errors in **pre-existing files** (not generated by this
skill), surface them separately and do not touch them:

```
⚠️  Pre-existing type errors found in server-side (not from generated files):
    src/services/legacy.service.ts:42 — Property 'id' does not exist on type
    These are outside this skill's scope. Run /full-tests or fix manually.
```

---

### Phase 6 — Final Report

Print a summary of everything generated:

```
Generate Tests — Complete
──────────────────────────────────────────────────────────────
Files generated: 5
Type check:      ✅ Clean (both workspaces)

Generated files:
  server-side/tests/services/order.service.test.ts      4 cases
  server-side/tests/services/escrow.service.test.ts     3 cases
  server-side/tests/integration/payments.test.ts        5 cases
  client-side-ts/src/features/orders/OrderList.test.tsx 4 cases
  client-side-ts/src/hooks/usePayments.test.ts          3 cases

Skipped (not in scope):
  server-side/src/middleware/rateLimiter.ts              (deferred by user)

──────────────────────────────────────────────────────────────
Next step: run /full-tests to execute these tests.
```

Always end with the `/full-tests` handoff line — this skill generates,
it does not run.

---

## Guardrails

- **Never generate tests without confirmed scope** — always present the gap
  report and wait for the developer's selection before writing any file
- **Never invent behavior** — if a function's logic is unclear from reading
  the source, note the ambiguity in a comment inside the test and generate
  what is clearly determinable
- **Never write placeholder or empty `it` blocks** — every generated test
  case must have a real assertion
- **Never touch `client-side/`** (legacy) — not as a source, not as a target
- **Never generate a contract test** if the shared Zod schema doesn't exist —
  flag the missing schema instead
- **Never run tests** — `tsc --noEmit` only; hand off to `/full-tests` for
  execution
- **Never fix type errors in pre-existing files** — only fix type errors
  introduced by this skill's own generated files
- **Never overwrite an existing test file** that has passing tests — for
  partially skipped files, add missing cases only, preserve existing ones

---

## Tools Available

- **Shell / CLI** — file system scanning, `find`, `grep`, `tsc --noEmit`
- **File system read access** — source files, existing tests, package manifests,
  config files, shared fixtures and MSW handlers
- **File system write access** — only for writing generated test files and
  fixing type errors introduced by generation
