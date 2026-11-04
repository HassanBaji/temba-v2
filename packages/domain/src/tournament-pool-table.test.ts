import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { messagesFor } from "@repo/i18n/messages";

import {
  UNPLAYED_RECORD_DISPLAY,
  poolRecordDisplay,
} from "./tournament-pool-table";

const FORBIDDEN = /champion|final|knockout|standings|\bGroup\b/u;

describe("Pool table copy", () => {
  const copy = messagesFor("en").tournament.poolTable;

  it("names the group table, group winner, and finished tournament", () => {
    assert.equal(copy.heading, "group table");
    assert.equal(copy.winner, "group winner");
    assert.equal(copy.finished, "This tournament is finished.");
    assert.equal(copy.yourRounds, "Your Rounds");
    assert.equal(copy.results, "group results");
    assert.equal(UNPLAYED_RECORD_DISPLAY, "—");
    assert.equal(poolRecordDisplay(null), "—");
    assert.equal(poolRecordDisplay(0), "0");
  });

  it("does not claim a champion, a final, or a knockout", () => {
    const joined = [
      copy.heading,
      copy.winner,
      copy.finished,
      copy.yourRounds,
      copy.results,
    ].join("\n");
    assert.equal(FORBIDDEN.test(joined), false);
  });

  it("reads the headings in Arabic", () => {
    const arabic = messagesFor("ar").tournament.poolTable;
    assert.equal(arabic.heading, "جدول المجموعة");
    assert.equal(arabic.finished, "انتهت هذه البطولة.");
  });
});
