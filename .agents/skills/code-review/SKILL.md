---
name: code-review
description: Project-specific code review skill for psits-web-react. Performs high-signal reviews that follow this repository's conventions, architecture boundaries, and release quality bar.
---

# Code Review Skill for psits-web-react

Purpose

- Provide a reproducible, project-aware code review checklist and output format for agents and human reviewers. This skill encodes what matters in this repository (frontend split, TypeScript strictness, quality checks, and agent safety rules) and prescribes a prioritized review order.
  -- Run locally only; this skill does not invoke other agents or subagents.

Design principles (grounded in repo)

- Active frontend is `client-side-ts/`. New UI work must live there; `client-side/` is legacy and only reviewed for migration or explicit legacy fixes.
- TypeScript strictness and linting are enforced in the active client (`client-side-ts/`) and build-time checks are required for server-side (`server-side/`). Treat missing lint/build scripts as a documentation/infrastructure issue, not an immediate code failure.
- Automated verification generation has been deferred across the repository; focus reviews on build, lint, and manual verification where needed.
- Agent behavior: do not edit `.agents/rules/` without explicit instruction. Preserve project agent rules and follow AGENTS.md guidance.

Who should use this skill

- Senior reviewers (human or automated) that must produce a concise review report for PRs, diffs, or file-level reviews. Invokable with a path, a diff, or a PR/commit reference.

Invocation inputs

- Required (one of): file path(s) relative to repo root, unified diff text, or a PR/commit range.
- Optional flags: `--propose-fixes` (generate suggested patches but do not apply), `--strict` (raise severity threshold for release-critical modules).

## Routing

- This skill runs locally only and does not call other agents or subagents. All analysis, checks, and report generation are performed within the skill and the repository scripts it invokes.

## Phase 1: Understand scope

1. Map changed files and infer scope: backend, active frontend, legacy frontend, docs, or infra.
2. If files touch multiple layers (e.g., routes + UI), split the review into per-layer sections.
3. Failfast on unsafe changes: modifications to `.agents/`, CI workflows, or infra that require explicit human approval — flag and escalate rather than auto-approving.

## Phase 2: Checklist (priority order)

1. Safety & policy checks
   - Did the change touch `.agents/`, AGENTS.md, CLAUDE.md, GEMINI.md, or other agent instruction files? If yes, flag as high-severity and require human sign-off.
   - Secrets: search for likely secrets (env var values, keys, tokens). If found, mark immediate blocker.
2. Build & scripts
   - Do `package.json` scripts for the affected workspace still exist and make sense? If a new dependency was added, ensure scripts or build steps reflect it.
   - Confirm `npm run build` still succeeds conceptually; run `npm run build` for the affected workspace(s) and report errors.
3. Type safety & lint
   - Validate behavior with minimal manual checks or small reproducible examples.
   - Check TypeScript type errors (tsc/build or `npm run build`). Distinguish between type errors and runtime logic failures.
   - Check ESLint issues in `client-side-ts/` and note new violations. If the change intentionally adds `any` or disables rules, require justification in PR body.
4. API & contracts
   - For backend changes (routes/controllers/models): verify request/response shapes, status codes, and backward-compatibility for public API endpoints (look for `/api` or `/api/v2` routes in server-side/src/routes).
   - If the change affects a contract used by frontend, ensure corresponding frontend adjustments or that the change is backward-compatible.
5. Architecture & boundaries
   - Ensure code follows the project’s module boundaries: controllers thin, business logic in services, and utilities in `server-side/src/util/`.
   - Frontend changes should live in `client-side-ts/src/features/` and reuse shared components; avoid duplicating logic across features.
6. Performance, security, and resource usage
   - Look for potentially expensive operations in loops, DB queries, or unbounded memory usage. For DB queries, check presence of pagination/limits when applicable.
7. Documentation and changelog
   - If the change affects developer-facing behavior (scripts, public API, setup), ensure README, AGENTS.md, or docs/ were updated accordingly.
