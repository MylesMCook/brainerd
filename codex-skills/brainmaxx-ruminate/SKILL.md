---
name: brainmaxx-ruminate
license: MIT
description: Mine older Codex session history for repeated corrections, preferences, missed durable knowledge, and recurring failure patterns in the current repo. Use when the user asks to ruminate, mine older Codex sessions, or recover missed durable repo memory.
---

# Brainmaxx Ruminate

Mine older Codex sessions for durable patterns the current brain has missed.

## Workflow

1. Read `brain/index.md` and `brain/principles.md`.
2. Run:

```bash
node --import tsx ../../src/codex-cli.ts repo-sessions
```

3. Use only the repo-scoped Codex history returned by that command.
4. If readiness is `insufficient` or `unsupported`, stop and report that no
   brain changes were written.
5. Identify repeated corrections, repeated preferences, missed durable project
   knowledge, and recurring failure patterns.
6. Present a concise findings summary first.
7. Only write after explicit confirmation in the current conversation.
8. After confirmed writes, regenerate entrypoints with:

```bash
node --import tsx ../../src/codex-cli.ts sync
```

## Rules

- Invoking this skill is not permission to write. Explicit follow-up
  confirmation is required before any brain changes.
- Do not parse raw `~/.codex/sessions` files manually unless you are debugging
  the adapter itself.
- Do not dump transcript excerpts into the brain. Distill them into durable
  knowledge.
- Write only under `brain/`.
- End with a short summary. If no write occurred, say explicitly: no brain
  changes were written.
