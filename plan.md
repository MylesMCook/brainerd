# pi-brainmaxx Skill Reliability Notes

## Status

Implemented in `v0.3.0`.

## Decision

`/reflect` and `/ruminate` remain public skills.

They are no longer treated as pure markdown instructions with generic file
access. The extension now supplies a narrow SDK control layer around those
skills:

- raw input interception for `/reflect`, `/ruminate`, `/skill:reflect`, and
  `/skill:ruminate`
- per-run tool narrowing with `setActiveTools()`
- guarded internal tools for current-session extraction, repo history loading,
  rumination staging, staged preview retrieval, and safe brain writes
- fallback summary messages when the model fails to print one

`/brain-init` remains the only public extension command.

## Current Contract

### `/reflect`

- still invoked as a skill
- the extension rewrites `/reflect` to `/skill:reflect`
- the run gets only:
  - `read`
  - `find`
  - `grep`
  - `brainmaxx_current_session`
  - `brainmaxx_apply_changes`
- brain writes are only allowed through `brainmaxx_apply_changes`
- the skill must end with a visible section that starts with `Brainmaxx summary:`

### `/ruminate`

- still invoked as a skill
- the extension rewrites `/ruminate` to `/skill:ruminate`
- preview runs get only:
  - `read`
  - `find`
  - `grep`
  - `brainmaxx_repo_sessions`
  - `brainmaxx_stage_ruminate`
- apply runs get only:
  - `read`
  - `find`
  - `grep`
  - `brainmaxx_get_staged_ruminate`
  - `brainmaxx_apply_changes`
- preview is always first
- interactive Pi accepts a short plain-English confirmation like `yes` or
  `apply it`
- rejection like `no` or `cancel` discards the staged preview and writes nothing
- `pi -p "/ruminate"` stays preview-only and has no apply step

## Guardrails

- `write`, `edit`, and `bash` are blocked during active brainmaxx runs
- `brainmaxx_apply_changes` only accepts markdown targets under:
  - `brain/notes/`
  - `brain/principles/`
- direct writes to generated entrypoints are rejected:
  - `brain/index.md`
  - `brain/principles.md`
  - `brain/.brainmaxx-version`
- entrypoint sync happens inside `brainmaxx_apply_changes`

## Why This Shape

This keeps the public workflow skill-native while making the dangerous parts
deterministic:

- the model still decides what durable knowledge matters
- the extension controls what data the skill sees
- the extension controls how writes happen
- the extension controls confirmation and fallback reporting

That is the smallest change that makes Pi reliable without turning `reflect` and
`ruminate` into first-class Pi commands.
