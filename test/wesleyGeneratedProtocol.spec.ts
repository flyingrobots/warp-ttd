import assert from "node:assert/strict";
import test from "node:test";

import {
  deliveryObservationsOperation,
  effectEmissionsOperation,
  executionContextOperation,
  frameOperation,
  helloOperation,
  laneCatalogOperation,
  playbackHeadOperation,
  receiptsOperation,
  seekToFrameOperation,
  stepBackwardOperation,
  stepForwardOperation,
} from "../src/generated/warp-ttd-protocol.wesley.generated.ts";

test("Wesley-generated protocol operations match the host adapter surface", () => {
  const operations = [
    helloOperation,
    laneCatalogOperation,
    playbackHeadOperation,
    frameOperation,
    receiptsOperation,
    effectEmissionsOperation,
    deliveryObservationsOperation,
    executionContextOperation,
    stepForwardOperation,
    stepBackwardOperation,
    seekToFrameOperation,
  ];

  assert.deepEqual(
    operations.map((operation) => operation.fieldName),
    [
      "hello",
      "laneCatalog",
      "playbackHead",
      "frame",
      "receipts",
      "effectEmissions",
      "deliveryObservations",
      "executionContext",
      "stepForward",
      "stepBackward",
      "seekToFrame",
    ],
  );
  assert.deepEqual(
    operations.map((operation) => operation.operationType),
    [
      "QUERY",
      "QUERY",
      "QUERY",
      "QUERY",
      "QUERY",
      "QUERY",
      "QUERY",
      "QUERY",
      "MUTATION",
      "MUTATION",
      "MUTATION",
    ],
  );
});

test("Wesley-generated control operations preserve footprint metadata", () => {
  assert.deepEqual(stepForwardOperation.directives.wes_footprint.reads, ["PlaybackHeadSnapshot"]);
  assert.deepEqual(stepForwardOperation.directives.wes_footprint.writes, ["PlaybackHeadSnapshot"]);
  assert.deepEqual(stepBackwardOperation.directives.wes_footprint.reads, ["PlaybackHeadSnapshot"]);
  assert.deepEqual(seekToFrameOperation.directives.wes_footprint.writes, ["PlaybackHeadSnapshot"]);
});
