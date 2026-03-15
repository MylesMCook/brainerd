---
name: reflect
description: >-
  Persist durable learnings from the current Pi session into the repo-local
  brain. Use when the user asks to reflect, remember patterns from this session,
  save stable preferences, capture non-obvious project knowledge, or turn fresh
  corrections into durable brain entries.
---

# Reflect

Persist durable knowledge from the current session into the repo-local `brain/`.

Use this skill only for durable repo memory:
- repeated preferences
- stable conventions
- non-obvious project knowledge
- important corrections that should prevent future confusion

Do not store:
- secrets
- one-off task details
- transient status
- generic skill instructions that belong in a skill instead

## Workflow

1. Read the ambient brain context already injected into the session.
2. Open additional `brain/` files only when you need them.
3. Distill the smallest set of durable changes that would actually help future Pi sessions.
4. Prefer updating an existing principle file when the learning is really a principle or preference.
5. Otherwise create one focused note under `brain/notes/<kebab-case-topic>.md`.
6. Keep note bodies concise and specific.
7. After applying approved changes, call `brainmaxx_sync_entrypoints`.
8. End with a short summary of what changed.

## Output Rules

- If there is nothing durable to preserve, say so and stop.
- The user invoking `/reflect` is enough permission to apply the changes unless the correct target is genuinely ambiguous.
- Make the smallest useful brain change, not a brain dump.
