import path from "node:path";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { buildInjectedBrainMessage } from "../src/injection.js";
import {
  hasBrainEntrypoints,
  initBrain,
  readEntrypoints,
  syncOwnedEntryPoints,
} from "../src/brain.js";
import { findGitRoot, resolveProjectRoot } from "../src/project-root.js";
import { collectRepoSessions } from "../src/sessions.js";

const queueSkill = (pi: ExtensionAPI, skillName: "reflect" | "ruminate", args: string, isIdle: boolean): void => {
  const message = args.trim() ? `/skill:${skillName} ${args.trim()}` : `/skill:${skillName}`;
  if (isIdle) {
    pi.sendUserMessage(message);
  } else {
    pi.sendUserMessage(message, { deliverAs: "followUp" });
  }
};

export default function brainContext(pi: ExtensionAPI): void {
  pi.registerCommand("brain-init", {
    description: "Initialize a project-local brain in the current repo",
    handler: async (_args, ctx) => {
      try {
        const gitRoot = await findGitRoot(ctx.cwd);
        const projectRoot = await resolveProjectRoot(ctx.cwd);
        const result = await initBrain(projectRoot);
        const created = result.created.length > 0 ? result.created.join(", ") : "nothing new";
        const synced = result.synced.length > 0 ? ` Synced: ${result.synced.join(", ")}.` : "";
        if (!gitRoot) {
          ctx.ui.notify("No .git directory was found. /brain-init used the current directory as the project root.", "warning");
        }
        ctx.ui.notify(`Brain initialized at ${path.join(projectRoot, "brain")} (${created}).${synced}`, "info");
      } catch (error) {
        ctx.ui.notify(`pi-brainmaxx failed to initialize the brain: ${(error as Error).message}`, "error");
      }
    },
  });

  pi.registerCommand("reflect", {
    description: "Capture durable learnings from the current Pi session into the project brain",
    handler: async (args, ctx) => {
      try {
        const projectRoot = await resolveProjectRoot(ctx.cwd);
        if (!(await hasBrainEntrypoints(projectRoot))) {
          ctx.ui.notify("No project brain found. Run /brain-init first.", "warning");
          return;
        }
        queueSkill(pi, "reflect", args, ctx.isIdle());
        if (!ctx.isIdle()) {
          ctx.ui.notify("/reflect queued", "info");
        }
      } catch (error) {
        ctx.ui.notify(`pi-brainmaxx could not start /reflect: ${(error as Error).message}`, "error");
      }
    },
  });

  pi.registerCommand("ruminate", {
    description: "Mine older Pi sessions for missed durable knowledge in this repo",
    handler: async (args, ctx) => {
      try {
        const projectRoot = await resolveProjectRoot(ctx.cwd);
        if (!(await hasBrainEntrypoints(projectRoot))) {
          ctx.ui.notify("No project brain found. Run /brain-init first.", "warning");
          return;
        }
        queueSkill(pi, "ruminate", args, ctx.isIdle());
        if (!ctx.isIdle()) {
          ctx.ui.notify("/ruminate queued", "info");
        }
      } catch (error) {
        ctx.ui.notify(`pi-brainmaxx could not start /ruminate: ${(error as Error).message}`, "error");
      }
    },
  });

  pi.on("before_agent_start", async (_event, ctx) => {
    try {
      const projectRoot = await resolveProjectRoot(ctx.cwd);
      const entrypoints = await readEntrypoints(projectRoot);
      if (!entrypoints) {
        return;
      }

      const injection = buildInjectedBrainMessage(entrypoints.index, entrypoints.principles);
      return {
        message: {
          customType: "brainmaxx-context",
          content: injection.content,
          display: false,
        },
      };
    } catch (error) {
      if (ctx.hasUI) {
        ctx.ui.notify(`pi-brainmaxx skipped ambient brain loading: ${(error as Error).message}`, "warning");
      }
      console.warn(`pi-brainmaxx skipped ambient brain loading: ${(error as Error).message}`);
      return;
    }
  });

  pi.registerTool({
    name: "brainmaxx_sync_entrypoints",
    label: "Sync brain entrypoints",
    description: "Regenerate package-owned brain entrypoints after approved brain changes",
    parameters: Type.Object({}),
    async execute(_toolCallId, _params, _signal, _onUpdate, ctx) {
      const projectRoot = await resolveProjectRoot(ctx.cwd);
      const result = await syncOwnedEntryPoints(projectRoot);
      const lines = [
        `Repo root: ${projectRoot}`,
        `Updated: ${result.updated.length > 0 ? result.updated.join(", ") : "none"}`,
        `Skipped: ${result.skipped.length > 0 ? result.skipped.join(", ") : "none"}`,
      ];
      return {
        content: [{ type: "text", text: lines.join("\n") }],
        details: result,
      };
    },
  });

  pi.registerTool({
    name: "brainmaxx_repo_sessions",
    label: "Repo Pi sessions",
    description: "Load repo-scoped Pi session transcripts for rumination",
    parameters: Type.Object({
      maxSessions: Type.Optional(Type.Integer({ minimum: 1, maximum: 50, default: 25 })),
      maxCharsPerSession: Type.Optional(Type.Integer({ minimum: 500, maximum: 20_000, default: 8_000 })),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const result = await collectRepoSessions({
        cwd: ctx.cwd,
        currentSessionFile: ctx.sessionManager.getSessionFile(),
        maxSessions: params.maxSessions,
        maxCharsPerSession: params.maxCharsPerSession,
      });

      const lines = [`Repo root: ${result.repoRoot}`, `Sessions: ${result.sessions.length}`];
      if (result.warnings.length > 0) {
        lines.push("", "Warnings:");
        for (const warning of result.warnings) {
          lines.push(`- ${warning}`);
        }
      }
      for (const session of result.sessions) {
        lines.push(
          "",
          `## ${session.startedAt}`,
          `cwd: ${session.cwd}`,
          `messages: ${session.messageCount}`,
          `models: ${session.assistantModels.length > 0 ? session.assistantModels.join(", ") : "unknown"}`,
          session.transcript || "[brainmaxx] No readable conversation text found.",
        );
      }

      return {
        content: [{ type: "text", text: lines.join("\n") }],
        details: result,
      };
    },
  });
}
