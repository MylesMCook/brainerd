---
name: brainmaxx-init
license: MIT
description: Initialize a repo-local brainmaxx brain for Codex. Use when the user asks to set up brainmaxx in a repo, create the repo brain, or install the managed AGENTS.md block that tells Codex to read the brain entrypoints.
---

# Brainmaxx Init

Use this skill to initialize brainmaxx for Codex in the current repo.

## Workflow

1. Run:

```bash
node --import tsx ../../src/codex-cli.ts init
```

2. This creates any missing `brain/` managed files and installs or updates the
   managed `AGENTS.md` block.
3. Review the bootstrap preview.
4. Do not create the operations note unless the user explicitly asked for it or
   confirms after seeing the preview.
5. To apply the bootstrap note, run:

```bash
node --import tsx ../../src/codex-cli.ts init --apply-bootstrap
```

## Rules

- Only this skill may edit `AGENTS.md`, and only through the managed
  `brainmaxx` block.
- Do not edit any repo files outside `brain/` and the managed `AGENTS.md`
  block.
- If `AGENTS.md` contains multiple `brainmaxx` managed blocks, stop and surface
  the error instead of editing the file.
- End with a short summary of what was created, what was preserved, and whether
  bootstrap was only previewed or actually applied.
