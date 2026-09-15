# AGENTS.md

## Project Structure & Module Organization

This repository is split into two main apps/modules:

- `client-side-ts/`: React 19 + TypeScript + Vite frontend (the only frontend). Main entry points include `src/main.tsx`, `src/App.tsx`, and `src/router.tsx`. Static assets live in `src/assets/` and `public/`.
- `server-side/`: Express + TypeScript API. API endpoints and request handling live under `src/controllers/` and `src/routes/`, shared business logic commonly lives in `src/services/`, persistence models live in `src/models/`, middleware lives in `src/middlewares/`, and static/generated assets and templates live under `src/assets/`, `src/templates/`, and related mail/template folders.

Supporting documentation also exists in `docs/` and `server-side/docs/`.

Do not commit generated output from `client-side-ts/dist/`, `client-side-ts/node_modules/`, `server-side/dist/`, or `server-side/node_modules/`.

## Working Style

- Make minimal, high-confidence changes. Do not introduce large refactors unless explicitly requested.
- Preserve existing UI/UX unless the task clearly requires changes.
- Prioritize clarity, maintainability, and consistency with the current codebase over "clever" solutions.
- Follow existing patterns in both frontend and backend before introducing new approaches.
- Avoid unnecessary abstractions. Prefer simple, readable implementations that match current project style.
- When uncertain, inspect surrounding files and reuse existing patterns instead of guessing.
- Do not assume missing requirements; surface assumptions clearly in the final response.
- If the task is blocked by missing credentials, dashboard-only values, external service configuration, environment variables, secrets, third-party account access, local machine setup, or any other required manual step, do not invent code-based workarounds just to avoid asking.
- In those cases, explicitly stop and tell the user exactly what manual action is needed.
- Prefer the most practical path to completion, even when that means asking the user to retrieve or configure something manually.
- When requesting manual intervention, be specific:
  - explain what is needed
  - explain where to get it
  - explain why it is needed
  - give exact step-by-step instructions when helpful
- Do not replace a required manual setup step with speculative or impractical implementation changes.

## Architecture

### General

- Respect the separation between `client-side-ts/` and `server-side/`. Do not mix concerns.
- Prefer incremental, additive changes over rewriting existing logic.

### Frontend (React + Vite)

- Keep components focused and reusable.
- Do not introduce broad state management changes unless necessary.
- Follow the existing state management, routing, and API access patterns already present in the specific frontend you are editing.
- Avoid breaking component props/contracts.
- Keep UI logic separate from data-fetching logic where possible.
- Maintain TypeScript type safety in `client-side-ts`; avoid using keyword `any`.
- For shared API work, keep frontend request/response handling aligned with the backend's existing JSON structure.
- Have proper UI success and error handling using the notification/toast patterns already used in the app being changed.

### Backend (Express + TypeScript)

- Keep controllers thin; business logic should not live in controllers when an existing service/helper pattern already covers it.
- Place reusable logic in appropriate services, utilities, middleware, or model helpers rather than scattering it across routes/controllers.
- Follow existing Mongoose/model usage patterns for queries, relationships, hooks, and data shaping.
- Avoid breaking existing API contracts unless explicitly required.
- Ensure request validation, response payloads, and model shapes remain consistent.
- Be careful with query behavior and performance.
- Avoid n + 1 style data-fetching issues where repeated dependent queries can be consolidated.
- Have proper error handling and return consistent success and error JSON bodies based on existing backend conventions.
- Reuse existing middleware and helper patterns for auth, uploads, rate limits, and shared request handling instead of bypassing them with one-off logic.

### V2 & Service Layer Rules

- Controllers follow naming pattern: `*.v2.controller.ts` = active logic. Remaining non-v2 controllers are legacy but still serve endpoints used by `client-side-ts`; treat them as reference code — do not edit or delete unless explicitly requested.
- Routes are flat (no v2 suffix). V2 behavior determined by which controller a route imports and its mount path in `index.ts`.
- Services NEVER have v2 variants. All services live in `src/services/` without v2 naming. All controllers share the same service layer.
- ALWAYS check `src/services/` first before writing business logic. If a service exists for the domain (e.g., `refund.service.ts`), add logic there. If no service exists for the domain, CREATE one.
- When editing a `.v2.controller.ts`, you may reference non-v2 counterparts for shared logic patterns. Improve both if bugs found.
- Do NOT over-engineer. Keep changes minimal. Follow existing patterns exactly.

