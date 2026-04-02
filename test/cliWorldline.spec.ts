/**
 * CLI worldline --json output contract tests.
 *
 * Cycle 0010 — Worldline Viewer (RED phase).
 *
 * Pins the JSONL output format for the worldline command: one line
 * per tick in the history, with writer attribution, strand info,
 * and conflict indicators.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);

const CLI = "./src/cli.ts";
const NODE_ARGS = ["--experimental-strip-types", CLI];

interface EnvelopeLine {
  envelope: string;
  data?: Record<string, unknown>;
  label?: string;
}

async function runJson(command: string): Promise<string[]> {
  const { stdout } = await exec("node", [...NODE_ARGS, command, "--json"]);
  const lines = stdout.trim().split("\n").filter((l) => l.length > 0);
  return lines;
}

function parseLine(line: string): EnvelopeLine {
  const parsed = JSON.parse(line) as EnvelopeLine;
  assert.equal(typeof parsed.envelope, "string", `Missing envelope field in: ${line}`);
  return parsed;
}

test("worldline --json outputs WorldlineTick envelopes", async () => {
  // const lines = await runJson("worldline");
  // assert.ok(lines.length >= 1, "Expected at least one tick");
  // const parsed = lines.map((l) => parseLine(l));
  // for (const entry of parsed) {
  //   assert.equal(entry.envelope, "WorldlineTick");
  // }
  assert.fail("not implemented — RED");
});

test("worldline --json tick data includes frameIndex, laneId, and tick", async () => {
  // const lines = await runJson("worldline");
  // const first = parseLine(lines[0]);
  // assert.ok(first.data !== undefined);
  // assert.ok("frameIndex" in first.data);
  // assert.ok("laneId" in first.data);
  // assert.ok("tick" in first.data);
  assert.fail("not implemented — RED");
});

test("worldline --json includes writer attribution per tick", async () => {
  // const lines = await runJson("worldline");
  // const withReceipts = lines.map((l) => parseLine(l))
  //   .filter((p) => Array.isArray(p.data?.["writers"]) && p.data["writers"].length > 0);
  // assert.ok(withReceipts.length > 0, "Expected at least one tick with writers");
  assert.fail("not implemented — RED");
});

test("worldline --json includes btrDigest when available", async () => {
  // const lines = await runJson("worldline");
  // const withDigest = lines.map((l) => parseLine(l))
  //   .filter((p) => p.data?.["btrDigest"] !== undefined);
  // assert.ok(withDigest.length > 0, "Expected at least one tick with a digest");
  assert.fail("not implemented — RED");
});

test("worldline --json includes hasConflict boolean", async () => {
  // const lines = await runJson("worldline");
  // const first = parseLine(lines[0]);
  // assert.ok(first.data !== undefined);
  // assert.equal(typeof first.data["hasConflict"], "boolean");
  assert.fail("not implemented — RED");
});

test("worldline --json outputs ticks in reverse order (newest first)", async () => {
  // const lines = await runJson("worldline");
  // const indices = lines.map((l) => parseLine(l).data?.["frameIndex"] as number);
  // for (let i = 1; i < indices.length; i++) {
  //   assert.ok(indices[i] < indices[i - 1], "Expected descending frame indices");
  // }
  assert.fail("not implemented — RED");
});
