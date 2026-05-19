---
name: code-review
description: Project-specific code review skill. Performs high-signal reviews that follow this repository's conventions, architecture boundaries, testing expectations, and release quality bar.
user-invocable: true
---

# Code Review Skill for psits-web-react

Purpose
- Provide a reproducible, project-aware code review checklist and output format for agents and human reviewers. This skill encodes what matters in this repository (frontend split, TypeScript strictness, testing expectations, and agent safety rules) and prescribes a prioritized review order.
- Route reviews to appropriate subagents based on task complexity: simple reviews stay local; complex multi-file reviews delegate to `code-review` agent for high-signal analysis.

Design principles (grounded in repo)
- Active frontend is `client-side-ts/`. New UI work must live there; `client-side/` is legacy and only reviewed for migration or explicit legacy fixes.
- TypeScript strictness and linting are enforced in the active client (`client-side-ts/`) and build-time checks are required for server-side (`server-side/`). Treat missing lint/build scripts as a documentation/infrastructure issue, not an immediate code failure.
- Tests: server-side and client-side-ts use Vitest. The project expects tests-first where feasible and 80%+ coverage for release-critical modules (tdd-guide and plans). Always inspect tests and coverage metadata when present.
- Agent behavior: do not edit `.agents/rules/` without explicit instruction. Preserve project agent rules and follow AGENTS.md guidance.

Who should use this skill
- Senior reviewer agents that must produce a concise review report for PRs, diffs, or file-level reviews. Invokable with a path, a diff, or a PR/commit reference.
- Automatically routes complex, multi-file reviews to the dedicated `code-review` agent for deep analysis.

Invocation inputs
- Required (one of): file path(s) relative to repo root, unified diff text, or a PR/commit range.
- Optional flags: `--run-tests` (attempt to run relevant tests locally), `--propose-fixes` (generate suggested patches but do not apply), `--strict` (raise severity threshold for release-critical modules).

## Subagent Routing Logic

**Route to `code-review` agent (independent agent invocation) if:**
- Reviewing 5+ files across multiple layers (backend + frontend + docs)
- Reviewing a PR with mixed architectural concerns (API changes + UI + infrastructure)
- Flags indicate safety concerns (agent instructions, secrets, breaking changes)
- User explicitly requests `--deep-review` mode

**Handle locally (inline) if:**
- Single file review
- Simple workspace review (one workspace only)
- Focused module or feature review
- Quick lint/build validation pass

## Local Phase 1: Understand scope
1. Map changed files and infer scope: backend, active frontend, legacy frontend, docs, or infra.
2. If files touch multiple layers (e.g., routes + UI), split the review into per-layer sections.
3. Failfast on unsafe changes: modifications to `.agents/`, CI workflows, or infra that require explicit human approval — flag and escalate rather than auto-approving.

## Local Phase 2: Checklist (priority order)
1. Safety & policy checks
   - Did the change touch `.agents/`, AGENTS.md, CLAUDE.md, GEMINI.md, or other agent instruction files? If yes, flag as high-severity and require human sign-off.
   - Secrets: search for likely secrets (env var values, keys, tokens). If found, mark immediate blocker.
2. Build & scripts
   - Do `package.json` scripts for the affected workspace still exist and make sense? If a new dependency was added, ensure scripts or build steps reflect it.
   - Confirm `npm run build` still succeeds conceptually; if `--run-tests` was provided, run `npm run build` for the affected workspace(s) and report errors.
3. Tests & coverage
   - If tests exist for affected modules, list affected test files and whether they were updated.
   - If `--run-tests`, run the specific module tests (use `npm run test:module` when available) and capture first failing test and one-line failure summary.
   - Report coverage changes if coverage files or summaries exist. For release-critical changes, require 80%+ or flag.
4. Type safety & lint
   - Check TypeScript type errors (tsc/build or `npm run build`). Distinguish between type errors and runtime logic failures.
   - Check ESLint issues in `client-side-ts/` and note new violations. If the change intentionally adds `any` or disables rules, require justification in PR body.
5. API & contracts
   - For backend changes (routes/controllers/models): verify request/response shapes, status codes, and backward-compatibility for public API endpoints (look for `/api` or `/api/v2` routes in server-side/src/routes).
   - If the change affects a contract used by frontend, ensure corresponding frontend adjustments or that the change is backward-compatible.
6. Architecture & boundaries
   - Ensure code follows the project’s module boundaries: controllers thin, business logic in services, and utilities in `server-side/src/util/`.
   - Frontend changes should live in `client-side-ts/src/features/` and reuse shared components; avoid duplicating logic across features.
7. Tests for edge cases
   - Confirm new code includes tests for null/undefined, empty inputs, invalid types, and error paths where applicable (the TDD guide prescribes these edge cases).
8. Performance, security, and resource usage
   - Look for potentially expensive operations in loops, DB queries, or unbounded memory usage. For DB queries, check presence of pagination/limits when applicable.
9. Documentation and changelog
   - If the change affects developer-facing behavior (scripts, public API, setup), ensure README, AGENTS.md, or docs/ were updated accordingly.
10. Commit hygiene
   - Ensure commits are small and focused, include meaningful messages, and include the Co-authored-by trailer when changes are made by agents (project rule).

Severity levels and guidance
- Blocker: secrets, agent-instruction edits, breaking public API without migration notes, failing CI/build on main workflows.
- High: failing tests in affected module, type errors, missing environment variable documentation for integration tests, major security issues.
- Medium: lint violations, missing edge-case tests, missing doc updates for developer tools.
- Low: style inconsistencies, minor refactors without tests, suggestions for naming improvements.

Output format (required)
- The reviewer must produce a markdown summary containing:
  1. Headline verdict: Accept / Accept with minor changes / Request changes / Block
  2. One-line summary sentence explaining the verdict
  3. Checklist table (workspace, check, status, notes)
  4. Top 3 actionable items (file + line + suggested fix summary)
  5. Repro steps for any failing checks (commands and working dir)
  6. Links/paths to logs, coverage, and full test outputs

Example checklist table

| Workspace | Check | Status | Notes |
| --- | --- | ---: | --- |
| client-side-ts | build | Pass | - |
| client-side-ts | lint | Fail | `src/features/auth/LoginForm.tsx: no-explicit-any` |
| server-side | tests | Pass | 12/12 |

Suggested reviewer behavior
- Be explicit: point to exact files and lines using repo-relative paths.
- Prefer minimal, reversible suggestions (small patches or single-line edits) rather than large refactors in a code review.
- When recommending fixes that change behavior (DB queries, auth flows), require tests that demonstrate the new behavior.
- If proposing code edits, include the exact patch or a suggested snippet and mark it as "suggested"; do not apply without PR-level consensus.

Warnings & agent constraints
- Do not modify `.agents/rules/` or CLAUDE/GEMINI/AGENTS.md without an explicit user instruction and human approval.
- Do not run destructive commands or attempt to change CI configuration without explicit permission.
- If `--run-tests` is used, do not auto-install dependencies; report missing deps and ask the user to run `npm install` or grant permission.

When to propose a patch
- If the change is small, local, and low-risk (typo, one-line lint fix, missing import), generate a suggested patch and include it in the review.
- For anything affecting architecture, agent behavior, secrets, or public APIs, propose a PR comment and request human intervention.

Integration with project workflows
- Use `client-side-ts` build/lint commands and `server-side` build/test commands as canonical checks.
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
> The repository documents many conventions in `.agents/rules/` and AGENTS.md. If contradictions are found between files (e.g., differing coverage goals), this skill will prefer explicit rules in `.agents/rules/` and flag contradictions for human review.

