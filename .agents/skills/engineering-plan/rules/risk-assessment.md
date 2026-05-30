---
title: Risk Assessment
purpose: Evaluate risk + estimate effort
---

# Risk Assessment

## Risk Levels

**Low** — Isolated, well-understood, easy rollback, no critical paths

**Medium** — Multiple files, some integration, non-critical

**High** — Critical systems, complex deps, hard rollback, affects auth/payments/data

## Risk Factors

1. **Complexity** — Files affected? Logic intricate? Edge cases?
2. **Blast radius** — What breaks? Users affected? Auto-recover?
3. **Critical path** — Auth/payments/data = high. User features = medium. Internal = low.
4. **Rollback** — Easy revert? DB migrations? Data loss?

## Effort Estimation

Total = Impl + Validation + Review + Integration

Be honest, not optimistic.

| Complexity   | Range | Example                          |
| ------------ | ----- | -------------------------------- |
| Simple       | 1-3h  | Utility fn, basic component      |
| Moderate     | 4-8h  | API endpoint + frontend          |
| Complex      | 8-16h | Multi-integration feature        |
| Very Complex | 16h+  | Major refactor, schema migration |

### When Uncertain

Use: `"unknown — needs spike"`

Flag as open question.

**Example:**

```
Phase 2 — DB Migration
Effort: unknown — needs spike
Question: How many records? Data volume?
```

## Combine Risk + Effort

**High risk + High effort** — Break into smaller phases, multiple review checkpoints

**High risk + Low effort** — Still needs careful review

**Low risk + High effort** — Can be agent-safe if understood, focus on maintainability

**Low risk + Low effort** — Good for autonomous execution

## Example

Task: Add JWT refresh

```
Phase 1 — Update Token Models
Risk: Medium (affects auth but additive)
Effort: 3h

Phase 2 — Implement Refresh Endpoint
Risk: High (core auth, security)
Effort: 6h

Phase 3 — Update Frontend Auth
Risk: Medium (client-side, easier rollback)
Effort: 4h

Phase 4 — Migration
Risk: High (depends on session count)
Effort: unknown — needs spike
```

## Red Flags (Always High Risk)

- Delete data
- Modify shared DB schemas
- Change auth/authz logic
- Breaking API changes
- Prod config changes
- Touch `client-side/` (legacy)
- Direct DB ops without ORM
- Disable security checks

Always require human review.
