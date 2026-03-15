import fs from "node:fs/promises";
import path from "node:path";
import { readFileIfPresent } from "./fs-helpers.js";

export const BRAINMAXX_AGENTS_BLOCK_START = "<!-- brainmaxx:start -->";
export const BRAINMAXX_AGENTS_BLOCK_END = "<!-- brainmaxx:end -->";

export type CodexAgentsUpdateResult = {
  status: "created" | "updated" | "unchanged";
  path: string;
  content: string;
};

type BlockMatch = {
  start: number;
  end: number;
};

const AGENTS_FILE = "AGENTS.md";

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const blockRegex = new RegExp(
  `${escapeRegex(BRAINMAXX_AGENTS_BLOCK_START)}[\\s\\S]*?${escapeRegex(BRAINMAXX_AGENTS_BLOCK_END)}`,
  "g",
);

const normalizeTrailingNewline = (value: string): string => (value.endsWith("\n") ? value : `${value}\n`);

const findManagedBlocks = (content: string): BlockMatch[] => {
  const matches: BlockMatch[] = [];
  for (const match of content.matchAll(blockRegex)) {
    if (match.index === undefined) {
      continue;
    }
    matches.push({ start: match.index, end: match.index + match[0].length });
  }
  return matches;
};

export const renderCodexAgentsBlock = (): string =>
  [
    BRAINMAXX_AGENTS_BLOCK_START,
    "brainmaxx managed block",
    "",
    "Before non-trivial repo work, read `brain/index.md` and `brain/principles.md`.",
    "Treat them as durable repo memory. Edit linked principle files or notes, not",
    "the generated entrypoints themselves.",
    BRAINMAXX_AGENTS_BLOCK_END,
  ].join("\n");

export const stripCodexManagedBlock = (content: string): string => {
  const stripped = content.replace(blockRegex, "").replace(/\n{3,}/g, "\n\n").trim();
  return stripped === "" ? "" : `${stripped}\n`;
};

export const updateCodexAgentsContent = (content: string | null): CodexAgentsUpdateResult => {
  const managedBlock = renderCodexAgentsBlock();
  const normalizedBlock = normalizeTrailingNewline(managedBlock);

  if (content === null) {
    return {
      status: "created",
      path: AGENTS_FILE,
      content: normalizedBlock,
    };
  }

  const blocks = findManagedBlocks(content);
  if (blocks.length > 1) {
    throw new Error(`Multiple brainmaxx managed blocks found in ${AGENTS_FILE}. Clean them up manually before re-running brainmaxx-init.`);
  }

  const normalizedContent = normalizeTrailingNewline(content);
  if (blocks.length === 1) {
    const block = blocks[0]!;
    const updated =
      normalizedContent.slice(0, block.start) + managedBlock + normalizedContent.slice(block.end);
    const withNewline = normalizeTrailingNewline(updated);
    return {
      status: withNewline === normalizedContent ? "unchanged" : "updated",
      path: AGENTS_FILE,
      content: withNewline,
    };
  }

  const separator = normalizedContent.trim().length === 0 ? "" : "\n";
  return {
    status: "updated",
    path: AGENTS_FILE,
    content: `${normalizedContent}${separator}${normalizedBlock}`,
  };
};

export const upsertCodexAgentsBlock = async (projectRoot: string): Promise<CodexAgentsUpdateResult> => {
  const agentsPath = path.join(projectRoot, AGENTS_FILE);
  const current = await readFileIfPresent(agentsPath);
  const updated = updateCodexAgentsContent(current);

  if (current !== updated.content) {
    await fs.writeFile(agentsPath, updated.content);
  }

  return updated;
};
