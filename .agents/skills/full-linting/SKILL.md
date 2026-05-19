---
name: full-linting
description: Use when the user wants linting and static validation across both `client-side-ts/` and `server-side/`. The skill must inspect each workspace’s scripts and config, run the appropriate checks, and report results clearly without changing source code.
user-invocable: true
---

# Full Linting Skill

## Purpose

This skill performs repo-wide static validation for the active TypeScript frontend in `client-side-ts/` and the backend in `server-side/` and can produce a concise, human-readable linting report saved to docs/test-reports.

It is intended for cases where the user wants a complete linting pass across both app surfaces, with explicit reporting of what was checked, what passed, what failed, and what linting coverage is not detected in the repo.

This skill does not modify source files. Its responsibility is to inspect, run, and report static checks.

It may delegate complex linting orchestration to a `task` agent when both workspaces require parallel execution or when multiple linting layers require coordination.

## Scope

- `client-side-ts/`: ESLint validation plus TypeScript build validation
- `server-side/`: lint validation if a lint script/config exists; otherwise TypeScript build validation as the static safety net

## Subagent Delegation Strategy

**Delegate to `task` agent if:**
- Both workspaces need parallel execution to save time
- Multiple linting phases need strict sequencing (lint → type-check → coverage)
- User requires verbose logging or detailed failure diagnostics
- Linting failures need to be analyzed and triaged at scale

**Handle locally if:**
- Single workspace linting pass
- Quick validation (build-only check)
- No parallel execution needed
- Simple pass/fail reporting required

## Required Workflow

### Step 1: Inspect the relevant workspace configuration

Before running checks, inspect:

- `client-side-ts/package.json`
- `client-side-ts/eslint.config.js`
- `client-side-ts/tsconfig.json`
- `client-side-ts/tsconfig.app.json`
- `client-side-ts/tsconfig.node.json`
- `server-side/package.json`
- `server-side/tsconfig.json`
- any server-side ESLint config if present

From this inspection, determine:

- the exact lint scripts available in each workspace
- whether the server workspace has a real lint config or only TypeScript compilation checks
- whether any expected command is absent and should be reported as not detected

### Step 2: Run the active client checks

For `client-side-ts/`, run the repository-defined checks in this order:

1. `npm run lint`
2. `npm run build`

If one of these commands is missing from `client-side-ts/package.json`, report that explicitly instead of inventing a substitute.

### Step 3: Run the backend checks

For `server-side/`:

1. If a lint script is present, run the repository-defined lint command.
2. Always run `npm run build` as the TypeScript/static validation step.
3. If no lint config or lint script is detected, report `server-side` linting as not detected and use the build step as the static check.

Do not assume the backend has ESLint just because the frontend does.

### Step 4: Triage failures

If a check fails:

- report the exact command that failed
- summarize the first relevant error clearly
- distinguish between a lint failure, a type error, and a missing-script/config problem
- do not edit source files unless the user explicitly asks for fixes

If multiple checks fail, report them in the order they were run.

### Step 5: Report results and generate lint report file

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
- One- to three-line summary of overall linting outcome and confidence.

Checks Executed
- List of workspaces and commands run with status, e.g.:
  - client-side-ts: `npm run lint` — PASS (0 errors)
  - client-side-ts: `npm run build` — PASS (no type errors)
  - server-side: `npm run build` — PASS

Key Findings
- 3–6 short bullets highlighting the most important observations (e.g., recurring rule violations, type-error hotspots, missing lint config, long-running checks).

Top Issues (if any)
- For each top issue include: file/line, short description, first error line, likely cause.

Repro Steps
- Exact commands to reproduce failing check(s) locally (copyable), including working directory and any env notes.

Artifacts & Logs
- Relative paths to logs, report files, and relevant configuration (e.g., `client-side-ts/eslint.report.json`, `server-side/build.log`).

Replicability Notes
- Environment specs: Node/npm versions, OS, and any environment variables required.

Recommendations
- 2–5 actionable next steps (prioritized), e.g., fix top lint rule, add missing lint config to server-side, run `npm run build` in CI, or add a package-level lint script.

Optional: Coverage / Quality Metrics
- If available, include quick metrics: number of lint errors, warnings, and number of type errors.

Notes on length and tone
- Keep language plain and neutral.
- Avoid long output dumps; include only the first relevant line(s) and link to full logs.
- Target under 150 lines; shorter is better.

## Decision Rules

- Prefer the command defined by each workspace’s own `package.json`.
- Do not invent lint commands if a workspace has no lint script.
- Do not change source files to make lint pass unless the user explicitly asks for fixes.
- Treat absent server lint config as a documented gap, not as an error to paper over.
- Keep `client-side-ts/` as the primary frontend validation target; do not fall back to `client-side/` unless the user explicitly asks to validate the legacy app.

## Completion Checks

A full linting pass is complete when:

- `client-side-ts/` lint passes (or reported missing)
- `client-side-ts/` build passes
- `server-side/` lint passes if configured, or is reported as not detected if absent
- `server-side/` build passes

## Output Style

Use a concise results table in the CLI summary and write the generated report to `docs/test-reports/` when report generation is enabled.

Example CLI summary table:

| Workspace         | Check           | Status       | Notes                |
| ----------------- | --------------- | ------------ | -------------------- |
| `client-side-ts/` | `npm run lint`  | Pass         | -                    |
| `client-side-ts/` | `npm run build` | Pass         | -                    |
| `server-side/`    | lint            | Not detected | No lint config found |
| `server-side/`    | `npm run build` | Pass         | -                    |

If a failure occurs, include the failing command and the exact reason in plain language.