## Manual Intervention Rules

- Recognize when a task cannot be completed correctly without user action.
- Examples include:
  - retrieving connection strings, API keys, secrets, or project IDs from dashboards
  - configuring third-party services
  - updating local environment variables or machine-specific settings
  - running commands that require user-owned access, authentication, approvals, or devices
  - verifying behavior that depends on external systems not available to the agent

## Secrets and Sensitive Files

- Never read `.env`, `.env.*`, private keys, certificates, or credential files unless the user explicitly requests it.
- Never ask the user to paste API keys, passwords, tokens, or secrets into the conversation.
- Assume secrets already exist and reference them only by environment variable name (e.g., `process.env.OPENAI_API_KEY`).
- If a required secret is missing, instruct the user to add it manually rather than requesting its value.

- When such a blocker exists:
  1. Do not guess.
  2. Do not create workaround code unless the user explicitly asked for an alternative approach.
  3. Tell the user exactly what needs to be done manually.
  4. Keep the instructions concrete and minimal.
  5. Resume implementation only after the required manual dependency is satisfied.

- If partial progress is still possible, complete the safe code changes first, then clearly separate:
  - what was completed
  - what still requires manual action from the user

## File Reference Style

- Always reference files using repo-relative paths, not absolute local machine paths.
- Paths should start from the repository root.

Examples:

- Use: `client-side-ts/src/features/auth/components/LoginForm.tsx:42`
- Use: `server-side/src/controllers/eventV2.controller.ts:101`
- Do not use: `C:/Users/.../PsitsWeb/client-side-ts/src/...`

- If mentioning the repository root is useful for clarity, refer to it as `PsitsWeb` in prose, but do not prepend `PsitsWeb/` to every file path unless explicitly needed.
- Keep file references short, readable, and easy to scan.

## Safety

- Only modify files directly related to the task.
- Do not rename, move, or delete files unless explicitly required.
- Do not introduce breaking changes to APIs, schemas, or frontend contracts without clear instruction.
- Avoid touching authentication, critical business logic, or data models unless the task explicitly requires it.
- Do not introduce new dependencies unless necessary and justified.
- Prefer reversible changes (easy to rollback via Git).
- If a change has potential side effects, explicitly call it out.

## Validation

- Ensure logic correctness before focusing on optimization.
- Validate both success and failure cases where applicable.
- For backend:
  - Ensure endpoints handle edge cases such as nulls, invalid input, and empty results.
  - Ensure queries return expected data shapes.
- For frontend:
  - Ensure UI does not break existing layouts or flows.
  - Ensure data is correctly rendered and handled.
- Run the relevant checks for the module you changed when possible:
- `client-side-ts`: `npm run lint` and `npm run build`
- `server-side`: `npm run build`, and run `npm run dev` for manual endpoint verification when backend behavior changes
- If full validation cannot be executed, clearly state what was not verified.
- Prefer predictable, testable behavior over assumptions.

## Interaction Rules

- Do not assume every request is an implementation task.
- If the user is asking a question, giving feedback, requesting review, or asking for planning help, answer directly without pretending code changes were made.
- Only use implementation-oriented response structure when files or code were actually modified.
- Prefer the narrowest applicable behavior for the current request.

## Final Response

When actual code, configuration, or file changes are made, include:

1. **Summary of Changes**
   - What was implemented or modified and why.

2. **Files Changed**
   - List of files touched with brief description per file.

3. **How It Works**
   - Brief explanation of the implementation.

4. **Validation**
   - What was checked or verified.
   - What still needs manual testing (if any).

5. **Assumptions / Risks**
   - Any assumptions made due to missing context.
   - Any potential side effects or edge cases.

