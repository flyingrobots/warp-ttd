import assert from "node:assert/strict";
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

test("Wesley-generated protocol operations match the host adapter surface", () => {
  const operations = [
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
  assert.deepEqual(mutationStepForwardOperation.directives.wes_footprint.reads, ["PlaybackHeadSnapshot"]);
  assert.deepEqual(mutationStepForwardOperation.directives.wes_footprint.writes, ["PlaybackHeadSnapshot"]);
  assert.deepEqual(mutationStepBackwardOperation.directives.wes_footprint.reads, ["PlaybackHeadSnapshot"]);
  assert.deepEqual(mutationSeekToFrameOperation.directives.wes_footprint.writes, ["PlaybackHeadSnapshot"]);
});
