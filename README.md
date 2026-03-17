# Brainerd

Brainerd is the project brain.

`@mmcook/pi-brainerd` is the Pi package for it. It gives a repo a small local
`brain/` that Pi can read, update with `/reflect`, and mine with `/ruminate`.

## Install the Pi package

```bash
pi install npm:@mmcook/pi-brainerd
pi install /absolute/path/to/brainerd
pi install git:https://github.com/MylesMCook/brainerd
```

If you want the package attached to project settings instead of your global Pi
agent state:

```bash
pi install -l npm:@mmcook/pi-brainerd
```

## Use it in a repo

```bash
/brain-init
/brain-init --apply-bootstrap
/reflect
/ruminate
```

`pi -p` works too:

```bash
pi -p "/brain-init"
pi -p "/brain-init --apply-bootstrap"
pi -p "/reflect"
pi -p "/ruminate"
```

## What it does

- `/brain-init` scaffolds a repo-local `brain/` without overwriting existing
  files.
- `/brain-init --apply-bootstrap` writes one operations note when the repo does
  not already have one.
- `/reflect` captures durable learnings from the current Pi session and writes
  only under `brain/`.
- `/ruminate` reviews older repo-scoped sessions, shows findings first, and
  writes only after confirmation in an interactive Pi conversation.

## What Brainerd is

Brainerd is the shared idea and the shared `brain/` layout. The point is simple:
keep durable repo memory in plain markdown that an agent can actually use.

Stable instructions can still live in `AGENTS.md`. Brainerd handles the smaller,
more specific layer:

- generated entrypoints under `brain/`
- focused notes under `brain/notes/`
- durable learnings captured from actual sessions

## What `pi-brainerd` is

`pi-brainerd` is the Pi adapter for Brainerd.

It keeps the Pi surface small:

- `/brain-init`
- `/reflect`
- `/ruminate`

`/reflect` and `/ruminate` are still skills. The package extension supplies the
guarded SDK tools behind them so those runs can read the right session data and
write only through the safe Brainerd path.

## Codex

This repo also carries local Codex-side skills:

- `codex-skills/brainerd-init`
- `codex-skills/brainerd-reflect`
- `codex-skills/brainerd-ruminate`

They use the same `brain/` corpus and a managed `AGENTS.md` block:

```md
<!-- brainerd:start -->
...
<!-- brainerd:end -->
```

Only `brainerd-init` updates that block. Reflection and rumination write only
under `brain/`.

## Ownership

Generated entrypoints:

- `brain/index.md`
- `brain/principles.md`

User-owned after creation:

- `brain/principles/*.md`
- `brain/notes/*.md`

Edit the linked principle files and notes, not the generated entrypoints.

## Limits

- Pi is the only published package surface today, under `@mmcook/pi-brainerd`.
- Codex support is local and adapter-specific, not a published package yet.
- Brainerd is repo-local. It is not a hosted memory service.

## Attribution

With regard to the core idea, Brainerd is inspired by
[`brainmaxxing`](https://github.com/poteto/brainmaxxing) by poteto.
