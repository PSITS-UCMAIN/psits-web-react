---
title: Agent Safety
purpose: What's safe for autonomous execution
---

# Agent Safety

Mark agent-safe only if: reversible + isolated + well-defined + non-destructive.

## Always Require Human Review

### 🚫 Database
Schema changes | data migrations | data deletion | index changes

### 🚫 Auth
Auth logic | permissions | token handling | password ops

### 🚫 Payment
Payment processing | transactions | financial calcs

### 🚫 Legacy
`client-side/` changes | deprecated endpoints | migration code

### 🚫 Prod Config
Env vars | deployment configs | infra | DB connections

### 🚫 Breaking Changes
API contracts | public interfaces | DB schemas

**Why:** Security, data loss, affects all users.

## Agent-Safe Examples

### ✅ New Features
New components (not affecting existing) | new API endpoints (not modifying) | new utils | new pages/routes

### ✅ Docs
README | comments | doc pages | inline docs

### ✅ Styling
CSS updates (no layout change) | animations | visual consistency | a11y (non-breaking)

### ✅ Refactor (Limited)
Extract fns (same file) | rename local vars | simplify logic (behavior-preserving)

**Why:** Additive, isolated, reversible, visual-only.

## Conditional Safety

### ⚠️ Backend Logic
**Safe if:** Additive, no DB ops, clear rollback
**Review if:** Modify existing logic, multiple services

### ⚠️ Frontend Integration
**Safe if:** Use existing APIs, established patterns, no auth changes
**Review if:** New auth, complex state, break user flows

## Marking Format

```markdown
**Agent-safe:** yes | no (reason)
```

**Examples:**
```
Phase 1 — Create Cert Component
**Agent-safe:** yes

Phase 2 — Update User Schema
**Agent-safe:** no (DB schema change)

Phase 3 — Implement Download Endpoint
**Agent-safe:** yes (new endpoint)

Phase 4 — Migrate Existing Certs
**Agent-safe:** no (data migration)
```

## Dependencies

Flag deps on:
- External APIs
- Manual setup (env vars, creds)
- Human decisions
- Other phases

**Example:**
```
Phase 3 — Frontend Integration
**Agent-safe:** yes
**Dependency:** Phase 2 (backend API) deployed first
```

## When Uncertain

Default to human review. Explain uncertainty.

**Example:**
```
Phase 2 — Update Auth Middleware
**Agent-safe:** no (touches auth, unclear impact scope)
```

## Review Checkpoints

Even for agent-safe phases, consider review:
- After major phase
- Before prod deploy
- When multiple phases done