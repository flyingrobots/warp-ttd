/**
 * CLI worldline --json output contract tests.
 *
 * Cycle 0010 — Worldline Viewer.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);

const CLI = "./src/cli.ts";
const NODE_ARGS = ["--experimental-strip-types", CLI];

interface TickData {
  frameIndex: number;
  laneId: string;
  tick: number;
  digest: string;
  writers: string[];
  hasConflict: boolean;
  strandIds: string[];
}

interface WorldlineEnvelope {
  envelope: string;
  data: TickData;
}

async function runJson(command: string): Promise<string[]> {
  const { stdout } = await exec("node", [...NODE_ARGS, command, "--json"]);
  const lines = stdout.trim().split("\n").filter((l) => l.length > 0);
  return lines;
}

function parseLine(line: string): WorldlineEnvelope {
  const parsed = JSON.parse(line) as WorldlineEnvelope;
  assert.equal(typeof parsed.envelope, "string", `Missing envelope field in: ${line}`);
  return parsed;
}

test("worldline --json outputs WorldlineTick envelopes", async () => {
  const lines = await runJson("worldline");
  assert.ok(lines.length >= 1, "Expected at least one tick");
  const parsed = lines.map((l) => parseLine(l));
  for (const entry of parsed) {
    assert.equal(entry.envelope, "WorldlineTick");
  }
});

test("worldline --json tick data includes frameIndex, laneId, and tick", async () => {
  const lines = await runJson("worldline");
  const line = lines[0];
  assert.ok(line !== undefined);
  const first = parseLine(line);
  assert.equal(typeof first.data.frameIndex, "number");
  assert.equal(typeof first.data.laneId, "string");
  assert.equal(typeof first.data.tick, "number");
});

test("worldline --json includes writer attribution per tick", async () => {
  const lines = await runJson("worldline");
  const withWriters = lines.map((l) => parseLine(l))
    .filter((p) => p.data.writers.length > 0);
  assert.ok(withWriters.length > 0, "Expected at least one tick with writers");
});

test("worldline --json includes btrDigest when available", async () => {
  const lines = await runJson("worldline");
  const withDigest = lines.map((l) => parseLine(l))
    .filter((p) => p.data.digest !== "");
  assert.ok(withDigest.length > 0, "Expected at least one tick with a digest");
});

test("worldline --json includes hasConflict boolean", async () => {
  const lines = await runJson("worldline");
  const line = lines[0];
  assert.ok(line !== undefined);
  const first = parseLine(line);
  assert.equal(typeof first.data.hasConflict, "boolean");
});

test("worldline --json outputs ticks in reverse order (newest first)", async () => {
  const lines = await runJson("worldline");
  const indices = lines.map((l) => parseLine(l).data.frameIndex);
  for (let i = 1; i < indices.length; i++) {
    const current = indices[i];
    const previous = indices[i - 1];
    assert.ok(current !== undefined && previous !== undefined);
    assert.ok(current < previous, "Expected descending frame indices");
  }
});
