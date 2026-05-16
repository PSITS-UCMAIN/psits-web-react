---
title: Full Tests Baseline Rollout
last_updated: 2026-05-16
generated_by: agent
---

## Summary

Implemented a baseline testing foundation for both `server-side/` and `client-side-ts/` with Vitest, including scripts for full and module-scoped runs.

## What Was Added

- Backend test harness:
  - `server-side/src/app.ts` to decouple app creation from runtime startup
  - Vitest config and environment setup
  - in-memory MongoDB utilities for integration/contract tests
- Backend test categories:
  - API integration tests for auth v2 login flow
  - contract tests for auth v2 response shape and auth error shape
  - service/business logic unit tests for attendance service helpers
  - functional unit tests for event statistics computation
- Frontend test harness:
  - Vitest config with jsdom
  - React Testing Library setup
  - MSW server and handlers for auth endpoints
- Frontend test categories:
  - component test for login form submission behavior
  - API-layer auth tests with MSW-backed network mocks

## Flexibility Mode

Both workspaces now support `test:module` so users can run only targeted tests using path arguments.

## Follow-Up Needed

- Install new dev dependencies in both workspaces before executing tests.
- Expand module coverage incrementally by adding tests under each feature/domain path.
