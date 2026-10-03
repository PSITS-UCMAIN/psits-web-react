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

0. **Invoking archiona.** Run `archiona <command> .` from any directory in
   this repo — the CLI anchors to the nearest `.archiona/` (walking up,
   stopping at git boundaries), so every write lands in this project. If
   `archiona` is not found in your shell, run the same command via
   `npx archiona <command> .` instead. Never fall back to looking up
   archiona rules outside this repo.
1. Run `archiona get-context .` and read the workflow. The workflow is the source of truth — do not invent steps.
2. Find or create a plan at `.archiona/plans/<slug>.md` with `archiona plan --slug <slug> --title "<title>" [--goal "..."]`.
3. Check `currentPersona` in the plan frontmatter. The matching persona skill is already included below — follow it exactly. Do not generate from your own defaults.
4. Fill every section: Goal, Problem, Files, Dependencies, Test plan, Rollback, Persona Tasks, and the Implemented checkbox.
5. Wait for the user to tick `- [x] **Approved**` before writing any code.
6. Read the matching domain skill under `.archiona/skills/` (typescript, api-design, frontend-design, etc.). Domain skills are the source of truth for style, structure, and conventions.
7. Implement only the files listed in the plan. Mark each Persona Task as complete when done.
8. After all Persona Tasks are complete and `archiona validate` returns 0, tick `- [x] **Implemented**` in the plan. The plan is not done until this box is checked — `archiona validate` will reject a plan that is not implemented.
9. When the change is ready, run `archiona validate` and fix every error before declaring done.
10. If the user request needs a file not in the plan, stop and ask — do not silently expand scope.
11. If the skill is silent on something and there is no existing project file to follow, stop and ask.
12. **Never read or log the contents of `.env`, `.env.*`, `.pem`, `.key`, `~/.ssh/*`, or any secret-bearing file.** Reference paths only, never values.
13. **Work inside this project repo only.** Every Archiona artifact (plans under `.archiona/plans/`, skills under `.archiona/skills/`, agent instruction files) is written under the repo root — never to your home dir, global config, a sibling project, or a notes vault. Plan Files are repo-relative paths: no absolute paths, no `~`, no `../` that escapes the repo.
14. Run Archiona commands from any directory in the repo. The CLI anchors to the repo root (it walks up to the nearest `.archiona/`), so all writes land in this project.
15. **Senior discipline** (`.archiona/skills/personas/senior/SKILL.md`): no AI-shaped code — match the existing project style. Evidence before claims: cite the file, config, skill rule, or command output behind every claim. Cross-check deliverables against the plan, domain skills, and existing files before handoff. Execute the test plan with real output. If a skill is silent and no existing file answers the question, stop and ask — do not fill the gap with your defaults.

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

## Senior discipline

All work follows `skills/personas/senior/SKILL.md`: cite the source for every
claim (the request text, existing files), cross-check the task list against
the Goal before handoff, keep task descriptions terse and verifiable — no
invented scope. If a sub-task is ambiguous, ask the human; do not guess.

## Output

After decomposition, set `currentPersona: researcher` and pass control to the
Researcher persona for evidence gathering.


## Project workflow (excerpt)

