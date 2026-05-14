import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const ROOT = path.resolve(import.meta.dirname, "..");

function readRepoText(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf-8");
}

function repoPathExists(relativePath: string): boolean {
  return fs.existsSync(path.join(ROOT, relativePath));
}

test("MCP admission-chain surface is closed as a landed cycle", () => {
  const graveyardPath = "docs/method/graveyard/DELIVERY_mcp-admission-chain-surface.md";

  assert.equal(
    repoPathExists("docs/method/backlog/asap/DELIVERY_mcp-admission-chain-surface.md"),
    false,
  );
  assert.equal(repoPathExists(graveyardPath), true);

  const design = readRepoText(
    "docs/design/0019-mcp-admission-chain-surface/mcp-admission-chain-surface.md",
  );
  const content = readRepoText(graveyardPath);

  assert.match(design, /status: landed/);
  assert.match(content, /\*\*Status:\*\* complete/);
  assert.doesNotMatch(content, /mirror the current structured CLI/i);
  assert.match(content, /MCP should not mirror CLI\./);
  assert.match(content, /MCP should expose the lawful admission chain\./);
  assert.match(content, /MCP is transport and inspection\./);
  assert.match(content, /It is not authority, admission, grants, or\s+mutation\./);
  assert.doesNotMatch(content, /present an invocation for admission/i);
  assert.match(content, /inspect capability presentation and invocation posture/i);

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

test("bearing promotes admission-chain read model before strand speculation", () => {
  assert.equal(
    repoPathExists("docs/method/backlog/asap/D-strand-speculation.md"),
    false,
  );
  assert.equal(
    repoPathExists("docs/method/backlog/up-next/D-strand-speculation.md"),
    true,
  );

  const bearing = readRepoText("docs/BEARING.md");
  const strand = readRepoText("docs/method/backlog/up-next/D-strand-speculation.md");

  assert.match(bearing, /Admission-Chain Read Model/);
  assert.match(
    bearing,
    /docs\/method\/backlog\/up-next\/PROTO_admission-chain-inspector\.md/,
  );
  assert.doesNotMatch(
    bearing,
    /docs\/method\/backlog\/asap\/DELIVERY_mcp-admission-chain-surface\.md/,
  );
  assert.match(
    bearing,
    /MCP is not authority, admission, grant issuance, or\s+mutation\./,
  );
  assert.match(strand, /blocked by admission-chain representation/);
  assert.match(strand, /No strand creation before admission-chain representation exists\./);
});

test("admission-chain backlog keeps registration and handle as primary facts", () => {
  const content = readRepoText("docs/method/backlog/up-next/PROTO_admission-chain-inspector.md");

  assert.match(content, /- `OpticRegistrationDescriptor`/);
  assert.match(content, /- Echo-owned `OpticArtifactHandle`/);
  assert.match(content, /artifact registration, registration descriptor, handle/);
});

test("bearing names jedit and graft as live debugger targets", () => {
  const bearing = readRepoText("docs/BEARING.md");
  const backlog = readRepoText("docs/method/backlog/up-next/DELIVERY_dual-live-app-debugging.md");

  for (const content of [bearing, backlog]) {
    assert.match(content, /jedit/i);
    assert.match(content, /live Echo app/i);
    assert.match(content, /graft/i);
    assert.match(content, /live git-warp app/i);
  }

  assert.match(
    backlog,
    /same debugger surface can inspect both apps without becoming either app's\s+domain model/i,
  );
});

test("README documents the Wesley sibling checkout needed by generation", () => {
  const content = readRepoText("README.md");

  assert.match(content, /sibling checkout/i);
  assert.match(content, /\.\.\/wesley\/crates\/wesley-cli\/Cargo\.toml/);
});

test("navigator design uses exact AdapterCapability enum literals", () => {
  const content = readRepoText("docs/design/0009-navigator-view/0013-navigator-view-design.md");

  assert.doesNotMatch(content, /`read:/);
  assert.match(content, /`READ_RECEIPTS`/);
  assert.match(content, /`READ_EFFECT_EMISSIONS`/);
  assert.match(content, /`READ_DELIVERY_OBSERVATIONS`/);
});

test("materialized reading inspector stays in CORE_VIEWS taxonomy", () => {
  const cvPath = "docs/method/backlog/up-next/CV_materialized-reading-inspector.md";
  const vizPath = "docs/method/backlog/up-next/VIZ_materialized-reading-inspector.md";

  assert.equal(repoPathExists(cvPath), true);
  assert.equal(repoPathExists(vizPath), false);
  assert.match(readRepoText(cvPath), /\*\*Legend:\*\* CORE_VIEWS/);
});

test("lint ratchet doctrine reflects zero ceiling", () => {
  assert.equal(readRepoText("lint-ceiling.txt").trim(), "0");
  assert.equal(
    repoPathExists("docs/method/backlog/bad-code/lint-ratchet-hot-files.md"),
    false,
  );
  assert.equal(
    repoPathExists("docs/method/graveyard/lint-ratchet-hot-files.md"),
    true,
  );

  const policy = readRepoText("docs/method/backlog/lint-ratchet.md");
  assert.match(policy, /\*\*Status:\*\* complete/);
  assert.doesNotMatch(policy, /does not yet comply/i);
});
