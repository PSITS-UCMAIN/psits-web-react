---
name: full-linting
description: Use when the user wants linting and static validation across both `client-side-ts/` and `server-side/`. The skill must inspect each workspace’s scripts and config, run the appropriate checks, and report results clearly without changing source code.
user-invocable: true
---

# Full Linting Skill

## Purpose

This skill performs repo-wide static validation for the active TypeScript frontend in `client-side-ts/` and the backend in `server-side/`.

It is intended for cases where the user wants a complete linting pass across both app surfaces, with explicit reporting of what was checked, what passed, what failed, and what linting coverage is not detected in the repo.

This skill does not modify source files. Its responsibility is to inspect, run, and report static checks.

## Scope

- `client-side-ts/`: ESLint validation plus TypeScript build validation
- `server-side/`: lint validation if a lint script/config exists; otherwise TypeScript build validation as the static safety net

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

### Step 5: Report results clearly

Final output must include:

- workspace checked
- commands run
- pass/fail status for each command
- any missing lint config or missing lint script
- any notable errors or warnings

## Decision Rules

- Prefer the command defined by each workspace’s own `package.json`.
- Do not invent lint commands if a workspace has no lint script.
- Do not change source files to make lint pass unless the user explicitly asks for fixes.
- Treat absent server lint config as a documented gap, not as an error to paper over.
- Keep `client-side-ts/` as the primary frontend validation target; do not fall back to `client-side/` unless the user explicitly asks to validate the legacy app.

## Completion Checks

A full linting pass is complete when:

- `client-side-ts/` lint passes
- `client-side-ts/` build passes
- `server-side/` lint passes if configured, or is reported as not detected if absent
- `server-side/` build passes

## Output Style

Use a concise results table when possible.

Example:

| Workspace         | Check           | Status       | Notes                |
| ----------------- | --------------- | ------------ | -------------------- |
| `client-side-ts/` | `npm run lint`  | Pass         | -                    |
| `client-side-ts/` | `npm run build` | Pass         | -                    |
| `server-side/`    | lint            | Not detected | No lint config found |
| `server-side/`    | `npm run build` | Pass         | -                    |

If a failure occurs, include the failing command and the exact reason in plain language.
