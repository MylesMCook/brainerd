import { initBrain, syncOwnedEntryPoints, type BrainInitResult, type BrainSyncResult } from "./brain.js";
import {
  applyOperationalBootstrap,
  planOperationalBootstrap,
  type OperationalBootstrapApplyResult,
  type OperationalBootstrapPlan,
} from "./bootstrap.js";
import { planCodexAgentsUpdate, upsertCodexAgentsBlock, type CodexAgentsUpdateResult } from "./codex-agents.js";

export type CodexInitOptions = {
  applyBootstrap?: boolean;
};

export type CodexInitResult = {
  projectRoot: string;
  brain: BrainInitResult;
  agents: CodexAgentsUpdateResult;
  bootstrap: OperationalBootstrapPlan | OperationalBootstrapApplyResult;
};

export const initCodexBrain = async (
  projectRoot: string,
  options: CodexInitOptions = {},
): Promise<CodexInitResult> => {
  await planCodexAgentsUpdate(projectRoot);
  const brain = await initBrain(projectRoot);
  const agents = await upsertCodexAgentsBlock(projectRoot);
  const bootstrap = options.applyBootstrap
    ? await applyOperationalBootstrap(projectRoot)
    : await planOperationalBootstrap(projectRoot);

  return {
    projectRoot,
    brain,
    agents,
    bootstrap,
  };
};

export const syncCodexBrain = async (projectRoot: string): Promise<BrainSyncResult> => {
  return syncOwnedEntryPoints(projectRoot);
};
