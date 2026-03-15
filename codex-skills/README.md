# Codex skills

These are the local Codex-side `brainmaxx` skills that sit next to the Pi
package.

Install them by symlinking each skill into `~/.codex/skills/`:

```bash
ln -s /absolute/path/to/pi-brainmaxx/codex-skills/brainmaxx-init ~/.codex/skills/brainmaxx-init
ln -s /absolute/path/to/pi-brainmaxx/codex-skills/brainmaxx-reflect ~/.codex/skills/brainmaxx-reflect
ln -s /absolute/path/to/pi-brainmaxx/codex-skills/brainmaxx-ruminate ~/.codex/skills/brainmaxx-ruminate
```

The skills expect to live inside this repo so they can call:

```bash
node --import tsx ../../src/codex-cli.ts ...
```
