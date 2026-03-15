# pi-brainmaxx

`@mylesmcook/pi-brainmaxx` is a Pi-native package that gives a repo a small
project-local `brain/`.

v0.1 stays narrow:
- `/brain-init` scaffolds a repo brain without overwriting existing files
- normal Pi turns automatically read `brain/index.md` and `brain/principles.md`
- `/reflect` captures durable learnings from the current session
- `/ruminate` mines older Pi sessions for missed durable knowledge

When `pi-brainmaxx` creates `brain/index.md` and `brain/principles.md`, treat
them as generated entrypoints. Edit the linked principle files and notes, not
the generated indexes themselves.

Install from a local path while developing:

```bash
pi install /absolute/path/to/pi-brainmaxx
```

Then, inside a repo:

```bash
/brain-init
/reflect
/ruminate
```

This package is intentionally brain-first, not review-first. Existing review
workflows benefit indirectly because `brain/principles.md` exists and stays
coherent.

`/ruminate` is Pi-only and depends on Pi session files under `~/.pi/agent/sessions/`.
If Pi changes that format, the tool reports the mismatch clearly and the package
needs an update.
