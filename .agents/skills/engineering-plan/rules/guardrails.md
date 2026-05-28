---
title: Guardrails
purpose: Hard constraints, never violate
---

# Guardrails

Non-negotiable rules.

## 1. No Plan Without Clear Goal

**Rule:** Ambiguous end state -> stop + ask.

**Why:** Wrong plan worse than no plan.

**Do:** Ask focused question. Explain what missing. Offer interpretations.

**Example:**
```
❌ Assume "improve auth" = JWT
✅ Ask "Does 'improve auth' mean JWT, OAuth, or other?"
```

## 2. Never Mark Unsafe Ops as Agent-Safe

**Rule:** Never mark agent-safe if involves:
- Delete data
- Modify shared DB schemas
- Change auth/authz logic
- Touch `client-side/` (legacy)
- Breaking API changes
- Prod config changes

**Why:** High risk of data loss, security issues, break prod.

**Do:** Mark `agent-safe: no` with reason.

**Example:**
```markdown
Phase 2 — Update User Schema
**Agent-safe:** no (DB schema change, affects all users)
```

## 3. Never Invent Estimates

**Rule:** Can't estimate -> write `"unknown — needs spike"` + flag as open question.

**Why:** False confidence -> missed deadlines, poor planning.

**Do:** Be honest. Flag needing investigation. Explain what info needed.

**Example:**
```markdown
Phase 3 — Data Migration
**Effort:** unknown — needs spike
**Question:** How many records? Data volume?
```

## 4. Never Overwrite Approved Plans

**Rule:** Before overwrite, check `status`. If `approved` or `in-progress` -> stop + ask.

**Why:** Disrupt ongoing work, lose context.

**Do:**
1. Read existing plan
2. Check `status` in frontmatter
3. If `approved`/`in-progress` -> ask user
4. If `draft`/`complete` -> safe to overwrite with confirm

**Example:**
```
Existing: .agents/plan/001-auth-refactor.plan.md
Status: in-progress

Can't overwrite. Options:
1. New plan (different slug)
2. Update existing (needs confirm)
3. Cancel
```

## 5. Docs Entry Mandatory

**Rule:** Always create `docs/plans/<slug>.md`, even for "quick plan".

**Why:** Permanent record for future devs.

**Do:** Always produce 2 artifacts (MD + docs) + use `update_todo_list` tool. Never skip docs.

## 6. Keep Docs Summary One Page

**Rule:** If `docs/plans/<slug>.md` > 1 page -> duplicating plan, not summarizing.

**Why:** Summary should be scannable, not copy of full plan.

**Do:** Focus on key decisions + rationale. Use tables. Keep "What Was Planned" to 2-3 sentences. List only top 1-2 risks.

## 7. Never Skip Dependency Analysis

**Rule:** Always identify + document phase deps. Never assume any order OK.

**Why:** Wrong sequence -> broken intermediate states, wasted effort.

**Do:** State what must be true before each phase. Use `> **Dependency:**` in MD.

**Example:**
```markdown
Phase 3 — Frontend Integration
> **Dependency:** Phase 2 (backend API) deployed + accessible
```

## 8. Never Mix Concerns in One Phase

**Rule:** Each phase = one coherent unit. Don't bundle unrelated changes.

**Why:** Mixed concerns harder to review, rollback.

**Do:** Split by layer (backend vs frontend), concern (auth vs payments), risk level.

**Example:**
```
❌ "Phase 1 — Update Auth AND Add Cert"
✅ "Phase 1 — Update Auth"
   "Phase 2 — Add Cert"
```

## 9. Never Ignore External Deps

**Rule:** Phase depends on external factors (APIs, services, creds, manual setup) -> flag explicitly.

**Why:** External deps can block impl, need addressed upfront.

**Do:** List in phase description. Flag as open question if setup unclear. Note if manual intervention needed.

**Example:**
```markdown
Phase 2 — Integrate Payment Gateway
**Dependency:** Stripe API keys in env
**Question:** Have Stripe account creds?
```

## 10. Never Plan Before Understanding Current State

**Rule:** Always inspect codebase before plan. Never plan on assumptions.

**Why:** Plans on wrong assumptions waste time, cause rework.

**Do:** Use `read_file`, `list_code_definition_names`, `search_files`. Reference `.agents/rules/`. Plan based on actual current state.

**Example:**
```
Before auth refactor:
1. Read auth controller
2. Check auth middleware
3. Review user model
4. Search JWT usage
Then plan from actual state
```

## Enforcement

Violate guardrail -> immediate stop + explain which + why + ask for clarification.

Don't create plans that violate guardrails.