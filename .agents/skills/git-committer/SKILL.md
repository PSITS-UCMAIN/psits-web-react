---
name: git-committer
description: Use this skill when the user wants Codex to create git commits for already implemented changes, grouped by logical implementation stage instead of one monolithic commit. The skill must inspect repository changes, propose commit groupings, verify git identity, and ask for explicit user approval before executing commits.
---

# Git Committer Skill

## Purpose

This skill helps create clean, stage-based git commits for existing work that has already been implemented.

It is intended for cases where the repository contains multiple changed files and the user wants those changes committed in a clean, professional, reviewable way instead of a single large commit.

This skill does not implement features. Its only responsibility is to analyze repo changes and prepare structured commits.

## Core Behavior

When invoked, the skill must:

1. Inspect the repository state.
2. Identify modified, added, deleted, renamed, and untracked files.
3. Review diffs to understand the logical implementation stages represented by the changes.
4. Group changes into multiple commits based on actual implementation boundaries, not just file count.
5. Verify the git author name and email that will be used for commits.
6. Present the proposed commit plan to the user before executing anything.
7. Ask for explicit user approval for the proposed commit messages and grouping.
8. Only after approval, stage and commit each group separately in the correct order.

## Required Workflow

### Step 1: Inspect repository state

Run the following kinds of checks:

- `git status --short`
- `git diff --stat`
- `git diff`
- `git diff --cached`
- `git ls-files --others --exclude-standard`
- `git config user.name`
- `git config user.email`

If helpful, also inspect file history or path-level diffs to determine whether files belong to the same implementation stage.

### Step 2: Verify git identity

Before proposing any commit execution, confirm the current local git identity:

- current `user.name`
- current `user.email`

Report this back clearly.

If no git email is configured, or if the config appears empty, stop and tell the user before proceeding.

Important:
The skill should not change git config automatically unless the user explicitly asks it to.

### Step 3: Determine logical commit groups

Split changes by implementation stage, such as:

- feature implementation
- schema/model updates
- API/backend logic
- UI integration
- validation/refactor
- docs/config updates
- bug fixes

Do not make one commit per file unless that is actually the cleanest logical grouping.

Do not create a single commit for all changes unless the diff truly represents one indivisible implementation stage.

Prefer the smallest set of commits that still keeps each commit reviewable, coherent, and independently understandable.

A commit should usually represent one narrow implementation step, not an entire feature branch worth of work.

If a proposed commit touches many files, explicitly check whether it can be split into smaller commits by:

- schema or model preparation
- service or backend logic
- controller or API surface changes
- UI wiring
- validation/error handling
- cleanup/refactor
- docs/config

### Step 4: Prepare a commit plan

Before executing commits, present:

- detected git author name/email
- summary of changed files
- proposed commit groups in execution order
- exact proposed commit message for each group
- which files or hunks belong to each commit

If hunk-based splitting is needed within the same file, explicitly mention that.

### Step 5: Ask permission before execution

The skill must always ask for approval before running any `git add` or `git commit` commands.

Use wording similar to:

"Here is the proposed staged commit plan. Please approve these commit messages and groupings before I execute the commits."

Do not commit automatically.

### Step 6: Execute only after approval

Once the user approves, then:

- stage files or hunks per group
- create commits one group at a time in the planned order
- verify each commit succeeded
- report the resulting commit hashes and commit titles

### Step 7: Final report

After execution, report:

- created commits in order
- short hashes
- final `git status --short`

## Commit Message Rules

Use concise, professional commit messages.

Prefer conventional-style messages where appropriate, such as:

- `feat: add farmer marketplace filtering`
- `fix: correct escrow payout validation`
- `refactor: separate buyer order tracking logic`
- `docs: update setup instructions`

If the repository style clearly uses another format, follow the existing repo convention.

Commit messages should reflect actual implementation stages, not vague summaries like:

- `update files`
- `more changes`
- `fix stuff`

## Constraints

- Never make commits without explicit approval from the user.
- Never rewrite commit history unless the user explicitly asks.
- Never change git config automatically.
- Never push automatically.
- Never squash everything into one commit if multiple logical stages exist.
- Never ignore partially changed files that may need hunk-based splitting.
- Never fabricate commit groupings without checking diffs.

## Decision Guidelines for Splitting

Split into separate commits when:

- a schema/model change is distinct from the feature that consumes it
- backend logic and frontend integration are independently understandable
- docs/config changes are separate from feature logic
- a bug fix is independent from a feature addition
- a refactor can stand alone without mixing behavior changes unnecessarily

Keep together when:

- files participate in one tightly coupled implementation step
- separating them would create broken intermediate commits
- the change is small and conceptually indivisible

## Expected Output Style Before Approval

Provide a clear plan like:

1. `feat: add produce listing creation flow`
   - files: ...
   - reason: ...

2. `feat: connect marketplace listing cards to backend data`
   - files: ...
   - reason: ...

3. `refactor: clean up shared listing types`
   - files: ...
   - reason: ...

Then ask for approval before executing.

## Expected Output Style After Approval

Provide:

- `Created commit abc1234 - feat: add produce listing creation flow`
- `Created commit def5678 - feat: connect marketplace listing cards to backend data`

Then show final repo status.

## Safety / Quality Standard

This skill should optimize for clean, reviewable history.

A good result is:

- accurate grouping
- minimal accidental overlap between commits
- correct git identity
- explicit user approval
- no hidden execution

## Reviewability Standard

Do not propose oversized commits.

If a commit would include a large number of files, first attempt to split it into smaller reviewable commits unless doing so would create broken intermediate states.

As a rule of thumb:

- prefer narrow commits over broad commits
- prefer hunk-based splitting when unrelated changes exist in the same file
- avoid bundling setup, feature logic, refactor, and cleanup into one commit

Before finalizing the commit plan, challenge each proposed commit by asking:

- Can this commit be understood on its own?
- Is it doing more than one kind of change?
- Can reviewers verify it without mentally separating unrelated edits?
- Can some files or hunks move to an earlier or later commit?

If yes, split further.
