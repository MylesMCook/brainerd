---
name: brainmaxx-reflect
license: MIT
description: Persist durable learnings from the current Codex conversation into the repo-local brain. Use when the user asks to reflect, remember something from this conversation, or capture a stable correction, preference, or repo fact.
---

# Brainmaxx Reflect

Persist durable knowledge from the current Codex conversation into the repo
brain.

## Workflow

1. Read `brain/index.md` and `brain/principles.md`.
2. Open additional `brain/` files only when needed to choose the right target.
3. Distill the smallest durable change that would help future sessions.
4. Prefer updating an existing principle file when the learning is really a
   principle or preference.
5. Otherwise create one focused note under `brain/notes/<kebab-case-topic>.md`.
6. Write only under `brain/`.
7. After writing, run:

```bash
node --import tsx ../../src/codex-cli.ts sync
```

## Rules

- The user invoking this skill is enough permission to write durable brain
  changes unless the correct target is genuinely ambiguous.
- Do not store secrets, one-off task state, or generic skill instructions.
- If there is nothing durable to preserve, say so and stop.
- End with a short summary of what changed, which files changed, and why.
