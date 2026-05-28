---
title: Codebase Analysis
purpose: Inspect code before planning
---

# Codebase Analysis

Understand current impl + patterns + deps before plan.

## Steps

### 1. Identify Areas

What gets touched?

- Frontend: components, pages, layouts, hooks, utils
- Backend: routes, controllers, services, models, middleware
- Shared: types, interfaces, constants, config
- Infra: build, env vars, deploy

### 2. Read Files

Use `read_file`:

- Files to modify
- Files that depend on changes
- Files changes depend on
- Similar impl as patterns

**Example:** Auth refactor -> read auth controllers, middleware, user model, frontend auth components

### 3. Map Deps

- Direct: what imports what
- Data: shared models/schemas
- Runtime: service -> API calls
- Type: shared interfaces

Use `list_code_definition_names` for overview.

### 4. Review Patterns

- Naming: how similar files named?
- Structure: how features organized?
- Errors: how endpoints handle errors?

### 5. Check Docs

- `.agents/rules/` — Repo standards
- `docs/` — Feature docs
- `README.md` — Overview
- `AGENTS.md` — Agent rules

### 6. Find Integration Points

Where new code connects:

- API endpoints called
- DB models queried
- Frontend components composed
- Middleware applied
- Services invoked

## Tools

**`read_file`** — Read specific files

**`list_code_definition_names`** — Get module overview

**`search_files`** — Find patterns/usage

## Output

After analysis, know:

1. What exists
2. What patterns established
3. What deps between components
4. What conventions follow
5. What risks (breaking changes, coupling)

Informs phase sequence + risk + impl approach.