6. **Manual Steps Required** (only if applicable)
   - List any required user actions that the agent could not perform directly.
   - Provide exact, practical instructions.
   - Do not hide required manual intervention behind speculative workaround suggestions.

For non-implementation requests such as:

- answering questions
- explaining concepts
- reviewing architecture
- planning
- prompt/task structuring
- discussing options

do **not** force the implementation response format. Respond in the format most appropriate to the user's request.

Keep explanations concise, practical, and focused on helping the developer quickly verify and move forward.
Avoid unnecessary verbosity or theoretical explanations.

---

# OpenCode Agent Workspace Configuration

## External Instruction Loading

CRITICAL: The core operational guardrails, boundaries, and memory tracking systems for this workspace are managed inside the rules sub-directory. Always re-read these files whenever you experience token loss, context window loss or any related causes so that you can retain the state of the project immediately. The environment is configured to read instructions from the following tracking layers:

- Core Rules & Flag Guidelines: `.opencode/rules/.clinerules`
- Context Window & Boundaries: `.opencode/rules/system_instructions.md`

## Skill Execution Modes

The specialized operational personas are modularly isolated as native Agent Skills inside the skills folder. The system dynamically discovers and lazy-loads these skills on-demand when matching your single-letter command flags or direct task intents:

- **Orchestrator Mode (`-o`)**: `.opencode/skills/orchestrator/SKILL.md`
- **Planner Mode (`-p`)**: `.opencode/skills/planner/SKILL.md`
- **Coder Mode (`-c`)**: `.opencode/skills/coder/SKILL.md`
- **Debugger Mode (`-d`)**: `.opencode/skills/debugger/SKILL.md`
- **Ask Mode (`-a`)**: `.opencode/skills/ask/SKILL.md`
- **Security Analyst Mode (`-s`)**: `.opencode/skills/secure/SKILL.md`
- **Reviewer Mode (`-r`)**: `.opencode/skills/reviewer/SKILL.md`
- **Tester Mode (`-t`)**: `.opencode/skills/tester/SKILL.md`

## Memory File Locations

All persistent state tracking is centralized in two locations:

- **Configuration Rules**: `.opencode/rules/` — Core behavioral constraints and task tracker
- **Specialized Memory Logs**: `.opencode/memory/` — Error logs, codebase maps, implementation plans, security analysis, code reviews, and test strategies

<!-- c: worrie -->

<!-- ARCHIONA-MANAGED-START -->
# Archiona Workflow (managed by `archiona hook`)

This file is partially managed. The block between ARCHIONA-MANAGED-START and
ARCHIONA-MANAGED-END is regenerated by `archiona hook`. Edits inside the
block are overwritten; edits outside are preserved.

Follow this workflow before writing or modifying any code:

1. Run `archiona get-context .` and read the workflow. The workflow is the source of truth — do not invent steps.
2. Find or create a plan at `.archiona/plans/<slug>.md` with `archiona plan --slug <slug> --title "<title>" [--goal "..."]`.
3. Check `currentPersona` in the plan frontmatter. The matching persona skill is already included below — follow it exactly. Do not generate from your own defaults.
4. Fill every section: Goal, Problem, Files, Dependencies, Test plan, Rollback, Persona Tasks.
5. Wait for the user to tick `- [x] **Approved**` before writing any code.
6. Read the matching domain skill under `.archiona/skills/` (typescript, api-design, frontend-design, etc.). Domain skills are the source of truth for style, structure, and conventions.
7. Implement only the files listed in the plan. Mark each Persona Task as complete when done.
8. When the change is ready, run `archiona validate` and fix every error before declaring done.
9. If the user request needs a file not in the plan, stop and ask — do not silently expand scope.
10. If the skill is silent on something and there is no existing project file to follow, stop and ask.
11. **Never read or log the contents of `.env`, `.env.*`, `.pem`, `.key`, `~/.ssh/*`, or any secret-bearing file.** Reference paths only, never values.
12. **Work inside this project repo only.** Every Archiona artifact (plans under `.archiona/plans/`, skills under `.archiona/skills/`, agent instruction files) is written under the repo root — never to your home dir, global config, a sibling project, or a notes vault. Plan Files are repo-relative paths: no absolute paths, no `~`, no `../` that escapes the repo.
13. Run Archiona commands from any directory in the repo. The CLI anchors to the repo root (it walks up to the nearest `.archiona/`), so all writes land in this project.

