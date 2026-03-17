const TRANSCRIPT_FOOTER = "\n[brainerd] Transcript truncated to fit the current-session budget.";

type SessionManagerLike = {
  getBranch(fromId?: string): Array<any>;
  getHeader(): { cwd: string; timestamp: string } | null;
};

export type CurrentSessionSnapshot = {
  cwd: string;
  startedAt: string;
  transcript: string;
  assistantModels: string[];
  messageCount: number;
};

const textFromContent = (content: unknown): string[] => {
  if (typeof content === "string") {
    return [content];
  }
  if (!Array.isArray(content)) {
    return [];
  }

  const parts: string[] = [];
  for (const block of content) {
    if (!block || typeof block !== "object") {
      continue;
    }
    const typed = block as { type?: string; text?: string };
    if (typed.type === "text" && typeof typed.text === "string") {
      parts.push(typed.text);
    }
  }

  return parts;
};

const appendLine = (
  lines: string[],
  line: string,
  state: { length: number; truncated: boolean },
  maxChars: number,
): void => {
  if (state.truncated) {
    return;
  }

  const separator = lines.length === 0 ? "" : "\n\n";
  const nextLength = state.length + separator.length + line.length;
  if (nextLength <= maxChars) {
    lines.push(line);
    state.length = nextLength;
    return;
  }

  const remaining = maxChars - state.length - separator.length - TRANSCRIPT_FOOTER.length;
  if (remaining > 0) {
    lines.push(line.slice(0, remaining));
    state.length += separator.length + remaining;
  }
  state.truncated = true;
};

export const collectCurrentSessionSnapshot = (
  sessionManager: SessionManagerLike,
  anchorEntryId: string | null,
  maxChars = 8_000,
): CurrentSessionSnapshot => {
  const header = sessionManager.getHeader();
  const cwd = header?.cwd ?? "";
  const startedAt = header?.timestamp ?? "";

  if (!anchorEntryId) {
    return {
      cwd,
      startedAt,
      transcript: "",
      assistantModels: [],
      messageCount: 0,
    };
  }

  const branch = sessionManager.getBranch(anchorEntryId);
  const transcriptLines: string[] = [];
  const assistantModels = new Set<string>();
  const state = { length: 0, truncated: false };
  let messageCount = 0;

  for (const entry of branch) {
    if (entry.type !== "message" || !entry.message || typeof entry.message !== "object") {
      continue;
    }

    const message = entry.message as {
      role?: string;
      content?: unknown;
      provider?: string;
      model?: string;
      toolName?: string;
      isError?: boolean;
      command?: string;
      output?: string;
      excludeFromContext?: boolean;
    };

    if (message.role === "user" || message.role === "assistant" || message.role === "toolResult") {
      const text = textFromContent(message.content).join("\n").trim();
      if (!text) {
        continue;
      }

      messageCount += 1;
      if (message.role === "assistant" && message.provider && message.model) {
        assistantModels.add(`${message.provider}/${message.model}`);
      }

      if (message.role === "user") {
        appendLine(transcriptLines, `User: ${text}`, state, maxChars);
        continue;
      }
      if (message.role === "assistant") {
        appendLine(transcriptLines, `Assistant: ${text}`, state, maxChars);
        continue;
      }

      const prefix = message.isError
        ? `Tool ${message.toolName ?? "unknown"} error`
        : `Tool ${message.toolName ?? "unknown"} result`;
      appendLine(transcriptLines, `${prefix}: ${text}`, state, maxChars);
      continue;
    }

    if (message.role === "bashExecution") {
      if (message.excludeFromContext) {
        continue;
      }
      const output = typeof message.output === "string" ? message.output.trim() : "";
      const command = typeof message.command === "string" ? message.command.trim() : "unknown";
      const text = output ? `Bash: ${command}\n${output}` : `Bash: ${command}`;
      messageCount += 1;
      appendLine(transcriptLines, text, state, maxChars);
    }
  }

  const transcript = transcriptLines.join("\n\n");
  return {
    cwd,
    startedAt,
    transcript: state.truncated ? `${transcript}${TRANSCRIPT_FOOTER}` : transcript,
    assistantModels: Array.from(assistantModels).sort((a, b) => a.localeCompare(b)),
    messageCount,
  };
};
