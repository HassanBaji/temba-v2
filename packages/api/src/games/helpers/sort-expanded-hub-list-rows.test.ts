import { describe, expect, it } from "vitest";

import { sortExpandedHubListRows } from "#src/games/helpers/hub-list";
import type { HubListRow } from "#src/games/utils";

function row(
  id: string,
  startTime: string,
  joined: boolean,
  matchId: string | null = null,
): HubListRow {
  return {
    id,
    matchId,
    startTime: new Date(startTime),
    isRegistered: joined,
    isSeated: joined,
    isWaitlisted: false,
  } as HubListRow;
}

describe("sortExpandedHubListRows", () => {
  it("sorts soonest first whether or not the User has joined", () => {
    const sorted = sortExpandedHubListRows([
      row("later-joined", "2026-11-09T16:00:00.000Z", true),
      row("sooner-open", "2026-11-07T18:00:00.000Z", false),
    ]);
    expect(sorted.map((item) => item.id)).toEqual([
      "sooner-open",
      "later-joined",
    ]);
  });

  it("breaks a tie on start time by Match then Game id", () => {
    const sorted = sortExpandedHubListRows([
      row("game", "2026-11-07T18:00:00.000Z", true, "match-b"),
      row("game", "2026-11-07T18:00:00.000Z", true, "match-a"),
    ]);
    expect(sorted.map((item) => item.matchId)).toEqual(["match-a", "match-b"]);
  });
});