8. Commit hygiene
   - Ensure commits are small and focused, include meaningful messages, and include the Co-authored-by trailer when changes are made by agents (project rule).

## Phase 3: Generate Report

- Suggestion: pass a custom title using the code-review slug. Example:
  `node .agents/skills/code-review/scripts/generate_code_review_report.js --author "Automated Reviewer" --summary "Short summary" --title "psits-code-review-2026-05-30"`
- The code review's slug e.g. frontend-design-review must be turned into a human-readable title and assigned as --title flag e.g. "Frontend Design Review".

Severity levels and guidance

- Blocker: secrets, agent-instruction edits, breaking public API without migration notes, failing CI/build on main workflows.
- High: build failures, type errors, missing environment variable documentation for integration checks, major security issues.
- Medium: lint violations, missing edge-case validation, missing doc updates for developer tools.
- Low: style inconsistencies, minor refactors without additional validation, suggestions for naming improvements.

Output format (required)

- The reviewer must produce a markdown summary containing:
  1. Headline verdict: Accept / Accept with minor changes / Request changes / Block
  2. One-line summary sentence explaining the verdict
  3. Checklist table (workspace, check, status, notes)
  4. Top 3 actionable items (file + line + suggested fix summary)
  5. Repro steps for any failing checks (commands and working dir)
  6. Links/paths to logs and full build outputs

Example checklist table

| Workspace      | Check | Status | Notes                                              |
| -------------- | ----- | -----: | -------------------------------------------------- |
| client-side-ts | build |   Pass | -                                                  |
| client-side-ts | lint  |   Fail | `src/features/auth/LoginForm.tsx: no-explicit-any` |

Suggested reviewer behavior

- Be explicit: point to exact files and lines using repo-relative paths.
- Prefer minimal, reversible suggestions (small patches or single-line edits) rather than large refactors in a code review.
- When recommending fixes that change behavior (DB queries, auth flows), require a minimal verification plan or reproducible example demonstrating the new behavior.
- If proposing code edits, include the exact patch or a suggested snippet and mark it as "suggested"; do not apply without PR-level consensus.

Warnings & agent constraints

- Do not modify `.agents/rules/` or CLAUDE/GEMINI/AGENTS.md without an explicit user instruction and human approval.
- Do not run destructive commands or attempt to change CI configuration without explicit permission.

When to propose a patch

- If the change is small, local, and low-risk (typo, one-line lint fix, missing import), generate a suggested patch and include it in the review.
- For anything affecting architecture, agent behavior, secrets, or public APIs, propose a PR comment and request human intervention.

Integration with project workflows

- Use `client-side-ts` build/lint commands and `server-side` build commands as canonical checks.
- If CI badges or workflows are present, reference failing job names and link to logs when available (e.g., `.github/workflows/client-side-pipeline.yml`).

Edge cases & conservative behavior

- When conventions are not explicitly documented in `.agents/rules/` or AGENTS.md, do not invent rules — surface the ambiguity as a documentation task.
- If multiple equally valid approaches exist, prefer the one consistent with nearby code and prior commits on the repository.

Minimal invocation examples

- Review a single file:
  - `skill: code-review --path=client-side-ts/src/features/auth/LoginForm.tsx`
- Review a git diff (unified diff text is accepted)
- Review a PR: provide PR number or branch and the skill will fetch changed files (requires permissions)

Notes for future maintainers

- Keep this skill conservative: it should encode only repository-observed conventions. If the repo adopts new conventions, update this skill accordingly.
- If docs or coding rules change, update AGENTS.md and reflect changes here promptly.

Caveat (when docs are sparse)

> The repository documents many conventions in `.agents/rules/` and AGENTS.md. If contradictions are found between files (e.g., differing quality goals), this skill will prefer explicit rules in `.agents/rules/` and flag contradictions for human review.

Notes:

- The scripts assume the repository layout is unchanged (templates in `docs/templates` and reports in `docs/code-review-reports`).
- If you move the template or reports folder, update the script paths accordingly.
