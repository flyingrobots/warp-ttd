import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  mutationSeekToFrameOperation,
  mutationStepBackwardOperation,
  mutationStepForwardOperation,
  queryDeliveryObservationsOperation,
  queryEffectEmissionsOperation,
  queryExecutionContextOperation,
  queryFrameOperation,
  queryHelloOperation,
  queryLaneCatalogOperation,
  queryPlaybackHeadOperation,
  queryReceiptsOperation,
} from "../src/generated/warp-ttd-protocol.wesley.generated.ts";

const ROOT = path.resolve(import.meta.dirname, "..");
const SCHEMA_PATH = path.join(ROOT, "schemas", "warp-ttd-protocol.graphql");

const generatedOperations = [
  queryHelloOperation,
  queryLaneCatalogOperation,
  queryPlaybackHeadOperation,
  queryFrameOperation,
  queryReceiptsOperation,
  queryEffectEmissionsOperation,
  queryDeliveryObservationsOperation,
  queryExecutionContextOperation,
  mutationStepForwardOperation,
  mutationStepBackwardOperation,
  mutationSeekToFrameOperation,
] as const;

type GeneratedOperation = typeof generatedOperations[number];
type OperationType = "QUERY" | "MUTATION";

interface OperationSummary {
  operationType: OperationType;
  fieldName: string;
  directiveName: string;
  readonly: boolean;
  footprint?: {
    reads: string[];
    writes: string[];
  };
}

function extractRootBlock(schema: string, rootType: "Query" | "Mutation"): string {
  const match = new RegExp(`type\\s+${rootType}\\s*\\{([\\s\\S]*?)\\n\\}`).exec(schema);
  assert.ok(match?.[1] !== undefined, `${rootType} root should exist in schema`);
  return match[1];
}

function extractStringArg(args: string, name: string): string {
  const match = new RegExp(`${name}:\\s*"([^"]+)"`).exec(args);
  assert.ok(match?.[1] !== undefined, `${name} should exist in directive args`);
  return match[1];
}

function extractBooleanArg(args: string, name: string): boolean {
  const match = new RegExp(`${name}:\\s*(true|false)`).exec(args);
  assert.ok(match?.[1] !== undefined, `${name} should exist in directive args`);
  return match[1] === "true";
}

function extractStringListArg(args: string, name: string): string[] {
  const match = new RegExp(`${name}:\\s*\\[([^\\]]*)\\]`).exec(args);
  assert.ok(match?.[1] !== undefined, `${name} should exist in directive args`);
  return [...match[1].matchAll(/"([^"]+)"/g)].map((item) => item[1] ?? "");
}

function extractSchemaOperations(
  schema: string,
  rootType: "Query" | "Mutation",
  operationType: OperationType
): OperationSummary[] {
  const block = extractRootBlock(schema, rootType);
  const operationPattern = /^\s*(\w+)(?:\([^)]*\))?: [^\n]+\n\s+@wes_op\(([^)]*)\)(?:\n\s+@wes_footprint\(([^)]*)\))?/gm;
  const operations: OperationSummary[] = [];

  for (const match of block.matchAll(operationPattern)) {
    const fieldName = match[1];
    const opArgs = match[2];
    assert.ok(fieldName !== undefined);
    assert.ok(opArgs !== undefined);

    const summary: OperationSummary = {
      operationType,
      fieldName,
      directiveName: extractStringArg(opArgs, "name"),
      readonly: extractBooleanArg(opArgs, "readonly")
    };

    const footprintArgs = match[3];
    if (footprintArgs !== undefined) {
      summary.footprint = {
        reads: extractStringListArg(footprintArgs, "reads"),
        writes: extractStringListArg(footprintArgs, "writes")
      };
    }

    operations.push(summary);
  }

  return operations;
}

function summarizeGeneratedOperation(operation: GeneratedOperation): OperationSummary {
  const summary: OperationSummary = {
    operationType: operation.operationType,
    fieldName: operation.fieldName,
    directiveName: operation.directives.wes_op.name,
    readonly: operation.directives.wes_op.readonly
  };

  if ("wes_footprint" in operation.directives) {
    summary.footprint = {
      reads: Array.from(operation.directives.wes_footprint.reads),
      writes: Array.from(operation.directives.wes_footprint.writes)
    };
  }

  return summary;
}

test("Wesley-generated protocol operations stay in sync with authored schema", () => {
  const schema = fs.readFileSync(SCHEMA_PATH, "utf-8");
  const schemaOperations = [
    ...extractSchemaOperations(schema, "Query", "QUERY"),
    ...extractSchemaOperations(schema, "Mutation", "MUTATION")
  ];

  assert.deepEqual(generatedOperations.map(summarizeGeneratedOperation), schemaOperations);
});

test("Wesley-generated control operations preserve footprint metadata", () => {
  assert.deepEqual(mutationStepForwardOperation.directives.wes_footprint.reads, ["PlaybackHeadSnapshot"]);
  assert.deepEqual(mutationStepForwardOperation.directives.wes_footprint.writes, ["PlaybackHeadSnapshot"]);
  assert.deepEqual(mutationStepBackwardOperation.directives.wes_footprint.reads, ["PlaybackHeadSnapshot"]);
  assert.deepEqual(mutationSeekToFrameOperation.directives.wes_footprint.writes, ["PlaybackHeadSnapshot"]);
});
