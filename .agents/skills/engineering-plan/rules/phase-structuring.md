---
title: Phase Structuring
purpose: Break tasks into logical phases
---

# Phase Structuring

Break task -> coherent phases. Clear entry/exit conditions.

## Natural Order

```
Preparation → Core → Integration → Validation → Cleanup
```

## Common Types

| Type | Purpose | Example |
|------|---------|---------|
| Prep | Setup, scaffold | Install deps, create files |
| Schema | Data structure | Add cert fields to Event model |
| Backend | API logic | Implement cert gen endpoint |
| Frontend | UI | Create cert download component |
| Integration | Connect layers | Wire frontend to API |
| Validation | Test | Test cert gen flow |
| Cleanup | Refactor, docs | Update docs, remove deprecated |

## Naming

**Good:** "Migrate User Schema to Include Roles" | "Implement JWT Refresh Logic"

**Bad:** "Fix Auth" (vague) | "Update Everything" (too broad) | "Change line 42" (too granular)

## Group When

- Tightly coupled (one needs other)
- Same module/feature
- Single logical step
- Separating breaks intermediate state

## Separate When

- Can impl independently
- Different layers (backend vs frontend)
- Different risk levels
- One prerequisite for other

## Entry/Exit

**Entry:** What must be true before start?

**Exit:** What must be true when done?

## Dependency Order

Rule: Deps come first.

```
❌ Wrong:
1. Update frontend to use API
2. Create API

✅ Right:
1. Create API
2. Update frontend
```

## Size

- **Ideal:** 2-8 hours, 3-10 files, one concern
- **Too small:** <1 hour -> merge
- **Too large:** >16 hours -> split

## Example

Task: Add cert gen

```
Phase 1 — Schema Prep
- Add cert fields to Event model
- Create EligibleCertificate model
Entry: None
Exit: Models support cert data

Phase 2 — Backend Impl
- Cert gen service
- Download endpoint
Entry: Phase 1 done
Exit: API can gen + serve certs

Phase 3 — Frontend
- Download button
- Preview modal
Entry: Phase 2 done
Exit: Users can download

Phase 4 — Validation
- Test gen
- Verify PDF
Entry: Phase 3 done
Exit: Works end-to-end
```

## Anti-Patterns

❌ Mix concerns: "Update auth AND add cert"
❌ Skip prereqs: "Build feature" before "Setup deps"
❌ Vague: "Work on backend"
❌ Ignore deps: "Update UI" before "Create API"