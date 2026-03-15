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
6. Stop and wait for explicit confirmation before writing anything.
7. After confirmation, make the smallest durable brain updates needed.
8. Prefer updating an existing principle file when the pattern is really a principle or preference.
9. Otherwise create one focused note under `brain/notes/<kebab-case-topic>.md`.
10. After applying approved changes, call `brainmaxx_sync_entrypoints`.
11. End with a short summary of what changed.

## Output Rules

- Never write brain changes before explicit confirmation.
- If the session tool reports malformed or unsupported Pi session data, surface that clearly and stop.
- If there are no durable findings, say so and stop.
- Do not dump raw transcript excerpts into the brain. Distill them into durable knowledge.
