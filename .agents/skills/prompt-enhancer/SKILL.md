---
name: prompt-enhancer
description: Use when the user wants to transform a rough, vague, or unstructured prompt into a high-quality, production-grade instruction for an AI agent. Focuses on clarity, structure, completeness, and intent sharpening without changing the original goal.
---

# Purpose

This skill upgrades a user-provided prompt into a clear, well-structured, and high-signal instruction that an AI agent can execute with high accuracy.

It does NOT just rephrase — it **reconstructs the prompt** to:

- eliminate ambiguity
- surface implicit requirements
- organize context logically
- clarify expectations and constraints

The goal is to make the prompt feel like it was written by an experienced engineer giving precise instructions to another engineer.

---

# Core Behavior

When invoked:

1. Deeply understand the intent behind the prompt
   - Identify the actual task (not just the wording)
   - Detect implicit requirements and constraints

2. Reconstruct the prompt to improve:
   - clarity of the problem
   - structure of information
   - flow of instructions
   - completeness of context
   - explicitness of expected output

3. Organize the prompt using **natural structure**
   - NOT rigid templates
   - BUT may introduce sections when it improves clarity

4. Preserve:
   - original intent
   - original scope
   - all important details

---

# Enhancement Strategy

## 1. Clarify the Task

- Convert vague phrasing into precise instructions
- Make the objective unmistakably clear
- Remove uncertainty (e.g., "I think", "maybe")

## 2. Surface Context Properly

- Separate background vs actual task
- Highlight important system constraints
- Make hidden assumptions explicit when already implied

## 3. Improve Instruction Quality

- Turn passive descriptions into actionable directives
- Ensure each requirement is understandable and usable
- Group related requirements logically

## 4. Define Expected Output

- Clarify what the AI should produce
- Make success criteria obvious
- Avoid leaving interpretation gaps

## 5. Improve Flow & Readability

- Make it feel like a clean engineering brief
- Avoid unnecessary verbosity
- Keep it sharp, structured, and readable

---

# Adaptive Structuring (Important)

You MAY introduce structure such as:

- context / background
- task definition
- scope
- constraints
- requirements
- edge considerations
- expected behavior

BUT:

- Do NOT force a fixed format
- Do NOT always use the same sections
- Structure should emerge naturally based on the prompt

---

# Constraints

- Do NOT change the intent or scope
- Do NOT introduce new features or requirements
- Do NOT remove critical details
- Do NOT ask clarification questions
- Do NOT perform the task itself
- Do NOT turn everything into rigid bullet checklists unless it improves clarity
- Do NOT oversimplify complex prompts

---

# Output Rules

- Output ONLY the enhanced prompt
- No explanations, no commentary
- Keep it concise but significantly clearer and stronger
- Ensure it is immediately usable as an AI instruction

---

# Quality Standard

A high-quality output should:

- feel like a **senior engineer’s instruction**, not a paraphrase
- be **clear, structured, and complete**
- remove ambiguity and guesswork
- make execution straightforward for an AI agent
- balance **structure + natural flow**
- be something you would confidently use in production prompting

---

# Anti-Pattern (What NOT to Do)

Avoid outputs that:

- only reword sentences
- just make tone more "confident"
- lack structure or clarity improvements
- feel like a shallow paraphrase
- ignore deeper intent or system context
