---
name: ruminate
description: >-
  Mine older Pi session history for repeated corrections, preferences, missed
  durable knowledge, and recurring failure patterns in the current repo. Use
  when the user asks to ruminate, bootstrap a brain from past sessions, or look
  for patterns that reflect missed.
---

# Ruminate

Mine older Pi sessions for durable patterns the current brain has missed.

This skill is Pi-only. Use the repo-scoped Pi session tool instead of manually
parsing raw session JSONL files.

## Workflow

1. Read the ambient brain context already injected into the session.
2. Call `brainmaxx_repo_sessions`.
3. Review only repo-scoped session history returned by that tool.
4. Identify:
   - repeated corrections
   - repeated preferences
   - missed durable project knowledge
   - recurring failure patterns
5. Present a concise findings summary first.
6. Only write after explicit user confirmation in the current conversation.
7. If explicit confirmation is unavailable or cannot be obtained, do not write
   any brain changes. Present findings as preview-only and stop.
8. After confirmation, make the smallest durable brain updates needed.
9. Prefer updating an existing principle file when the pattern is really a principle or preference.
10. Otherwise create one focused note under `brain/notes/<kebab-case-topic>.md`.
11. After applying approved changes, call `brainmaxx_sync_entrypoints`.
12. End with a visible summary of what changed or what was previewed.

## Output Rules

- Invoking `/ruminate` is not permission to write. Explicit follow-up
  confirmation is required before any brain changes.
- If the session tool reports malformed or unsupported Pi session data, surface that clearly and stop.
- If there are no durable findings, say so and stop.
- Do not dump raw transcript excerpts into the brain. Distill them into durable knowledge.
- Always end with a visible summary, even in preview-only runs.
- If no write occurred, say explicitly: no brain changes were written.
