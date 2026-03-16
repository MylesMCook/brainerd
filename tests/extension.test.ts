import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadSkillsFromDir } from "@mariozechner/pi-coding-agent";
import brainContext from "../extensions/brain-context.js";

type RegisteredCommand = {
  description: string;
  handler: (args: string, ctx: any) => Promise<void>;
};

type RegisteredTool = {
  name: string;
  execute: (...args: any[]) => Promise<any>;
};

type CustomEntryRecord = {
  type: "custom";
  customType: string;
  data?: unknown;
};

const BUILTIN_TOOL_NAMES = ["read", "bash", "edit", "write", "find", "grep", "ls"];

const createApi = () => {
  const commands = new Map<string, RegisteredCommand>();
  const tools = new Map<string, RegisteredTool>();
  const handlers = new Map<string, Array<(event: any, ctx: any) => Promise<any> | any>>();
  const sentMessages: Array<{ message: { customType: string; content: string; display: boolean }; options?: unknown }> = [];
  const customEntries: CustomEntryRecord[] = [];
  let activeTools = [...BUILTIN_TOOL_NAMES];

  const api = {
    registerCommand(name: string, command: RegisteredCommand) {
      commands.set(name, command);
    },
    registerTool(tool: RegisteredTool) {
      tools.set(tool.name, tool);
    },
    on(name: string, handler: (event: any, ctx: any) => Promise<any> | any) {
      const list = handlers.get(name) ?? [];
      list.push(handler);
      handlers.set(name, list);
    },
    sendUserMessage() {},
    sendMessage(message: { customType: string; content: string; display: boolean }, options?: unknown) {
      sentMessages.push({ message, options });
    },
    appendEntry(customType: string, data?: unknown) {
      customEntries.push({ type: "custom", customType, data });
    },
    getActiveTools() {
      return [...activeTools];
    },
    setActiveTools(toolNames: string[]) {
      activeTools = [...toolNames];
    },
    getAllTools() {
      return [
        ...BUILTIN_TOOL_NAMES.map((name) => ({ name, description: `${name} tool` })),
        ...[...tools.values()].map((tool) => ({ name: tool.name, description: tool.name })),
      ];
    },
  };

  return { api, commands, tools, handlers, sentMessages, customEntries, getActiveTools: () => [...activeTools] };
};

const tempRepo = async (): Promise<string> => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "pi-brainmaxx-ext-"));
  await fs.writeFile(path.join(root, ".git"), "gitdir: fake\n");
  return root;
};

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const createSessionManager = (options?: {
  branch?: any[];
  entries?: any[];
  header?: { cwd: string; timestamp: string };
  leafId?: string | null;
  sessionFile?: string;
}) => {
  const branch = options?.branch ?? [];
  const entries = options?.entries ?? branch;
  return {
    getBranch(fromId?: string) {
      if (fromId !== undefined) {
        return branch;
      }
      return branch;
    },
    getEntries() {
      return entries;
    },
    getHeader() {
      return options?.header ?? null;
    },
    getLeafId() {
      return options?.leafId ?? null;
    },
    getSessionFile() {
      return options?.sessionFile;
    },
  };
};

const branchMessage = (role: string, extra: Record<string, unknown> = {}) => ({
  type: "message",
  id: randomId(),
  parentId: null,
  timestamp: new Date().toISOString(),
  message: {
    role,
    ...extra,
  },
});

const randomId = () => Math.random().toString(16).slice(2, 10);

test("brain-context registers the public commands and internal tools", () => {
  const { api, commands, tools } = createApi();

  brainContext(api as any);

  assert.deepEqual([...commands.keys()].sort(), ["brain-init"]);
  assert.deepEqual(
    [...tools.keys()].sort(),
    [
      "brainmaxx_apply_changes",
      "brainmaxx_current_session",
      "brainmaxx_get_staged_ruminate",
      "brainmaxx_repo_sessions",
      "brainmaxx_stage_ruminate",
      "brainmaxx_sync_entrypoints",
    ],
  );
});

