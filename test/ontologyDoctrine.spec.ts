import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const ROOT = path.resolve(import.meta.dirname, "..");

function readRepoText(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf-8");
}

test("MCP backlog exposes the admission chain instead of mirroring CLI", () => {
  const content = readRepoText("docs/method/backlog/up-next/DELIVERY_mcp-agent-surface.md");

  assert.doesNotMatch(content, /mirror the current structured CLI/i);
  assert.match(content, /MCP should not mirror CLI\./);
  assert.match(content, /MCP should expose the lawful admission chain\./);

  for (const noun of [
    "registered optic handles",
    "artifact requirements",
    "grant posture",
    "admission ticket",
    "witness",
    "receipt",
    "reading envelope",
  ]) {
    assert.match(content, new RegExp(noun, "i"));
  }
});
