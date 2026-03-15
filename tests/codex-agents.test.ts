import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  BRAINMAXX_AGENTS_BLOCK_END,
  BRAINMAXX_AGENTS_BLOCK_START,
  stripCodexManagedBlock,
  updateCodexAgentsContent,
  upsertCodexAgentsBlock,
} from "../src/codex-agents.js";

const tempProject = async (): Promise<string> => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "pi-brainmaxx-codex-agents-"));
  await fs.writeFile(path.join(root, ".git"), "gitdir: fake\n");
  return root;
};

test("updateCodexAgentsContent creates a minimal AGENTS.md block when the file is missing", () => {
  const result = updateCodexAgentsContent(null);

  assert.equal(result.status, "created");
  assert.match(result.content, new RegExp(BRAINMAXX_AGENTS_BLOCK_START.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(result.content, /brain\/index\.md/);
});

test("updateCodexAgentsContent appends one managed block to an existing AGENTS.md", () => {
  const result = updateCodexAgentsContent("# Repo Rules\n\nKeep it simple.\n");

  assert.equal(result.status, "updated");
  assert.match(result.content, /# Repo Rules/);
  assert.match(result.content, /<!-- brainmaxx:start -->/);
});

test("updateCodexAgentsContent rejects duplicate managed blocks", () => {
  const agents = [
    "# Rules",
    "",
    BRAINMAXX_AGENTS_BLOCK_START,
    "first",
    BRAINMAXX_AGENTS_BLOCK_END,
    "",
    BRAINMAXX_AGENTS_BLOCK_START,
    "second",
    BRAINMAXX_AGENTS_BLOCK_END,
    "",
  ].join("\n");

  assert.throws(() => updateCodexAgentsContent(agents), /Multiple brainmaxx managed blocks/);
});

test("stripCodexManagedBlock removes the managed section before bootstrap reads AGENTS.md", () => {
  const stripped = stripCodexManagedBlock(
    [
      "# Workflow",
      "",
      "- Use tmux first.",
      "",
      BRAINMAXX_AGENTS_BLOCK_START,
      "managed",
      BRAINMAXX_AGENTS_BLOCK_END,
      "",
      "## Services",
      "",
      "- Grasshopper is preferred.",
      "",
    ].join("\n"),
  );

  assert.doesNotMatch(stripped, /brainmaxx:start/);
  assert.match(stripped, /Use tmux first/);
  assert.match(stripped, /Grasshopper is preferred/);
});

test("upsertCodexAgentsBlock writes AGENTS.md to disk", async () => {
  const projectRoot = await tempProject();

  const result = await upsertCodexAgentsBlock(projectRoot);
  const persisted = await fs.readFile(path.join(projectRoot, "AGENTS.md"), "utf8");

  assert.equal(result.status, "created");
  assert.equal(persisted, result.content);
});