test("reflect and ruminate stay package skills instead of extension commands", () => {
  const { api, commands } = createApi();
  const packageSkills = loadSkillsFromDir({
    dir: path.join(packageRoot, "skills"),
    source: "path",
  });

  brainContext(api as any);

  assert.deepEqual([...commands.keys()], ["brain-init"]);
  assert.deepEqual(
    packageSkills.skills.map((skill) => skill.name).sort(),
    ["reflect", "ruminate"],
  );
});

test("/brain-init command creates a project brain", async () => {
  const { api, commands } = createApi();
  const repoRoot = await tempRepo();
  const notifications: Array<{ message: string; level: string | undefined }> = [];

  brainContext(api as any);

  await commands.get("brain-init")?.handler("", {
    cwd: repoRoot,
    hasUI: true,
    ui: {
      notify(message: string, level?: string) {
        notifications.push({ message, level });
      },
    },
  });

  assert.ok(await fs.stat(path.join(repoRoot, "brain/index.md")));
  assert.ok(await fs.stat(path.join(repoRoot, "brain/principles.md")));
  assert.equal(notifications.length, 2);
  assert.match(notifications[0]?.message ?? "", /Brain initialized/);
  assert.match(notifications[1]?.message ?? "", /No concise operational content/);
});

test("/brain-init prints a bootstrap preview in non-interactive mode", async () => {
  const { api, commands } = createApi();
  const repoRoot = await tempRepo();
  const output: string[] = [];

  brainContext(api as any);
  await fs.writeFile(path.join(repoRoot, "AGENTS.md"), "- For reconnectable remote work, start with `tmux new-session -A -s beelink`, then run `pi`.\n");

  const originalLog = console.log;
  const originalWarn = console.warn;
  try {
    console.log = (message?: unknown) => output.push(String(message ?? ""));
    console.warn = (message?: unknown) => output.push(String(message ?? ""));
    await commands.get("brain-init")?.handler("", {
      cwd: repoRoot,
      hasUI: false,
      ui: { notify() {} },
    });
  } finally {
    console.log = originalLog;
    console.warn = originalWarn;
  }

  assert.match(output.join("\n"), /Brain initialized/);
  assert.match(output.join("\n"), /Operational bootstrap preview/);
  assert.match(output.join("\n"), /tmux new-session -A -s beelink/);
  await assert.rejects(fs.access(path.join(repoRoot, "brain/notes")));
});

test("/brain-init applies bootstrap in non-interactive mode with --apply-bootstrap", async () => {
  const { api, commands } = createApi();
  const repoRoot = await tempRepo();
  const output: string[] = [];

  brainContext(api as any);
  await fs.writeFile(path.join(repoRoot, "AGENTS.md"), "- Maestro handles delegated Linear repo work in this repo.\n");

  const originalLog = console.log;
  try {
    console.log = (message?: unknown) => output.push(String(message ?? ""));
    await commands.get("brain-init")?.handler("--apply-bootstrap", {
      cwd: repoRoot,
      hasUI: false,
      ui: { notify() {} },
    });
  } finally {
    console.log = originalLog;
  }

  const notes = await fs.readdir(path.join(repoRoot, "brain/notes"));
  assert.equal(notes.length, 1);
  assert.match(output.join("\n"), /Created brain\/notes\/.+-operations\.md/);
});

test("/brain-init reports unsupported arguments clearly", async () => {
  const { api, commands } = createApi();
  const repoRoot = await tempRepo();
  const notifications: Array<{ message: string; level: string | undefined }> = [];

  brainContext(api as any);

  await commands.get("brain-init")?.handler("--bogus", {
    cwd: repoRoot,
    hasUI: true,
    ui: {
      notify(message: string, level?: string) {
        notifications.push({ message, level });
      },
    },
  });

  assert.equal(notifications.length, 1);
  assert.match(notifications[0]?.message ?? "", /Unsupported \/brain-init arguments/);
  assert.equal(notifications[0]?.level, "warning");
});