The full workflow lives at `.archiona/workflow.md` and is loaded via
`archiona get-context .`. Key invariants:

  ---
  title: Archiona Workflow
  type: orchestrator
  version: 5.5.0
  status: active
  project_type: fullstack
  ---
  
  # Archiona Workflow (v5.5.0 — Persona-Gated + Project Containment + Senior Discipline + Implemented Gate)
  
  This is the rule every coding agent must follow before writing code.
  
  ## Project containment (hard rule)
  
  Archiona is embedded in this project and works **only inside this repo**.
  
  - Every Archiona artifact — plans, skills, agent instruction files — is written
    under the repo root: `.archiona/` for workflow data, `.cursor/`, `.github/`,
    `AGENTS.md`, etc. for agent hooks. Nothing Archiona-owned goes outside the
    repo: no home dir, no global config, no sibling project, no notes vault.
  - Plan **Files** entries are repo-relative paths. No absolute paths, no `~`,
    no `..` that resolves outside the repo root. `archiona validate` rejects
    files that escape the repo.
  - Run Archiona commands from any subdirectory of the repo. The CLI anchors to
    the repo root by walking up to the nearest `.archiona/` — writes always land
    in this project, never in the working directory by accident.
  - **Invoking the CLI.** Prefer `archiona <command>`; if the command is not
    found in the shell, run `npx archiona <command>` — it loads the same
    installed package and resolves to this repo's `.archiona/` the same way.
    Never look up Archiona rules outside this repo because a command failed.
  - If a task needs to touch a file outside this repo, stop and ask. It is out
    of scope for this project's Archiona.
  
  ## Persona System
  
  Every change flows through persona-gated phases. The agent auto-switches personas
  based on the current workflow step. Read `currentPersona` from the plan frontmatter
  before starting any work.
  
  ### Persona Taxonomy
  
  | Phase    | Persona      | Skill Location                                  |
  | -------- | ------------ | ----------------------------------------------- |
  | Init     | `pm`         | `.archiona/skills/personas/pm/SKILL.md`         |
  | Evidence | `researcher` | `.archiona/skills/personas/researcher/SKILL.md` |
  | Design   | `architect`  | `.archiona/skills/personas/architect/SKILL.md`  |
  | Tests    | `tester`     | `.archiona/skills/personas/tester/SKILL.md`     |
  | Security | `security`   | `.archiona/skills/personas/security/SKILL.md`   |
  | Build    | `developer`  | `.archiona/skills/personas/developer/SKILL.md`  |
  | Frontend | `frontend`   | `.archiona/skills/personas/frontend/SKILL.md`   |
  | Backend  | `backend`    | `.archiona/skills/personas/backend/SKILL.md`    |
  | Database | `database`   | `.archiona/skills/personas/database/SKILL.md`   |
  | DevOps   | `devops`     | `.archiona/skills/personas/devops/SKILL.md`     |
  | Review   | `reviewer`   | `.archiona/skills/personas/reviewer/SKILL.md`   |
  | QA       | `qa`         | `.archiona/skills/personas/qa/SKILL.md`         |
  | Safety   | `safety`     | `.archiona/skills/personas/safety/SKILL.md`     |
  | Skills   | `skills`     | `.archiona/skills/personas/skills/SKILL.md`     |
  | Analysis | `analyst`    | `.archiona/skills/personas/analyst/SKILL.md`    |
  | Senior   | `senior`     | `.archiona/skills/personas/senior/SKILL.md`     |
  
  `senior` is a discipline layer, not a phase: it runs on top of every other
  persona. Read it before acting as any persona and before producing any output
  a human engineer would sign off on.
  
  ## Senior discipline (applies to every persona)
  
  From `.archiona/skills/personas/senior/SKILL.md`:
  
  - No AI-shaped code. Match the style of the existing project; read the
    nearest files before writing. No boilerplate, no invented abstractions.
  - Evidence before claims. Cite the file, config, skill rule, or command
    output behind every claim. No source, no claim.
  - Cross-check every deliverable against the plan, the domain skills, and the
    existing files before handoff.
  - Execute the Test plan with real output. Recording is not execution.
  - Silence in a skill + no existing answer = stop and ask, not guess.
  
  ## Phase 1: Init (pm)
  
  1. Read this file (`workflow.md`).
  2. Find or create a plan: `archiona plan --slug <slug> --title "<title>" [--goal "..."]`.
  3. If `--goal` was provided, the Goal section is pre-filled. Otherwise, write it.
  4. Decompose goal into Persona Tasks. Each task: single responsibility, ≤15 min.
  5. Set `currentPersona: pm` in plan frontmatter.
  
  ## Phase 2: Evidence (researcher)
  
  1. Switch persona: `archiona persona <slug> --set researcher`.
  2. Read all files the change will touch. Read relevant config and existing skills.
  3. Fill Evidence section: summarize constraints, patterns, dependencies.
  4. Analyst reviews: flag risks, edge cases.
  5. Switch to `architect`.
  
  ## Phase 3: Design (architect)
  
  1. Switch persona: `archiona persona <slug> --set architect`.
  2. Design file structure, module boundaries, data flow.
  3. Fill Files section with concrete paths.
  4. Fill Dependencies section.
  5. Architect signs off.
  
  ## Phase 4: Tests (tester)
  
  1. Switch persona: `archiona persona <slug> --set tester`.
  2. Write Test plan: specific commands, expected outcomes, happy + failure paths.
  3. Security reviews: auth paths, injection vectors, secret exposure.
  4. If security flags issues, return to Phase 3.
  
  ## Phase 5: Approve (human)
  
  1. Reviewer (human) checks Evidence, Files, Test plan, Rollback.
  2. Tick `- [x] **Approved**`.
  3. Set `currentPersona: developer`.
  
  ## Phase 6: Build (developer)
  
  1. Read `currentPersona` from plan.
  2. Read matching domain skill (`frontend`, `backend`, `database`, etc.) AND the `developer` persona skill.
  3. Implement ONLY files in plan's Files section.
  4. Mark each Persona Task as completed in the plan.
  5. Developer self-checks against plan.
  
  ## Phase 7: Validate (qa)
  
  1. Switch persona: `archiona persona <slug> --set qa`.
  2. Run `archiona validate`.
  3. Fix every error.
  4. QA executes Test plan manually or via automation.
  5. Report defects if any; return to Phase 6.
  
  ## Phase 8: Review (reviewer)
  
  1. Switch persona: `archiona persona <slug> --set reviewer`.
  2. Verify contract adherence.
  3. Verify rollback instructions are valid.
  4. Sign off.
  
  ## Phase 9: Implemented gate (operator)
  
  After Phase 8 passes, the operator ticks the final gate:
  
  - [ ] **Implemented**
  
  1. Confirm every Persona Task is `- [x]`.
  2. Confirm `archiona validate` returns 0 with all persona tasks complete.
  3. Tick `- [x] **Implemented**` in the plan file.
  4. Run `archiona validate` one final time — it must pass with
     `plan-implemented` no longer reported.
  5. Only then is the change ready for merge.
  
  ## Why skills
  
  Skills under `.archiona/skills/` exist so you do not generate code based on your
  own defaults. Each persona has its own skill, plus domain skills (typescript,
  api-design, frontend-design, etc.). The persona skill tells you the workflow
  phase; the domain skill tells you the coding conventions.
  
  ## Rules
  
  - No code without an approved plan including an Evidence section.
  - No file changes outside the plan's file list.
  - No new dependencies not listed under Dependencies.
  - **All Archiona writes stay inside this repo.** Plans, skills, and agent
    instruction files live under the repo root — never in home, global config,
    or another project.
  - **Plan Files are repo-relative.** No absolute paths, no `~`, no `..` that
    escapes the repo root. `archiona validate` enforces this.
  - Read the persona skill before starting a phase. Read the domain skill before writing code.
  - Test plan must describe how to verify the change.
  - Rollback must describe how to undo the change.
  - Evidence section must document reading affected files, config, and patterns.
  - All Persona Tasks must be marked completed before validation passes.
  - **The Implemented gate is the final sign-off.** After every persona task
    is `- [x]` and `archiona validate` returns 0, tick `- [x] **Implemented**`
    in the plan. Until that box is checked, the plan is incomplete and
    `archiona validate` rejects it with a `plan-implemented` error. The
    Implemented checkbox is the operator's confirmation that the work has been
    carried out as planned — no merge without it.
  - **Never read or log contents of `.env`, `.env.*`, `.pem`, `.key`, `~/.ssh/*`, or any secret-bearing file.** Reference paths only, never values.
  - **No deliverable without the senior cross-check** (evidence cited, plan +
    domain skills + existing files reconciled, test plan executed with real
    output). See `skills/personas/senior/SKILL.md`.
  - Use `archiona validate --slug <s>` to target a specific plan. Without `--slug`, validates the most recently created plan (by `created` timestamp).
  
  ## When the workflow and the user conflict
  
  The workflow wins. Escalate by editing this file or the matching skill, not by
  ignoring them.

<!-- ARCHIONA-MANAGED-END -->
