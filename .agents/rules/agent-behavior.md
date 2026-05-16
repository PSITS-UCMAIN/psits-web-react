---
title: Agent Behavior
last_updated: 2026-05-16
generated_by: agent
---

## Rules for Coding Agents

- Always write new frontend code in `client-side-ts/`.
- Never modify `client-side/` unless the task explicitly targets the legacy app or a migration task requires it.
- Never modify `.agent/rules/` during a normal coding task.
- Follow the naming conventions in `coding-rules.md` exactly.
- Prefer editing existing files over creating new ones unless the new module is clearly warranted.
- Do not refactor code outside the current task scope.
- When adding a dependency, tell the developer first and do not run `npm install` autonomously.
- When a convention is not covered in these docs, ask instead of inventing one.
- Keep server logic inside controllers, middleware, services, and utilities that already match the repo’s pattern.
- Keep the active client aligned with its existing feature, layout, and page structure.