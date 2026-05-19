# Test Infrastructure Guide

Purpose
- Document how test infrastructure is organized for this repository and provide clear, copy-pasteable instructions to run tests locally and in CI.

Scope
- Workspaces: `client-side-ts/` (active frontend), `client-side/` (legacy frontend), `server-side/` (backend).
- Layers: unit, integration, component/API (React), contract, and optional coverage.

Quick summary
- `server-side/` contains test scripts and TypeScript build checks; run server tests with `cd server-side && npm run test` and build with `npm run build`.
- `client-side-ts/` is the active frontend; its package.json defines test and lint scripts (see below). The legacy `client-side/` appears to be missing a test script — this is a documented gap.

How tests are organized
- server-side: API integration, service/unit tests, and build-time TypeScript checks.
- client-side-ts: component and integration tests (React Testing Library + MSW) where present, plus test/coverage scripts.
- client-side (legacy): no tests detected in package.json — plan to add at least a smoke test or migrate relevant tests to `client-side-ts/`.

Commands (copyable)
- Run full backend tests:
  - cd server-side && npm run test
- Run backend build/type check:
  - cd server-side && npm run build
- Run full frontend tests (active client):
  - cd client-side-ts && npm run test
- Run frontend build:
  - cd client-side-ts && npm run build
- Optional coverage (if supported):
  - cd server-side && npm run test:coverage
  - cd client-side-ts && npm run test:coverage

CI & Artifacts
- Tests should emit structured logs and coverage artifacts into `server-side/coverage/` and `client-side-ts/coverage/` when coverage is run.
- Store test logs and coverage HTML artifacts in CI job artifacts for debugging (paths above).

Test DB & Environment
- Backend integration tests may require a MongoDB instance and seeded data. Recommended local approach:
  - Use a local MongoDB (docker image) or a test container.
  - Seed test data via `server-side/src/test/seed` script (if present) or run a dedicated seed script.
  - Use environment file: create `.env.test` and set DB URI and any required API keys.

Known gaps & immediate findings
- Legacy frontend `client-side/` package.json: no test script detected. This repository currently treats `client-side-ts/` as the canonical active frontend — add tests to `client-side/` only if maintaining legacy app is required.
- Ensure both `client-side-ts/package.json` and `server-side/package.json` expose `test` and `test:coverage` scripts. If missing, add them in a follow-up PR.

Recommendations & Rollout steps (prioritized)
1. Add minimal test script to `client-side/` that runs a smoke test or a simple lint/build to prevent regressions.
2. Ensure CI has separate jobs for `server-side` and `client-side-ts` tests and uploads coverage and log artifacts.
3. Add a `docs/test-run-template.md` (example CI job) showing how to run tests, collect artifacts, and fail-fast on infra errors.
4. Standardize coverage threshold: require 80%+ branches/functions/lines/statements for release-critical modules.
5. Add a `test:ci` script in each workspace that runs tests in non-interactive mode and outputs JSON/junit reports for CI.

References
- Baseline rollout plan: `docs/plans/full-tests-baseline-rollout.md`
- Package manifests:
  - `client-side-ts/package.json`
  - `client-side/package.json`
  - `server-side/package.json`

Notes
- This guide intentionally avoids prescribing new tooling; it documents the current layout and actionable next steps.
- If you want, the doc-updater agent can create the recommended `test:ci` scripts and a CI job example in `.github/workflows/` as a follow-up.

