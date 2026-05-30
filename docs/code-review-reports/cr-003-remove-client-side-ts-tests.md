---
doc_id: CR-003
title: cr-003-remove-client-side-ts-tests
doc_title: cr-003-remove-client-side-ts-tests
version: 1.0.0
status: draft
created: 2026-05-30
updated: 2026-05-30
author: Automated Reviewer
reviewers: none
tags: code-review,report,tests,maintenance
changelog: |
  - version: 1.0.0
    date: 2026-05-30
    author: Automated Reviewer
    note: Generated and populated with test-removal recommendations
---

# Code Review Report

> Recommend removing `client-side-ts` unit tests and test helpers (see rationale below)

## Summary

- **Scope:** `client-side`, `client-side-ts`, `server-side` — focused on test artifacts and test helpers
- **Reviewed by:** Automated Reviewer
- **Date:** 2026-05-30
- **Overall verdict:** Request changes — remove obsolete test files and helpers after team confirmation

## Context & Scope

- I scanned the three workspaces for tests and test helpers. Tests were found only under `client-side-ts` and supporting test helpers under `client-side-ts/src/test` (MSW). No active tests were found in `client-side` or `server-side` (server `vitest.config.ts` exists but no `tests/` folder detected).

## Files Reviewed (relevant)

- `client-side-ts` tests (candidates for removal):
  - [client-side-ts/src/pages/CertificatesPage.test.tsx](client-side-ts/src/pages/CertificatesPage.test.tsx#L1)
  - [client-side-ts/src/features/certificates/components/GenerateCertificateButton.test.tsx](client-side-ts/src/features/certificates/components/GenerateCertificateButton.test.tsx#L1)
  - [client-side-ts/src/features/certificates/components/CertificateEventList.test.tsx](client-side-ts/src/features/certificates/components/CertificateEventList.test.tsx#L1)
  - [client-side-ts/src/features/certificates/api/certificateApi.test.ts](client-side-ts/src/features/certificates/api/certificateApi.test.ts#L1)
  - [client-side-ts/src/features/auth/api/auth.api.test.ts](client-side-ts/src/features/auth/api/auth.api.test.ts#L1)
  - [client-side-ts/src/features/auth/components/LoginForm.test.tsx](client-side-ts/src/features/auth/components/LoginForm.test.tsx#L1)

- Test helpers / MSW setup:
  - [client-side-ts/src/test/setup.ts](client-side-ts/src/test/setup.ts#L1)
  - [client-side-ts/src/test/msw/server.ts](client-side-ts/src/test/msw/server.ts#L1)
  - [client-side-ts/src/test/msw/handlers.ts](client-side-ts/src/test/msw/handlers.ts#L1)
