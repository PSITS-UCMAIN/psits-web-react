---
title: Overview
last_updated: 2026-05-16
generated_by: agent
---

## What This Project Is

PSITS Web is a full-stack web platform for the Philippine Society of Information Technology Students at the University of Cebu Main Campus. The README and route names show a product focused on student membership, event management, attendance tracking, merchandise ordering, documentation, and admin operations.

## Intended Users

| User group         | What they use it for                                                                  |
| ------------------ | ------------------------------------------------------------------------------------- |
| Students           | Events, attendance, orders, membership-related flows, account settings                |
| Admins             | Event management, student/admin management, merchandise, refunds, logs, documentation |
| Organization staff | Membership handling, reports, role management, event operations                       |

## Current Status

| Area            | Status                                                                                |
| --------------- | ------------------------------------------------------------------------------------- |
| Active frontend | `client-side-ts/` is the canonical frontend and is under active development           |
| Legacy frontend | `client-side/` remains in the repository for migration context and fallback reference |
| Server          | Express + TypeScript API is active and mounts both legacy and v2 route sets           |
| Docs            | Human-facing docs exist and this scaffold adds agent-focused docs beside them         |

## Product Scope

- Merchandise browsing, cart, checkout, and order management.
- Event browsing, attendance, raffle operations, and event statistics.
- Student profile, membership requests, and account settings.
- Admin dashboards, logs, documentation management, and role operations.

## Notes

- The current frontend migration is still in progress, so the repository contains both JS and TS client code.
- New work should target the TS client unless the task explicitly says otherwise.