test("before_agent_start injects the ambient brain context when a brain exists", async () => {
  const { api, commands, handlers } = createApi();
  const repoRoot = await tempRepo();

  brainContext(api as any);
  await commands.get("brain-init")?.handler("", {
    cwd: repoRoot,
    hasUI: true,
    ui: { notify() {} },
  });

  const beforeStart = handlers.get("before_agent_start");
  assert.ok(beforeStart);

  const result = await beforeStart?.[0]?.({}, { cwd: repoRoot, sessionManager: createSessionManager(), hasUI: false, ui: { notify() {} } });
  assert.equal(result?.message?.customType, "brainmaxx-context");
  assert.match(result?.message?.content ?? "", /# brain\/index\.md/);
  assert.match(result?.message?.content ?? "", /# brain\/principles\.md/);
});

test("input hook rewrites /reflect to /skill:reflect and narrows tools for the run", async () => {
  const { api, handlers, getActiveTools } = createApi();
  brainContext(api as any);

  const inputHandler = handlers.get("input")?.[0];
  const result = await inputHandler?.(
    { text: "/reflect", source: "interactive" },
    { isIdle: () => true, hasUI: true, sessionManager: createSessionManager({ leafId: "leaf-1" }), ui: { notify() {} } },
  );

  assert.deepEqual(result, { action: "transform", text: "/skill:reflect" });
  assert.deepEqual(getActiveTools().sort(), ["brainmaxx_apply_changes", "brainmaxx_current_session", "find", "grep", "read"]);
});

test("input hook rewrites /ruminate to /skill:ruminate and restores tools after agent_end", async () => {
  const { api, handlers, getActiveTools, sentMessages } = createApi();
  brainContext(api as any);

  const inputHandler = handlers.get("input")?.[0];
  const endHandler = handlers.get("agent_end")?.[0];
  await inputHandler?.(
    { text: "/ruminate", source: "interactive" },
    { isIdle: () => true, hasUI: true, sessionManager: createSessionManager({ leafId: "leaf-2" }), ui: { notify() {} } },
  );

  assert.deepEqual(getActiveTools().sort(), ["brainmaxx_repo_sessions", "brainmaxx_stage_ruminate", "find", "grep", "read"]);

  await endHandler?.({ messages: [{ role: "assistant", content: [{ type: "text", text: "Done" }] }] }, {});

  assert.deepEqual(getActiveTools(), BUILTIN_TOOL_NAMES);
  assert.match(sentMessages[0]?.message.content ?? "", /Brainmaxx summary:/);
});

test("brainmaxx internal tools are blocked outside explicit skill runs", async () => {
  const { api, handlers } = createApi();
  brainContext(api as any);

  const result = await handlers.get("tool_call")?.[0]?.({ toolName: "brainmaxx_apply_changes" }, {});

  assert.deepEqual(result, {
    block: true,
    reason: "brainmaxx internal tool brainmaxx_apply_changes is only available during an explicit /reflect or /ruminate run.",
  });
});

test("brainmaxx tool guard blocks tools that do not match the active run mode", async () => {
  const { api, handlers } = createApi();
  brainContext(api as any);

  await handlers.get("input")?.[0]?.(
    { text: "/ruminate", source: "interactive" },
    { isIdle: () => true, hasUI: true, sessionManager: createSessionManager({ leafId: "leaf-4" }), ui: { notify() {} } },
  );

  const result = await handlers.get("tool_call")?.[0]?.({ toolName: "brainmaxx_apply_changes" }, {});

  assert.deepEqual(result, {
    block: true,
    reason: "brainmaxx skill run active: brainmaxx_apply_changes is not available in ruminate-preview.",
  });
});

test("brainmaxx_current_session returns the pre-invocation branch transcript", async () => {
  const { api, handlers, tools } = createApi();
  brainContext(api as any);

  const branch = [
    branchMessage("user", { content: [{ type: "text", text: "Remember this workflow" }] }),
    branchMessage("assistant", {
      content: [{ type: "text", text: "I will remember it." }],
      provider: "openai",
      model: "gpt-5.4",
    }),
    branchMessage("toolResult", {
      toolName: "read",
      content: [{ type: "text", text: "brain/index.md contents" }],
      isError: false,
    }),
  ];

  await handlers.get("input")?.[0]?.(
    { text: "/reflect", source: "interactive" },
    { isIdle: () => true, hasUI: true, sessionManager: createSessionManager({ branch, leafId: "leaf-3" }), ui: { notify() {} } },
  );

  const result = await tools.get("brainmaxx_current_session")?.execute("tool", {}, undefined, undefined, {
    cwd: "/tmp/project",
    sessionManager: createSessionManager({
      branch,
      header: { cwd: "/tmp/project", timestamp: "2026-03-16T00:00:00.000Z" },
      leafId: "leaf-3",
    }),
  });

  assert.match(result?.content?.[0]?.text ?? "", /User: Remember this workflow/);
  assert.match(result?.content?.[0]?.text ?? "", /Assistant: I will remember it\./);
  assert.match(result?.content?.[0]?.text ?? "", /Tool read result: brain\/index\.md contents/);
});

test("brainmaxx_repo_sessions tool returns repo-scoped session history", async () => {
  const { api, commands, tools } = createApi();
  const repoRoot = await tempRepo();
  const homeRoot = await fs.mkdtemp(path.join(os.tmpdir(), "pi-brainmaxx-tool-home-"));
  const sessionsRoot = path.join(homeRoot, ".pi/agent/sessions");
  const sessionFile = path.join(sessionsRoot, "older.jsonl");

  await fs.mkdir(sessionsRoot, { recursive: true });

  await fs.writeFile(
    sessionFile,
    [
      JSON.stringify({ type: "session", version: 3, id: "1", timestamp: "2026-03-15T00:00:00.000Z", cwd: repoRoot }),
      JSON.stringify({ type: "message", id: "u1", message: { role: "user", content: [{ type: "text", text: "Remember this" }] } }),
      JSON.stringify({ type: "message", id: "a1", message: { role: "assistant", content: [{ type: "text", text: "Will do" }], provider: "openai-codex", model: "gpt-5.4" } }),
      "",
    ].join("\n"),
  );

  brainContext(api as any);
  await commands.get("brain-init")?.handler("", {
    cwd: repoRoot,
    hasUI: true,
    ui: { notify() {} },
  });

  const originalHome = process.env.HOME;
  process.env.HOME = homeRoot;

  try {
    const result = await tools.get("brainmaxx_repo_sessions")?.execute(
      "tool",
      { maxSessions: 5, maxCharsPerSession: 1000 },
      undefined,
      undefined,
      {
        cwd: repoRoot,
        sessionManager: createSessionManager(),
      },
    );

    assert.match(result?.content?.[0]?.text ?? "", /Sessions: 1/);
    assert.match(result?.content?.[0]?.text ?? "", /User: Remember this/);
  } finally {
    process.env.HOME = originalHome;
  }
});

test("brainmaxx_stage_ruminate stores a recoverable preview and confirm transforms into apply mode", async () => {
  const { api, handlers, tools, customEntries, getActiveTools } = createApi();
  brainContext(api as any);

  const repoRoot = await tempRepo();
  const stageResult = await tools.get("brainmaxx_stage_ruminate")?.execute(
    "tool",
    {
      findingsSummary: "Remote workflow was repeated across sessions.",
      rationale: "This is durable operating knowledge.",
      changes: [{ path: "brain/notes/remote-workflow.md", content: "# Remote Workflow\n\nUse tmux first.\n" }],
    },
    undefined,
    undefined,
    { cwd: repoRoot },
  );

  assert.equal(customEntries.length, 1);
  assert.match(stageResult?.content?.[0]?.text ?? "", /Staged rumination preview/);

  const inputHandler = handlers.get("input")?.[0];
  const result = await inputHandler?.(
    { text: "yes", source: "interactive" },
    {
      isIdle: () => true,
      hasUI: true,
      sessionManager: createSessionManager({ branch: customEntries, entries: customEntries }),
      ui: { notify() {} },
    },
  );

  assert.deepEqual(result, { action: "transform", text: "/skill:ruminate" });
  assert.deepEqual(getActiveTools().sort(), ["brainmaxx_apply_changes", "brainmaxx_get_staged_ruminate", "find", "grep", "read"]);
});

test("ruminate reject follow-up clears the stage without triggering a model turn", async () => {
  const { api, handlers, sentMessages } = createApi();
  brainContext(api as any);

  const staged = {
    type: "custom",
    customType: "brainmaxx-ruminate-stage",
    data: {
      stageId: "stage-1",
      repoRoot: "/tmp/project",
      createdAt: "2026-03-16T00:00:00.000Z",
      findingsSummary: "Remote workflow repeated.",
      rationale: "Durable.",
      changes: [{ path: "brain/notes/remote-workflow.md", content: "# Remote Workflow\n" }],
      status: "staged",
    },
  };

  const result = await handlers.get("input")?.[0]?.(
    { text: "no", source: "interactive" },
    {
      isIdle: () => true,
      hasUI: true,
      sessionManager: createSessionManager({ branch: [staged], entries: [staged] }),
      ui: { notify() {} },
    },
  );

  assert.deepEqual(result, { action: "handled" });
  assert.match(sentMessages[0]?.message.content ?? "", /no brain changes were written/i);
});

test("ruminate confirm follow-up in print mode stays preview-only", async () => {
  const { api, handlers } = createApi();
  brainContext(api as any);

  const staged = {
    type: "custom",
    customType: "brainmaxx-ruminate-stage",
    data: {
      stageId: "stage-print",
      repoRoot: "/tmp/project",
      createdAt: "2026-03-16T00:00:00.000Z",
      findingsSummary: "Durable pattern found.",
      rationale: "Durable.",
      changes: [{ path: "brain/notes/example.md", content: "# Example\n" }],
      status: "staged",
    },
  };

  const output: string[] = [];
  const originalLog = console.log;
  let result: unknown;

  try {
    console.log = (message?: unknown) => output.push(String(message ?? ""));
    result = await handlers.get("input")?.[0]?.(
      { text: "yes", source: "interactive" },
      {
        isIdle: () => true,
        hasUI: false,
        sessionManager: createSessionManager({ branch: [staged], entries: [staged] }),
        ui: { notify() {} },
      },
    );
  } finally {
    console.log = originalLog;
  }

  assert.deepEqual(result, { action: "handled" });
  assert.match(output.join("\n"), /pi -p \"\/ruminate\" has no apply step/i);
  assert.match(output.join("\n"), /no brain changes were written/i);
});

test("brainmaxx_apply_changes enforces brain-only targets and syncs entrypoints", async () => {
  const { api, commands, tools, customEntries } = createApi();
  const repoRoot = await tempRepo();

  brainContext(api as any);
  await commands.get("brain-init")?.handler("", {
    cwd: repoRoot,
    hasUI: true,
    ui: { notify() {} },
  });

  const stage = {
    type: "custom",
    customType: "brainmaxx-ruminate-stage",
    data: {
      stageId: "stage-apply",
      repoRoot,
      createdAt: "2026-03-16T00:00:00.000Z",
      findingsSummary: "Remote workflow repeated.",
      rationale: "Durable.",
      changes: [{ path: "brain/notes/remote-workflow.md", content: "# Remote Workflow\n\nUse tmux first.\n" }],
      status: "staged",
    },
  };

  const result = await tools.get("brainmaxx_apply_changes")?.execute(
    "tool",
    { stageId: "stage-apply" },
    undefined,
    undefined,
    {
      cwd: repoRoot,
      sessionManager: createSessionManager({ branch: [stage], entries: [stage] }),
    },
  );

  assert.match(result?.content?.[0]?.text ?? "", /Changed: brain\/notes\/remote-workflow\.md/);
  assert.ok(await fs.stat(path.join(repoRoot, "brain/notes/remote-workflow.md")));
  assert.equal(customEntries.length, 1);
});

test("brainmaxx_apply_changes rejects paths outside brain notes and principles", async () => {
  const { api, commands, tools } = createApi();
  const repoRoot = await tempRepo();

  brainContext(api as any);
  await commands.get("brain-init")?.handler("", {
    cwd: repoRoot,
    hasUI: true,
    ui: { notify() {} },
  });

  const applyTool = tools.get("brainmaxx_apply_changes");
  assert.ok(applyTool);

  await assert.rejects(
    applyTool.execute(
      "tool",
      { changes: [{ path: "README.md", content: "# nope\n" }] },
      undefined,
      undefined,
      { cwd: repoRoot, sessionManager: createSessionManager() },
    ),
    /brain\/notes\/ or brain\/principles\//,
  );
});
