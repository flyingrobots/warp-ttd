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

test("admission-chain backlog keeps registration and handle as primary facts", () => {
  const content = readRepoText("docs/method/backlog/up-next/PROTO_admission-chain-inspector.md");

  assert.match(content, /- `OpticRegistrationDescriptor`/);
  assert.match(content, /- Echo-owned `OpticArtifactHandle`/);
  assert.match(content, /artifact registration, registration descriptor, handle/);
});

test("README documents the Wesley sibling checkout needed by generation", () => {
  const content = readRepoText("README.md");

  assert.match(content, /sibling checkout/i);
  assert.match(content, /\.\.\/wesley\/crates\/wesley-cli\/Cargo\.toml/);
});