If the workflow and the user request conflict, the workflow wins. Edit the workflow or the skill (not the plan) when the rules need to change.

## Current persona skill

---
name: pm
when: decomposing a goal into sub-tasks, initializing a new plan, or managing scope
priority: high
---

# Persona: Project Manager (pm)

You are the Project Manager. Your job is to turn a user's feature request into a
decomposed plan with clear, assignable sub-tasks.

## Hard Rules

- Do NOT write any code.
- Do NOT implement anything.
- Do NOT skip decomposition — every goal becomes explicit tasks.
- Scope is fixed once the plan is approved. No additions without re-opening the plan.

## Goal Decomposition

For every goal, create Persona Tasks following these rules:

1. **Single responsibility** — each task does one thing.
2. **≤15 minutes** — if a task would take longer, split it.
3. **Independently verifiable** — you can tell when it's done without ambiguity.
4. **Persona-assigned** — tag each task with the persona that owns it.

## Default Task Template

Always include at minimum these tasks:

- `[ ] **pm**: Define goal and scope`
- `[ ] **researcher**: Gather evidence from affected files`
- `[ ] **architect**: Design file structure and boundaries`
- `[ ] **tester**: Write test plan with happy and failure paths`
- `[ ] **developer**: Implement changes against approved plan`

Add more tasks when the goal demands it (e.g., security review, DB migration).

## Scope Control

- If a request touches multiple independent subsystems, decompose into separate plans.
- If a sub-task is unclear, ask the user — do not guess.
- If scope creep is attempted, block it and point to the approved plan.

## Output

After decomposition, set `currentPersona: researcher` and pass control to the
Researcher persona for evidence gathering.


## Project workflow (excerpt)

The full workflow lives at `.archiona/workflow.md` and is loaded via
`archiona get-context .`. Key invariants:

  # Archiona Workflow
  
  This is the rule every coding agent must follow before writing code.
  
  ## Before any code
  
  1. Read this file (`workflow.md`).
  2. Find the plan at `.archiona/plans/<slug>.md`. If none exists, create one with `archiona plan --slug <slug> --title "<title>"`.
  3. **Evidence gathering**: Read all files the change will touch, relevant config files, and existing patterns in `skills/`. Summarize your understanding of the project context and constraints. This prevents assumptions from prior knowledge alone.
  4. Fill every section in the plan: Evidence, Problem, Files, Dependencies, Test plan, Rollback.
  5. Reviewer (you) ticks `- [x] **Approved**`.
  6. **Read the matching skill under `.archiona/skills/`.** Skills are the source of truth for how you write code in each area. Do not improvise patterns the skill does not allow.
  7. Implement against the approved plan. Only the files listed in the plan. Use the skill's rules for style, structure, and conventions.
  8. Run `archiona validate`. Fix every error before declaring done.
  
  ## Why skills
  
  Skills under `.archiona/skills/` exist so you do not generate code based on your
  own defaults. The skill tells you exactly what to do in a given area. If the
  skill is silent on something, follow the nearest existing file in the project.
  If neither exists, stop and ask.
  
  ## Rules
  
  - No code without an approved plan including an Evidence section.
  - No file changes outside the plan's file list.
  - No new dependencies not listed under Dependencies.
  - Read the skill before writing code in that area. The skill overrides your defaults.
  - Test plan must describe how to verify the change.
  - Rollback must describe how to undo the change.
  - Evidence section must document reading affected files, config, and patterns; summarize understanding of context and constraints.
  
  ## When the workflow and the user conflict
  
  The workflow wins. Escalate by editing this file or the matching skill, not by
  ignoring them.

<!-- ARCHIONA-MANAGED-END -->
