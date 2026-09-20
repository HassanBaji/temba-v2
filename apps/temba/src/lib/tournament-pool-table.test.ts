import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  POOL_RESULTS_HEADING,
  POOL_TABLE_HEADING,
  POOL_WINNER_LABEL,
  TOURNAMENT_FINISHED_COPY,
  UNPLAYED_RECORD_DISPLAY,
  YOUR_ROUNDS_HEADING,
  poolRecordDisplay,
} from "./tournament-pool-table";

const FORBIDDEN = /champion|final|knockout|standings|group(?! team)/iu;

describe("Pool table copy", () => {
  it("names the Pool table, Pool winner, and finished tournament", () => {
    assert.equal(POOL_TABLE_HEADING, "Pool table");
    assert.equal(POOL_WINNER_LABEL, "Pool winner");
    assert.equal(TOURNAMENT_FINISHED_COPY, "This tournament is finished.");
    assert.equal(YOUR_ROUNDS_HEADING, "Your Rounds");
    assert.equal(POOL_RESULTS_HEADING, "Pool results");
    assert.equal(UNPLAYED_RECORD_DISPLAY, "—");
    assert.equal(poolRecordDisplay(null), "—");
    assert.equal(poolRecordDisplay(0), "0");
  });

  it("does not claim a champion, a final, or a knockout", () => {
    const copy = [
      POOL_TABLE_HEADING,
      POOL_WINNER_LABEL,
      TOURNAMENT_FINISHED_COPY,
      YOUR_ROUNDS_HEADING,
      POOL_RESULTS_HEADING,
    ].join("\n");
    assert.equal(FORBIDDEN.test(copy), false);
  });
});
