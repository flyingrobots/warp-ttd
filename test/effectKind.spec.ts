import test from "node:test";
import assert from "node:assert/strict";

import {
  BridgeEffectKind,
  CustomEffectKind,
  DiagnosticEffectKind,
  EffectKind,
  ExportEffectKind,
  NotificationEffectKind,
  formatEffectKind,
} from "../src/EffectKind.ts";

test("EffectKind.from returns runtime-backed built-in kinds", () => {
  assert.ok(EffectKind.from("diagnostic") instanceof DiagnosticEffectKind);
  assert.ok(EffectKind.from("notification") instanceof NotificationEffectKind);
  assert.ok(EffectKind.from("export") instanceof ExportEffectKind);
  assert.ok(EffectKind.from("bridge") instanceof BridgeEffectKind);
});

test("EffectKind.from preserves unknown kinds as CustomEffectKind", () => {
  const kind = EffectKind.from("checkpoint");

  assert.ok(kind instanceof CustomEffectKind);
  assert.equal(kind.toString(), "checkpoint");
});

test("EffectKind.clone preserves the concrete runtime kind", () => {
  const diagnostic = new DiagnosticEffectKind().clone();
  const custom = new CustomEffectKind("checkpoint").clone();

  assert.ok(diagnostic instanceof DiagnosticEffectKind);
  assert.ok(custom instanceof CustomEffectKind);
  assert.equal(custom.toString(), "checkpoint");
});

test("EffectKind serializes canonically as its string value", () => {
  const kind = new NotificationEffectKind();

  assert.equal(kind.toString(), "notification");
  assert.equal(kind.toJSON(), "notification");
  assert.equal(JSON.stringify({ effectKind: kind }), "{\"effectKind\":\"notification\"}");
});

test("formatEffectKind returns the canonical display string", () => {
  assert.equal(formatEffectKind(new BridgeEffectKind()), "bridge");
});

test("CustomEffectKind rejects empty values", () => {
  assert.throws(() => new CustomEffectKind(""), /must not be empty/);
});
