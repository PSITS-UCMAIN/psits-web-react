---
name: engineering-plan
description: Create structured engineering plans. Produces MD plan and docs summary.
---

# Engineering Plan Skill

Create executable plans for features/refactors/migrations.

## Rules

- **[persona.md](./rules/persona.md)** — Role, mindset
- **[input-validation.md](./rules/input-validation.md)** — Input reqs, when ask
- **[codebase-analysis.md](./rules/codebase-analysis.md)** — Code inspection
- **[phase-structuring.md](./rules/phase-structuring.md)** — Break into phases
- **[risk-assessment.md](./rules/risk-assessment.md)** — Risk + effort
- **[agent-safety.md](./rules/agent-safety.md)** — Safe for agents?
- **[artifact-formats.md](./rules/artifact-formats.md)** — Output formats
- **[guardrails.md](./rules/guardrails.md)** — Hard constraints

## Inputs

Natural language task | GitHub issue | bullet points

## Outputs

Always 2 files:

| File | Purpose | Audience |
|------|---------|----------|
| `.agents/plan/<index>-<slug>.plan.md` | Full plan | Human |
| `docs/plans/<slug>.md` | Summary | Future ref |

Use `update_todo_list` tool to create task checklist for agents.

## Workflow

1. **Clarify** — Goal? Constraints? Scope?
2. **Analyze** — Read code, map deps
3. **Structure** — Phases + deps
4. **Assess** — Risk + effort
5. **Mark** — Agent-safe?
6. **Generate** — 2 artifacts (MD + docs)
7. **Create checklist** — Use `update_todo_list` tool

## Key Rules

- No plan without clear goal
- No unsafe ops marked safe
- No invented estimates (use "unknown — needs spike")
- No overwrite approved/in-progress plans
- Docs summary mandatory

## Tools

`read_file` | `list_code_definition_names` | `search_files` | `.agents/rules/`

## Output

```
✅ Plan created: <title>
   .agents/plan/<index>-<slug>.plan.md
   docs/plans/<slug>.md

⚠️  Open questions:
   - <question>

🤖  Agent-safe: Phase 1, 3
👤  Review needed: Phase 2 (reason)

📋 Checklist created via update_todo_list
