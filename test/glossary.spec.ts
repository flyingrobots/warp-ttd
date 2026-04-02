/**
 * Glossary contract test — verifies the canonical glossary exists
 * at docs/design/glossary.md and contains the required domain terms.
 *
 * This is the spec for Cycle 0006 — Design Vocabulary.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const glossary = readFileSync(
  resolve(import.meta.dirname, "..", "docs", "design", "glossary.md"),
  "utf-8"
);

const REQUIRED_TERMS = [
  "worldline",
  "strand",
  "tick",
  "frame",
  "receipt",
  "counterfactual",
  "lane",
  "playback head",
  "effect emission",
  "delivery observation",
  "execution context"
];

test("docs/design/glossary.md exists and has a Glossary heading", () => {
  assert.ok(
    glossary.includes("# Glossary"),
    "Expected a '# Glossary' heading in docs/design/glossary.md"
  );
});

test("glossary defines all required domain terms", () => {
  for (const term of REQUIRED_TERMS) {
    assert.ok(
      glossary.toLowerCase().includes(term),
      `Glossary is missing required term: "${term}"`
    );
  }
});

test("glossary documents the frame vs tick distinction", () => {
  assert.ok(
    glossary.includes("tick") && glossary.includes("frame"),
    "Glossary must define both tick and frame"
  );

  const hasLamportExplanation =
    glossary.includes("Lamport") || glossary.includes("single lane");
  assert.ok(hasLamportExplanation, "Glossary must explain that tick is a per-lane concept");

  const hasCompositeExplanation =
    glossary.includes("composite") || glossary.includes("multi-lane") || glossary.includes("snapshot");
  assert.ok(hasCompositeExplanation, "Glossary must explain that frame is a multi-lane composite");
});
