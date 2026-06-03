import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import test from "node:test";

const ROOT = path.resolve(import.meta.dirname, "..");

test("method design enforcement gate passes", () => {
  const result = spawnSync(
    process.execPath,
    ["scripts/check-method-designs.mjs"],
    {
      cwd: ROOT,
      encoding: "utf-8",
    },
  );

  assert.equal(
    result.status,
    0,
    `${result.stdout}\n${result.stderr}`,
  );
});
