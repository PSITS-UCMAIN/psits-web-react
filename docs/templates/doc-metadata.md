# Document Metadata Template

Place this block at the very top of every doc file (below the H1 title):

---

doc_id: [unique identifier, e.g., ARCH-001, DEC-003, PLAN-002] \
title: [Human-readable title] \
doc_title: [doc_id + title (kebab case). Use this as the file name as well] \
version: [semver string, e.g., 1.0.0] \
status: [draft | review | approved | deprecated] \
created: [YYYY-MM-DD'T'HH:mm:ss+08:00] \
updated: [YYY-MM-DD'T'HH:mm:ss+08:00] \
author: [name or agent identifier] \
reviewers: [comma-separated list, or "none"] \
tags: [comma-separated keywords] \
changelog: \

- version: 1.0.0 \
  date: [YYY-MM-DD'T'HH:mm:ss+08:00] \
  author: [name] \
  note: Initial draft \

---

Rules:

- `doc_id` must be unique across all docs in this project.
- `version` must be incremented for content changes.
- `status` must reflect the current review state.
- `changelog` must be appended; never overwrite history.
