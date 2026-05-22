import assert from "node:assert/strict";
import test from "node:test";

import {
  absentGeneratedFamilyFact,
  generatedFamilyRef,
  obstructedGeneratedFamilyFact,
  presentGeneratedFamilyFact,
  type GeneratedFamilyName
} from "../src/app/generatedFamilyIngress.ts";

test("presentGeneratedFamilyFact preserves source, scope, origin, and payload", () => {
  const fact = presentGeneratedFamilyFact({
    source: {
      family: "echo",
      artifact: "LawWitness",
      schemaVersion: "echo.law-witness.v1"
    },
    origin: "HOST_PUBLISHED",
    scope: "COORDINATE",
    target: "jedit",
    payload: {
      witnessId: "law-witness:1",
      verdict: "SATISFIED"
    }
  });

  assert.equal(fact.posture, "PRESENT");
  assert.equal(fact.origin, "HOST_PUBLISHED");
  assert.equal(fact.scope, "COORDINATE");
  assert.equal(fact.target, "jedit");
  assert.deepEqual(fact.source, {
    family: "echo",
    artifact: "LawWitness",
    schemaVersion: "echo.law-witness.v1"
  });
  assert.deepEqual(fact.payload, {
    witnessId: "law-witness:1",
    verdict: "SATISFIED"
  });
});

test("absent and obstructed generated-family facts keep reasons distinct", () => {
  const source = generatedFamilyRef({
    family: "continuum",
    artifact: "ReadingEnvelope"
  });
  const absent = absentGeneratedFamilyFact({
    source,
    origin: "UNAVAILABLE",
    scope: "SESSION",
    reason: "Host did not publish ReadingEnvelope facts."
  });
  const obstructed = obstructedGeneratedFamilyFact({
    source,
    origin: "GENERATED_PAYLOAD",
    scope: "SESSION",
    reason: "Generated artifact could not be loaded."
  });

  assert.equal(absent.posture, "ABSENT");
  assert.equal(absent.reason, "Host did not publish ReadingEnvelope facts.");
  assert.equal(obstructed.posture, "OBSTRUCTED");
  assert.equal(obstructed.reason, "Generated artifact could not be loaded.");
});

test("generated-family refs cover the initial ingress families", () => {
  const families: readonly GeneratedFamilyName[] = [
    "warp-ttd-protocol",
    "continuum",
    "echo",
    "authority",
    "git-warp"
  ];

  assert.deepEqual(
    families.map((family) => generatedFamilyRef({ family }).family),
    families
  );
});
