import test from "node:test";
import assert from "node:assert/strict";

import { resolveAdapter } from "../src/app/adapterRegistry.ts";
import type { AdapterConfig } from "../src/app/adapterRegistry.ts";

test("resolveAdapter returns an echo fixture adapter for echo-fixture config", async () => {
  const config: AdapterConfig = { kind: "echo-fixture" };
  const { adapter, defaultHeadId } = await resolveAdapter(config);

  assert.equal(adapter.adapterName, "echo-fixture");
  assert.equal(defaultHeadId, "head:main");

  const hello = await adapter.hello();
  assert.equal(hello.hostKind, "echo");
});

test("resolveAdapter throws for unknown adapter kind", async () => {
  // Force an invalid kind past the type system to test runtime error handling
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment
  const config: AdapterConfig = { kind: "unknown" } as any;
  await assert.rejects(
    () => resolveAdapter(config),
    { message: /unknown adapter kind/i }
  );
});
