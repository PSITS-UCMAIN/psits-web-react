---
name: full-tests
description: Use when the user wants to run or plan complete testing across `server-side/` and `client-side-ts/`, including API integration, service/business unit tests, React component/API tests, contract tests, and functional unit tests, with support for module-only scope.
user-invocable: true
---

# Full Tests Skill

## Purpose

This skill runs and reports a complete testing flow for this repository and writes a concise, human-readable test execution report to docs/test-reports.

It supports two execution modes:

- full suite across `server-side/` and `client-side-ts/`
- module-only scope when the user requests one domain/feature only

It does not auto-fix source code unless explicitly requested.

It may delegate large-scale test orchestration to a `task` agent for parallel execution, coordinated multi-layer test runs, or complex test failure triage.

## Subagent Delegation Strategy

**Delegate to `engineered-implementor` agent if:**
- Tests are failing and root cause is code logic (not infra/environment issue)
- Fixing failures requires implementing new test infrastructure or layers
- Multiple test files need refactoring to achieve coverage targets
- Complex test mocking patterns or test data factories need to be built
- User asks to "fix failing tests" (not just run and report)
- Test implementation gaps exist (missing unit/integration/E2E tests for a feature)

**Delegate to `task` agent if:**
- Full repo test run across both workspaces with coverage collection
- Parallel execution of backend + frontend tests needed
- Complex failure analysis or test output triage required (report generation, no fixes)
- Multiple test layers need strict sequencing (unit → integration → E2E)
- User requests `--deep-triage` mode for failing tests
- Test output is large (1000+ lines) and needs structured aggregation
- Running tests to gather data/diagnostics (not implementing solutions)

**Handle locally if:**
- Module-only test run (single workspace, single feature)
- Quick smoke test or single-layer validation
- No parallel execution benefits
- Simple pass/fail reporting

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

**If test scripts are missing or significantly broken, escalate to `engineered-implementor`** — this indicates infrastructure gaps that require implementation work, not just reporting.

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

### Step 6: Report results and generate report file

- Create directory `docs/test-reports/` if it does not exist.
- Determine today's date (yyyy-mm-dd). Count existing files that match `yyyy-mm-dd-test-report*.md` to choose index (1 for first, 2 for second, etc.).
- Write a single markdown report file named `yyyy-mm-dd-test-report[index].md` into `docs/test-reports/`.
- Keep the report concise and human-readable; prefer summary bullets and short paragraphs. Aim for under 150 lines.

Required frontmatter at the top of each report (exactly this small block):

# Test Execution Report
**Date**: yyyy-mm-dd
**Report ID**: yyyy-mm-dd-test-report[index].md
**Time Generated**: HH:mm:ss+tz

Report body structure (use these headings and keep each section brief):

Summary
- One- to three-line summary of overall test outcome and confidence.

Tests Executed
- List of layers executed with short commands and status, e.g.:
  - server-side: API integration (`npm run test -- tests/integration`) — PASS (12/12)
  - client-side-ts: Component/API (`npm run test`) — FAIL (3 failures)

Key Findings
- 3–6 short bullets highlighting the most important observations (e.g., flaky test names, common error message, infra failure, missing env var).

Top Failures (if any)
- For each top failing test include: test name, failure summary (one line), first stack/failed assertion line, likely cause.

Repro Steps
- Exact commands to reproduce failing layer(s) locally (copyable), including working directory and any env note.

Artifacts & Logs
- Relative paths to logs, coverage HTML, and test snapshots (e.g., `server-side/coverage/index.html`, `logs/test-run-2026-05-17.log`).

Replicability Notes
- Environment specs: Node/npm versions, OS, DB state required (e.g., seed data), and whether a mock server was used.

Recommendations
- 2–5 actionable next steps (prioritized), e.g., fix failing assertion, increase timeout, re-run with DB seed.

Optional: Coverage Summary
- Brief coverage percentages by workspace (if coverage was requested/run).

Notes on length and tone
- Keep language plain and neutral.
- Avoid long stack dumps; include only the first relevant line(s) and link to full logs.
- Target under 150 lines; shorter is better.

## Constraints

- Never silently skip a test layer that has configured tests.
- Never claim success for a layer that was not run.
- Never auto-install dependencies unless user explicitly asks.
- Never edit source to fix tests unless requested — unless escalating to `engineered-implementor`.
- Always respect module-only scope when the user asks for it.
- **Escalate to `engineered-implementor` if:**
  - Fixing test failures requires implementing missing test infrastructure
  - Multiple test files need refactoring for coverage compliance
  - Test patterns or mocks require new abstractions or helper layers
  - Requested action is "fix the tests" not "run and report the tests"

## Output Style

Primary output remains a compact table in the CLI summary, followed by the generated report file in `docs/test-reports/` when report generation is enabled.

Example CLI summary table:

| Workspace        | Layer           | Command                                 | Status | Notes                        |
| ---------------- | --------------- | --------------------------------------- | ------ | ---------------------------- |
| `server-side`    | API integration | `npm run test -- tests/integration/...` | Pass   | -                            |
| `server-side`    | Contract        | ...                                     | Fail   | expected `message`, got null |
| `client-side-ts` | Component/API   | ...                                     | Pass   | -                            |

Then provide a short “next actions” list only when failures exist.
