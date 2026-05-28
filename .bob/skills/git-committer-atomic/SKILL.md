---
name: git-committer-atomic
description: Use this skill when the user wants to commit existing uncommitted changes as clean, atomic commits — one per logical implementation stage. The skill scans repo state, studies recent commit history for style context, groups changes into independent commits, writes human-readable messages with optional bodies for complex changes, handles orphaned files at the end, and never executes without explicit user approval.
---

# Canonical Reference

For the complete skill implementation, see: [`.agents/skills/git-committer-atomic/SKILL.md`](../../.agents/skills/git-committer-atomic/SKILL.md)