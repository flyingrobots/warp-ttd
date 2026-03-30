/**
 * CLI --json output contract tests.
 *
 * Pins the JSONL output format: every line must be valid JSON with
 * an "envelope" field identifying the protocol type.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);

const CLI = "./src/cli.ts";
const NODE_ARGS = ["--experimental-strip-types", CLI];

async function runJson(command: string): Promise<string[]> {
  const { stdout } = await exec("node", [...NODE_ARGS, command, "--json"]);
  const lines = stdout.trim().split("\n").filter((l) => l.length > 0);
  return lines;
}

function parseLine(line: string): { envelope: string; data?: Record<string, unknown>; label?: string } {
  const parsed = JSON.parse(line) as { envelope: string; data?: Record<string, unknown>; label?: string };
  assert.equal(typeof parsed.envelope, "string", `Missing envelope field in: ${line}`);
  return parsed;
}

test("hello --json outputs a single HostHello JSONL line", async () => {
  const lines = await runJson("hello");
  assert.equal(lines.length, 1);

  const obj = parseLine(lines[0]!);
  assert.equal(obj.envelope, "HostHello");
  assert.ok(obj.data !== undefined);
  assert.equal((obj.data as Record<string, unknown>)["protocolVersion"], "0.1.0");
});

test("catalog --json outputs a single LaneCatalog JSONL line", async () => {
  const lines = await runJson("catalog");
  assert.equal(lines.length, 1);

  const obj = parseLine(lines[0]!);
  assert.equal(obj.envelope, "LaneCatalog");
  assert.ok(obj.data !== undefined);
});

test("frame --json outputs PlaybackHeadSnapshot, PlaybackFrame, and ReceiptSummary lines", async () => {
  const lines = await runJson("frame");
  assert.ok(lines.length >= 2, "Expected at least head + frame lines");

  const envelopes = lines.map((l) => parseLine(l).envelope);
  assert.ok(envelopes.includes("PlaybackHeadSnapshot"));
  assert.ok(envelopes.includes("PlaybackFrame"));
  // ReceiptSummary may be absent at frame 0
});

test("step --json outputs before/after head snapshots with labels", async () => {
  const lines = await runJson("step");
  assert.ok(lines.length >= 3, "Expected before + stepped + after lines");

  const parsed = lines.map((l) => parseLine(l));
  const beforeHead = parsed.find((p) => p.envelope === "PlaybackHeadSnapshot" && p.label === "before");
  const steppedFrame = parsed.find((p) => p.envelope === "PlaybackFrame" && p.label === "stepped");
  const afterHead = parsed.find((p) => p.envelope === "PlaybackHeadSnapshot" && p.label === "after");

  assert.ok(beforeHead !== undefined, "Expected before head snapshot");
  assert.ok(steppedFrame !== undefined, "Expected stepped frame");
  assert.ok(afterHead !== undefined, "Expected after head snapshot");
});

test("--json stdout contains no human-readable text", async () => {
  const lines = await runJson("hello");

  for (const line of lines) {
    // Every line must start with { and be valid JSON
    assert.ok(line.startsWith("{"), `Non-JSON line found: ${line}`);
    JSON.parse(line); // throws if invalid
  }
});

test("demo --json outputs multiple envelope lines", async () => {
  const lines = await runJson("demo");
  assert.ok(lines.length >= 5, "Demo should produce multiple envelope lines");

  // Every line is valid JSONL with envelope field
  for (const line of lines) {
    parseLine(line);
  }
});
