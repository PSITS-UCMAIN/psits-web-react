---
title: Linting
last_updated: 2026-05-16
generated_by: agent
---

## ESLint Status

| Workspace | Status | Notes |
|---|---|---|
| `client-side-ts/` | Configured | `eslint.config.js` exists and is the only ESLint config found in the repo |
| `server-side/` | Not detected | No ESLint config was found in the workspace |
| Repo root | Not detected | No root ESLint config was found |

## Client ESLint Rules

| Rule or plugin | Detected setting |
|---|---|
| Base config | `@eslint/js` recommended rules |
| TypeScript | `typescript-eslint` recommended rules |
| React hooks | `eslint-plugin-react-hooks` recommended rules |
| Fast refresh | `eslint-plugin-react-refresh`, warning on non-component exports |
| Formatting conflicts | `eslint-config-prettier` disables formatting rules that clash with Prettier |
| `no-explicit-any` | Error |
| `no-unused-vars` | Error, with `_` ignored in args and vars |
| `no-console` | Warn, only `console.warn` and `console.error` allowed |
| `prefer-const` | Error |
| `no-var` | Error |

## Prettier

| Setting | Value |
|---|---|
| Config file | `./.prettierrc` at the repository root |
| Scope | Project-scoped; run Prettier from the repo root |
| Print width | `80` |
| Semicolons | `true` |
| Single quotes | `false` |
| Trailing commas | `es5` |
| Tab width | `2` |
| Tabs | `false` |
| Plugins | `prettier-plugin-tailwindcss` |

## Prettier Scope Notes

- The root Prettier config is the canonical formatter for the repository.
- It is intended to be run from the repository root and applies across the codebase’s TypeScript and JavaScript source files.
- The `.prettierignore` file excludes generated output, dependency folders, selected public assets, and several repository documents.

## Hooks

| Tool | Status |
|---|---|
| Husky | Not detected |
| lint-staged | Not detected |
| Other pre-commit hooks | Not detected |

## Local Commands

### Active frontend lint and format

```bash
cd client-side-ts
npm run lint
npm run format
npm run format:check
```

### Root formatter usage

No root `package.json` script was detected for linting or formatting. Run Prettier from the repository root with the command you need for the files you are touching.

### Test Infrastructure (pointer)

A concise test infrastructure guide was added at `docs/test-infrastructure.md`. It documents how to run backend and active-frontend tests, CI artifact paths, and notes that the legacy `client-side/` workspace currently has no `test` script configured and should be evaluated for a minimal smoke test or migration of tests to `client-side-ts/`.