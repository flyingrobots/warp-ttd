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

interface EnvelopeLine {
  envelope: string;
  data?: Record<string, string | number | boolean | null>;
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

function requireLine(lines: string[], index: number): string {
  const line = lines[index];
  assert.ok(line !== undefined, `Expected line at index ${index.toString()}`);
  return line;
}

test("hello --json outputs a single HostHello JSONL line", async () => {
  const lines = await runJson("hello");
  assert.equal(lines.length, 1);

  const obj = parseLine(requireLine(lines, 0));
  assert.equal(obj.envelope, "HostHello");
  assert.ok(obj.data !== undefined);
  assert.equal(obj.data["protocolVersion"], "0.2.0");
});

test("catalog --json outputs a single LaneCatalog JSONL line", async () => {
  const lines = await runJson("catalog");
  assert.equal(lines.length, 1);

  const obj = parseLine(requireLine(lines, 0));
  assert.equal(obj.envelope, "LaneCatalog");
  assert.ok(obj.data !== undefined);
});

test("frame --json outputs PlaybackHeadSnapshot, PlaybackFrame, and ReceiptSummary lines", async () => {
  const lines = await runJson("frame");
  assert.ok(lines.length >= 2, "Expected at least head + frame lines");

  const envelopes = lines.map((l) => parseLine(l).envelope);
  assert.ok(envelopes.includes("PlaybackHeadSnapshot"));
  assert.ok(envelopes.includes("PlaybackFrame"));
});

test("step --json outputs exact sequence: before, stepped, after, receipts", async () => {
  const lines = await runJson("step");
  const parsed = lines.map((l) => parseLine(l));
  const sequence = parsed.map((p) => `${p.envelope}${p.label !== undefined ? `:${p.label}` : ""}`);

  // Pin exact sequence: head(before), frame(stepped), head(after), then receipts
  assert.equal(sequence[0], "PlaybackHeadSnapshot:before");
  assert.equal(sequence[1], "PlaybackFrame:stepped");
  assert.equal(sequence[2], "PlaybackHeadSnapshot:after");

  // Remaining lines (if any) must all be ReceiptSummary
  for (const entry of sequence.slice(3)) {
    assert.equal(entry, "ReceiptSummary");
  }
});

test("--json stdout contains no human-readable text", async () => {
  const lines = await runJson("hello");

  for (const line of lines) {
    assert.ok(line.startsWith("{"), `Non-JSON line found: ${line}`);
    JSON.parse(line);
  }
});

test("demo --json outputs multiple envelope lines", async () => {
  const lines = await runJson("demo");
  assert.ok(lines.length >= 5, "Demo should produce multiple envelope lines");

  for (const line of lines) {
    parseLine(line);
  }
});

test("effects --json at frame 0 returns no envelopes (correct: no emissions at frame 0)", async () => {
  const lines = await runJson("effects");
  assert.equal(lines.length, 0);
});

test("deliveries --json at frame 0 returns no envelopes (correct: no deliveries at frame 0)", async () => {
  const lines = await runJson("deliveries");
  assert.equal(lines.length, 0);
});

test("demo --json includes EffectEmissionSummary and DeliveryObservationSummary after stepping", async () => {
  const lines = await runJson("demo");
  const envelopes = lines.map((l) => parseLine(l).envelope);

  assert.ok(
    envelopes.includes("EffectEmissionSummary"),
    "Demo should include effect emissions after stepping"
  );
  assert.ok(
    envelopes.includes("DeliveryObservationSummary"),
    "Demo should include delivery observations after stepping"
  );
});

test("context --json outputs a single ExecutionContext line", async () => {
  const lines = await runJson("context");
  assert.equal(lines.length, 1);

  const obj = parseLine(requireLine(lines, 0));
  assert.equal(obj.envelope, "ExecutionContext");
  assert.ok(obj.data !== undefined);
});

test("invalid command --json writes JSON error to stderr", async () => {
  try {
    await exec("node", [...NODE_ARGS, "badcommand", "--json"]);
    assert.fail("Expected command to fail");
  } catch (err) {
    const execErr = err as { stderr: string; stdout: string };
    // stdout should be empty
    assert.equal(execErr.stdout.trim(), "");
    // stderr should be valid JSON with error field
    const errLine = execErr.stderr.trim();
    assert.ok(errLine.startsWith("{"), `Expected JSON error on stderr, got: ${errLine}`);
    const parsed = JSON.parse(errLine) as { error: string };
    assert.equal(typeof parsed.error, "string");
    assert.ok(parsed.error.includes("badcommand"));
  }
});
