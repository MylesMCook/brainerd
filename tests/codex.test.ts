import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { initCodexBrain, syncCodexBrain } from "../src/codex.js";

const tempProject = async (name = "repo"): Promise<string> => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "pi-brainerd-codex-"));
  const projectRoot = path.join(root, name);
  await fs.mkdir(projectRoot, { recursive: true });
  await fs.writeFile(path.join(projectRoot, ".git"), "gitdir: fake\n");
  return projectRoot;
};

test("initCodexBrain creates a minimal AGENTS.md when missing and does not bootstrap from its own managed block", async () => {
  const projectRoot = await tempProject();

  const result = await initCodexBrain(projectRoot);
  const agentsText = await fs.readFile(path.join(projectRoot, "AGENTS.md"), "utf8");

  assert.ok(result.brain.created.includes("brain/index.md"));
  assert.equal(result.agents.status, "created");
  assert.match(agentsText, /<!-- brainerd:start -->/);
  assert.equal(result.bootstrap.status, "none");
});

test("initCodexBrain appends one managed block and previews operational bootstrap from existing AGENTS.md content", async () => {
  const projectRoot = await tempProject("beelink");
  await fs.writeFile(
    path.join(projectRoot, "AGENTS.md"),
    [
      "# Workflow",
      "",
      "- For reconnectable remote work, run `tmux new-session -A -s beelink`, then start `pi`.",
      "",
    ].join("\n"),
  );

  const result = await initCodexBrain(projectRoot);
  const agentsText = await fs.readFile(path.join(projectRoot, "AGENTS.md"), "utf8");

  assert.equal(result.agents.status, "updated");
  assert.match(agentsText, /tmux new-session -A -s beelink/);
  assert.match(agentsText, /<!-- brainerd:start -->/);
  assert.equal(result.bootstrap.status, "ready");
  assert.match(result.bootstrap.content, /tmux new-session -A -s beelink/);
});

test("initCodexBrain rejects duplicate managed blocks before creating a brain", async () => {
  const projectRoot = await tempProject("dup-blocks");
  await fs.writeFile(
    path.join(projectRoot, "AGENTS.md"),
    [
      "<!-- brainerd:start -->",
      "first",
      "<!-- brainerd:end -->",
      "",
      "<!-- brainerd:start -->",
      "second",
      "<!-- brainerd:end -->",
      "",
    ].join("\n"),
  );

  await assert.rejects(initCodexBrain(projectRoot), /Multiple Brainerd managed blocks/);
  await assert.rejects(fs.access(path.join(projectRoot, "brain")), /ENOENT/);
});

test("initCodexBrain applies bootstrap when requested and syncs the index", async () => {
  const projectRoot = await tempProject("scratch");
  await fs.writeFile(
    path.join(projectRoot, "README.md"),
    [
      "# Interfaces",
      "",
      "- Grasshopper is the preferred retrieval engine.",
      "",
    ].join("\n"),
  );

  const result = await initCodexBrain(projectRoot, { applyBootstrap: true });
  const indexText = await fs.readFile(path.join(projectRoot, "brain/index.md"), "utf8");

  assert.equal(result.bootstrap.status, "created");
  assert.match(indexText, /\[\[notes\/scratch-operations\.md\]\]/);
});

test("syncCodexBrain preserves user-owned index files", async () => {
  const projectRoot = await tempProject();
  await initCodexBrain(projectRoot);

  const statePath = path.join(projectRoot, "brain/.brainerd-version");
  const state = JSON.parse(await fs.readFile(statePath, "utf8")) as { version: string; ownedFiles: string[] };
  state.ownedFiles = state.ownedFiles.filter((file) => file !== "brain/index.md");
  await fs.writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`);
  await fs.writeFile(path.join(projectRoot, "brain/index.md"), "# Custom index\n");

  const result = await syncCodexBrain(projectRoot);
  const persisted = await fs.readFile(path.join(projectRoot, "brain/index.md"), "utf8");

  assert.ok(result.skipped.includes("brain/index.md"));
  assert.equal(persisted, "# Custom index\n");
});
