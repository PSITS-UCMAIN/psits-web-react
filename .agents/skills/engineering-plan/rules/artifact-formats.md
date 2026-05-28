---
title: Artifact Formats
purpose: Exact output structures
---

# Artifact Formats

Always produce 2 files + use `update_todo_list` tool.

## File Naming

**MD Plan:** `.agents/plan/<3-digit-index>-<slug>.plan.md`
**Docs:** `docs/plans/<slug>.md`

Index auto-increment (001, 002, 003...).

## Markdown Plan

```markdown
---
title: <task title>
created: <ISO 8601 date>
status: draft | approved | in-progress | complete
risk: low | medium | high
---

## Goal

One paragraph. What + why.

## Out of Scope

- Item 1
- Item 2

## Phases

### Phase 1 — <Name>

**Risk:** low | medium | high
**Effort:** <hours or points>
**Agent-safe:** yes | no (reason)

- Step 1: Action
- Step 2: Action

> **Dependency:** What must be true first

### Phase 2 — <Name>

...

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
| ---- | ---------- | ------ | ---------- |
| ... | ... | ... | ... |

## Open Questions

- [ ] Question needing answer
```

## Docs Summary

```markdown
---
title: <task title>
planned: <ISO date>
planned_by: <name or "agent">
status: draft | approved | in-progress | complete
---

## What Was Planned

2-3 sentences. Task + approach + outcome.

## Key Decisions

- **Decision** — Reasoning

## Phases at a Glance

| Phase | Effort | Risk | Agent-safe |
| ----- | ------ | ---- | ---------- |
| ... | ... | ... | ... |

## What Was Explicitly Left Out

- Item — Why deferred/descoped

## Risks to Watch

Top 1-2 risks, plain language.

## Artifact Locations

- Plan (MD): `.agents/plan/<index>-<slug>.plan.md`
```

## Agent Checklist

Use `update_todo_list` tool to create task checklist:

```
[x] Phase 1 — Name (completed)
[-] Phase 2 — Name (in progress)
[ ] Phase 3 — Name (pending)
```

## Status Values

`draft` | `approved` | `in-progress` | `complete`

## Risk Values

`low` | `medium` | `high`