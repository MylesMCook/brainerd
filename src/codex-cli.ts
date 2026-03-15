#!/usr/bin/env node

import path from "node:path";
import { initCodexBrain, syncCodexBrain } from "./codex.js";
import { collectCodexRepoSessions } from "./codex-sessions.js";
import { resolveProjectRoot } from "./project-root.js";

type Command = "init" | "sync" | "repo-sessions";

const usage = (): string =>
  [
    "Usage:",
    "  node --import tsx src/codex-cli.ts init [--apply-bootstrap] [--cwd <path>]",
    "  node --import tsx src/codex-cli.ts sync [--cwd <path>]",
    "  node --import tsx src/codex-cli.ts repo-sessions [--cwd <path>] [--max-sessions <n>] [--max-chars-per-session <n>] [--min-sessions <n>] [--current-thread-id <id>]",
  ].join("\n");

const parseArgs = (
  argv: string[],
): {
  command: Command;
  cwd: string;
  applyBootstrap: boolean;
  maxSessions?: number;
  maxCharsPerSession?: number;
  minSessions?: number;
  currentThreadId?: string;
} => {
  const [command, ...rest] = argv;
  if (command !== "init" && command !== "sync" && command !== "repo-sessions") {
    throw new Error(usage());
  }

  let cwd = process.cwd();
  let applyBootstrap = false;
  let maxSessions: number | undefined;
  let maxCharsPerSession: number | undefined;
  let minSessions: number | undefined;
  let currentThreadId: string | undefined;

  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index];
    if (token === "--apply-bootstrap") {
      applyBootstrap = true;
      continue;
    }

    const value = rest[index + 1];
    if ((token === "--cwd" || token === "--max-sessions" || token === "--max-chars-per-session" || token === "--min-sessions" || token === "--current-thread-id") && !value) {
      throw new Error(`Missing value for ${token}`);
    }

    switch (token) {
      case "--cwd":
        cwd = path.resolve(value!);
        index += 1;
        break;
      case "--max-sessions":
        maxSessions = Number.parseInt(value!, 10);
        index += 1;
        break;
      case "--max-chars-per-session":
        maxCharsPerSession = Number.parseInt(value!, 10);
        index += 1;
        break;
      case "--min-sessions":
        minSessions = Number.parseInt(value!, 10);
        index += 1;
        break;
      case "--current-thread-id":
        currentThreadId = value!;
        index += 1;
        break;
      default:
        throw new Error(`Unsupported argument: ${token}`);
    }
  }

  return {
    command,
    cwd,
    applyBootstrap,
    maxSessions,
    maxCharsPerSession,
    minSessions,
    currentThreadId,
  };
};

const formatBrainSummary = (projectRoot: string, created: string[], synced: string[]): string => {
  const createdLabel = created.length > 0 ? created.join(", ") : "nothing new";
  const syncedLabel = synced.length > 0 ? synced.join(", ") : "none";
  return `Brain initialized at ${path.join(projectRoot, "brain")} (${createdLabel}). Synced: ${syncedLabel}.`;
};

const formatBootstrapPreview = (noteRelativePath: string, sourceFiles: string[], content: string): string =>
  [
    `Operational bootstrap preview for ${noteRelativePath}`,
    sourceFiles.length > 0 ? `Sources: ${sourceFiles.join(", ")}` : "Sources: none",
    "",
    content.trim(),
  ].join("\n");

const printInit = async (cwd: string, applyBootstrap: boolean): Promise<void> => {
  const projectRoot = await resolveProjectRoot(cwd);
  const result = await initCodexBrain(projectRoot, { applyBootstrap });

  console.log(formatBrainSummary(projectRoot, result.brain.created, result.brain.synced));
  console.log(`AGENTS.md: ${result.agents.status}`);

  if (result.bootstrap.status === "ready") {
    console.log("");
    console.log(formatBootstrapPreview(result.bootstrap.noteRelativePath, result.bootstrap.sourceFiles, result.bootstrap.content));
    console.log("");
    console.log("Re-run with --apply-bootstrap to create this note.");
    return;
  }

  if (result.bootstrap.status === "created") {
    console.log(
      `Created ${result.bootstrap.noteRelativePath} from ${result.bootstrap.sourceFiles.join(", ")}. Synced: ${result.bootstrap.synced.join(", ") || "none"}.`,
    );
    return;
  }

  console.log(result.bootstrap.reason);
};

const printSync = async (cwd: string): Promise<void> => {
  const projectRoot = await resolveProjectRoot(cwd);
  const result = await syncCodexBrain(projectRoot);

  console.log(`Repo root: ${projectRoot}`);
  console.log(`Updated: ${result.updated.length > 0 ? result.updated.join(", ") : "none"}`);
  console.log(`Skipped: ${result.skipped.length > 0 ? result.skipped.join(", ") : "none"}`);
};

const printRepoSessions = async (
  cwd: string,
  options: {
    currentThreadId?: string;
    maxSessions?: number;
    maxCharsPerSession?: number;
    minSessions?: number;
  },
): Promise<void> => {
  const result = await collectCodexRepoSessions({
    cwd,
    currentThreadId: options.currentThreadId ?? process.env.CODEX_THREAD_ID,
    maxSessions: options.maxSessions,
    maxCharsPerSession: options.maxCharsPerSession,
    minSessions: options.minSessions,
  });

  console.log(`Repo root: ${result.repoRoot}`);
  console.log(`Readiness: ${result.readiness.status}`);
  console.log(`Reason: ${result.readiness.reason}`);
  console.log(`Scanned files: ${result.scannedFiles}`);
  console.log(`Repo candidates: ${result.candidateFiles}`);
  console.log(`Readable sessions: ${result.sessions.length}`);
  console.log(`Skipped files: ${result.skippedFiles}`);

  if (result.warnings.length > 0) {
    console.log("");
    console.log("Warnings:");
    for (const warning of result.warnings) {
      console.log(`- ${warning}`);
    }
  }

  for (const session of result.sessions) {
    console.log("");
    console.log(`## ${session.startedAt}`);
    console.log(`id: ${session.sessionId}`);
    console.log(`cwd: ${session.cwd}`);
    console.log(`messages: ${session.messageCount}`);
    console.log(`models: ${session.assistantModels.length > 0 ? session.assistantModels.join(", ") : "unknown"}`);
    console.log(session.transcript);
  }
};

const main = async (): Promise<void> => {
  const args = parseArgs(process.argv.slice(2));
  switch (args.command) {
    case "init":
      await printInit(args.cwd, args.applyBootstrap);
      return;
    case "sync":
      await printSync(args.cwd);
      return;
    case "repo-sessions":
      await printRepoSessions(args.cwd, {
        currentThreadId: args.currentThreadId,
        maxSessions: args.maxSessions,
        maxCharsPerSession: args.maxCharsPerSession,
        minSessions: args.minSessions,
      });
  }
};

main().catch((error) => {
  console.error((error as Error).message);
  process.exitCode = 1;
});
