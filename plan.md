# pi-brainmaxx UX Hardening Plan

## Status: Complete

Root cause identified, skill instructions updated, non-interactive contract
defined. This document records the findings and the fix.

## Root Cause

`/brain-init` works cleanly in `pi -p` because it is an extension **command**
with direct runtime control: `ctx.hasUI` branching, `console.log` for output,
explicit return for exit.

`/reflect` and `/ruminate` are **skills** -- markdown instructions the LLM
follows. Skills have no programmatic mechanism to detect non-interactive mode,
enforce confirmation gates, or guarantee visible output before exit.

When `pi -p "/ruminate"` ran, the LLM followed the skill instruction "stop and
wait for explicit confirmation" in a context where no user could confirm. The
result was either a silent write or a hang, neither of which is acceptable.

This is an architecture gap between commands and skills, not a bug in brain
logic or session handling. The underlying brain result from `ruminate` was
correct (it created a valid note and synced entrypoints).

## Non-Interactive UX Contract

For `v0.3`, the minimum acceptable behavior:

- `pi -p "/reflect"` -- may write durable changes; must print a visible summary
  and exit cleanly.
- `pi -p "/ruminate"` -- findings preview only; never writes without explicit
  confirmation in the current conversation. Must print a visible summary and
  exit cleanly.
- `/brain-init` -- unchanged; already has deterministic non-interactive handling.

Both skills must always end with a visible summary stating what happened.

## Applied Fix

Updated `skills/ruminate/SKILL.md`:

- Replaced "stop and wait for confirmation" with "only write after explicit user
  confirmation in the current conversation."
- Added: "If explicit confirmation is unavailable or cannot be obtained, do not
  write any brain changes. Present findings as preview-only and stop."
- Added: "Invoking `/ruminate` is not permission to write."
- Added mandatory visible summary in all exit paths.

Updated `skills/reflect/SKILL.md`:

- Added mandatory visible summary requirement in output rules, including the
  no-op case.
- Summary must state: whether changes were made, which files changed, rationale.

## Why Not Convert to Commands

Converting skills to extension commands would give hard runtime control
(`ctx.hasUI`, deterministic output, explicit apply flags). That is the right
escalation path if the prompt-based fix proves unreliable in practice.

For now, the skill-instruction fix is the correct minimal boundary because:

- It preserves the current package surface (no new commands).
- It addresses the immediate failure mode.
- The permission model difference is intentional: `/reflect` auto-applies,
  `/ruminate` requires confirmation.
- Converting both to commands is a larger change that should only happen with
  evidence that LLM compliance is insufficient.

Promote `/ruminate` to a command if any of these become true:

- Non-interactive runs still sometimes write without confirmation.
- The LLM still hangs or exits without visible output after the skill fix.
- A clean `--apply` / preview CLI split is needed.

## Acceptance Criteria

- [x] `/reflect` skill instructions require visible summary in all exit paths
- [x] `/ruminate` skill instructions are preview-only without explicit
      confirmation
- [x] `/ruminate` skill explicitly states invocation is not write permission
- [x] Smoke test: `pi -p "/reflect"` in a scratch repo prints summary and
      exits 0
- [x] Smoke test: `pi -p "/ruminate"` in a scratch repo prints findings preview
      and exits 0 without writing
- [x] Real rerun in `~/` confirms both paths work

## Out of Scope

- Claude history import
- Broad brain schema redesign
- Review workflow changes
- Converting skills to commands (deferred unless prompted by real failures)
