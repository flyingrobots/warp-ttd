/**
 * Re-export scenario fixture adapter from src/ for test convenience.
 */
export {
  buildScenario,
  scenarioLiveWithEffects,
  scenarioReplayWithSuppression,
  scenarioMultiWriterWithConflicts
} from "../../src/adapters/scenarioFixtureAdapter.ts";
