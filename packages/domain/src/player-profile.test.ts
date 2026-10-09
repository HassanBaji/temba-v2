import { describe, expect, it } from "vitest";

import {
  groupMemberRowsLink,
  overallView,
  playedSideView,
  playerHeaderSubtitle,
  streaksView,
} from "./player-profile";
import { createPlayerProfileFixtures } from "./player-profile-fixtures";

const fixtures = createPlayerProfileFixtures();

describe("playerHeaderSubtitle", () => {
  it("names the usual Venue", () => {
    expect(playerHeaderSubtitle(fixtures.confirmed.venue)).toBe(
      "Padel, plays at Padelhuset Bromma",
    );
  });

  it("reads Padel without one", () => {
    expect(playerHeaderSubtitle(fixtures.newPlayer.venue)).toBe("Padel");
  });
});

describe("overallView", () => {
  it("shows four All time tiles", () => {
    expect(overallView(fixtures.confirmed.overall)).toEqual({
      title: "Overall",
      scope: "All time",
      tiles: [
        { label: "Matches", value: "64" },
        { label: "Won", value: "41" },
        { label: "Win rate", value: "64%" },
        { label: "Sets won", value: "61%" },
      ],
    });
  });

  it("shows zeros and dashes before the first Match", () => {
    expect(overallView(fixtures.newPlayer.overall).tiles).toEqual([
      { label: "Matches", value: "0" },
      { label: "Won", value: "0" },
      { label: "Win rate", value: "—" },
      { label: "Sets won", value: "—" },
    ]);
  });

  it("counts a draw as played", () => {
    const tiles = overallView({
      played: 2,
      won: 1,
      lost: 0,
      drawn: 1,
      setsWon: 3,
      setsPlayed: 4,
    }).tiles;
    expect(tiles[2]).toEqual({ label: "Win rate", value: "50%" });
    expect(tiles[3]).toEqual({ label: "Sets won", value: "75%" });
  });
});

describe("groupMemberRowsLink", () => {
  it("links member rows for a Group member", () => {
    expect(groupMemberRowsLink({ role: "member" })).toBe(true);
  });

  it("leaves rows unlinked for a non-member previewing a Public Group", () => {
    expect(groupMemberRowsLink(null)).toBe(false);
    expect(groupMemberRowsLink(undefined)).toBe(false);
  });
});

describe("streaksView", () => {
  it("shows the current run with a won mark per win and the best with its month", () => {
    expect(streaksView(fixtures.confirmed.streaks)).toEqual({
      current: { headline: "4 wins in a row", wonMarks: 4 },
      best: { headline: "7 wins", reachedIn: "March 2026" },
    });
  });

  it("caps the won marks at ten", () => {
    expect(
      streaksView({ current: 13, best: 13, bestReachedAt: null }).current,
    ).toEqual({ headline: "13 wins in a row", wonMarks: 10 });
  });

  it("reads the month in Asia/Bahrain", () => {
    expect(
      streaksView({
        current: 0,
        best: 3,
        bestReachedAt: new Date("2026-02-28T22:30:00.000Z"),
      }).best.reachedIn,
    ).toBe("March 2026");
  });

  it("has no current streak after a loss or a draw", () => {
    expect(streaksView(fixtures.provisional.streaks).current).toEqual({
      headline: "No current streak",
      wonMarks: 0,
    });
  });

  it("reads one win in the singular", () => {
    expect(
      streaksView({
        current: 1,
        best: 1,
        bestReachedAt: "2026-10-01T17:00:00.000Z",
      }),
    ).toEqual({
      current: { headline: "1 win in a row", wonMarks: 1 },
      best: { headline: "1 win", reachedIn: "October 2026" },
    });
  });

  it("shows a dash before the first win", () => {
    expect(streaksView(fixtures.newPlayer.streaks)).toEqual({
      current: { headline: "No current streak", wonMarks: 0 },
      best: { headline: "—", reachedIn: null },
    });
  });
});

describe("playedSideView", () => {
  it("fills the declared side and names the share played there", () => {
    expect(playedSideView(fixtures.confirmed.position)).toEqual({
      label: "Left side",
      subtitle: "Played left in 72% of matches",
      court: { left: "ink", right: "paper" },
    });
  });

  it("names the right side's share for a right-side player", () => {
    expect(
      playedSideView({
        declared: "right",
        recordedCount: 5,
        leftCount: 1,
        rightCount: 4,
      }),
    ).toEqual({
      label: "Right side",
      subtitle: "Played right in 80% of matches",
      court: { left: "paper", right: "ink" },
    });
  });

  it("fills both sides for Either and splits the share", () => {
    expect(
      playedSideView({
        declared: "either",
        recordedCount: 20,
        leftCount: 11,
        rightCount: 9,
      }),
    ).toEqual({
      label: "Either side",
      subtitle: "Left 55%, right 45% of matches",
      court: { left: "ink", right: "ink" },
    });
  });

  it("hatches the near half with no answer and still splits the share", () => {
    expect(
      playedSideView({
        declared: null,
        recordedCount: 6,
        leftCount: 3,
        rightCount: 3,
      }),
    ).toEqual({
      label: "No preference set",
      subtitle: "Left 50%, right 50% of matches",
      court: { left: "hatch", right: "hatch" },
    });
  });

  it("hides the subtitle below five recorded Matches", () => {
    expect(
      playedSideView({
        declared: "left",
        recordedCount: 4,
        leftCount: 4,
        rightCount: 0,
      }).subtitle,
    ).toBeNull();
    expect(
      playedSideView({
        declared: "left",
        recordedCount: 5,
        leftCount: 5,
        rightCount: 0,
      }).subtitle,
    ).toBe("Played left in 100% of matches");
  });

  it("reads No preference set for a new player", () => {
    expect(playedSideView(fixtures.newPlayer.position)).toEqual({
      label: "No preference set",
      subtitle: null,
      court: { left: "hatch", right: "hatch" },
    });
  });
});
