import test from "node:test";
import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { buildInjectedBrainMessage } from "../src/injection.js";

test("ambient injection includes both entrypoints when under the size guard", () => {
  const result = buildInjectedBrainMessage("# Brain\n\nShort.\n", "# Principles\n\nShort.\n", {
    maxBytes: 1000,
    maxLines: 40,
  });

  assert.equal(result.includedIndex, true);
  assert.equal(result.truncated, false);
  assert.match(result.content, /# brain\/index\.md/);
  assert.match(result.content, /# brain\/principles\.md/);
});

test("ambient injection falls back to principles only when the full entrypoints exceed the size guard", () => {
  const result = buildInjectedBrainMessage("# Brain\n\n" + "line\n".repeat(200), "# Principles\n\nShort.\n", {
    maxBytes: 1200,
    maxLines: 40,
  });

  assert.equal(result.includedIndex, false);
  assert.equal(result.truncated, false);
  assert.doesNotMatch(result.content, /# brain\/index\.md/);
  assert.match(result.content, /omitted from ambient context/);
});

test("ambient injection truncates principles deterministically when even principles-only content is too large", () => {
  const result = buildInjectedBrainMessage("# Brain\n\nHuge.\n", "# Principles\n\n" + "rule\n".repeat(300), {
    maxBytes: 900,
    maxLines: 25,
  });

  assert.equal(result.includedIndex, false);
  assert.equal(result.truncated, true);
  assert.match(result.content, /truncated to fit the ambient context budget/);
  assert.ok(Buffer.byteLength(result.content, "utf8") <= 900);
  assert.ok(result.content.split("\n").length <= 25);
});
