import { describe, expect, it } from "vitest";

import {
  COIN_KINDS,
  MARK_KINDS,
  cabinetGroup,
  cabinetKinds,
  cabinetKindsNotYetCopy,
  cabinetLastFromCopy,
  cabinetReceivedCopy,
  cabinetView,
  isCoinKind,
  isRoast,
  markDescription,
  markName,
  markRelationCopy,
  newestCabinetEntryFirst,
  type CabinetEntry,
  type CoinKind,
  type MvpDecidedBy,
} from "./marks";
import type { Sport } from "./sport";

const DAY = 24 * 60 * 60 * 1000;
const START = new Date("2026-10-27T16:00:00.000Z");

type Entry = CabinetEntry & { id: string };

let sequence = 0;

function entry(
  kind: CoinKind,
  sport: Sport,
  day: number,
  decidedBy: MvpDecidedBy | null = kind === "mvp" ? "vote" : null,
): Entry {
  sequence += 1;
  const playedAt = new Date(START.getTime() + day * DAY);
  return {
    id: `entry-${sequence}`,
    kind,
    sport,
    playedAt,
    receivedAt: new Date(playedAt.getTime() + sequence),
    decidedBy,
  };
}

function kindOf<E extends CabinetEntry>(
  view: ReturnType<typeof cabinetView<E>>,
  kind: CoinKind,
) {
  return view.kinds.find((row) => row.kind === kind);
}

describe("COIN_KINDS", () => {
  it("is the twelve Marks and the MVP", () => {
    expect(COIN_KINDS).toHaveLength(13);
    expect(COIN_KINDS).toEqual([...MARK_KINDS, "mvp"]);
    expect(isCoinKind("mvp")).toBe(true);
    expect(isCoinKind("dynamo")).toBe(true);
    expect(isCoinKind("badge")).toBe(false);
  });

  it("knows the two Roasts", () => {
    expect(COIN_KINDS.filter(isRoast)).toEqual(["mr_fumble", "sayed_malek"]);
  });
});

describe("cabinetKinds", () => {
  it("lists twelve on the Padel tab, MVP first, without Goal Machine", () => {
    const kinds = cabinetKinds("padel");
    expect(kinds).toHaveLength(12);
    expect(kinds[0]).toBe("mvp");
    expect(kinds).toContain("smash_machine");
    expect(kinds).not.toContain("goal_machine");
  });

  it("lists twelve on the Football tab, MVP first, without Smash Machine", () => {
    const kinds = cabinetKinds("football");
    expect(kinds).toHaveLength(12);
    expect(kinds[0]).toBe("mvp");
    expect(kinds).toContain("goal_machine");
    expect(kinds).not.toContain("smash_machine");
  });

  it("groups the Marks teammate, anyone, opponent", () => {
    for (const sport of ["padel", "football"] as const) {
      const groups = cabinetKinds(sport).map(cabinetGroup);
      expect(groups).toEqual([
        "mvp",
        "teammate",
        "teammate",
        "teammate",
        "teammate",
        "anyone",
        "anyone",
        "anyone",
        "opponent",
        "opponent",
        "opponent",
        "opponent",
      ]);
    }
  });
});

describe("newestCabinetEntryFirst", () => {
  it("orders by the Game's date, then by when it was received", () => {
    const older = entry("clutch", "padel", 0);
    const sameGameFirst = entry("dynamo", "padel", 3);
    const sameGameSecond = entry("mr_ice", "padel", 3);
    expect(
      [older, sameGameFirst, sameGameSecond].sort(newestCabinetEntryFirst),
    ).toEqual([sameGameSecond, sameGameFirst, older]);
  });
});

describe("cabinetView", () => {
  const entries = [
    entry("clutch", "padel", 0),
    entry("clutch", "padel", 2),
    entry("clutch", "football", 1),
    entry("mvp", "padel", 2, "vote"),
    entry("mvp", "padel", 4, "tie_break"),
    entry("mvp", "football", 1, "organizer"),
    entry("mr_fumble", "padel", 3),
    entry("sayed_malek", "padel", 5),
    entry("dynamo", "padel", 1),
  ];

  it("counts each kind on the sport of the Game it came from", () => {
    const padel = cabinetView({
      entries,
      sport: "padel",
      viewerIsOwner: false,
      hideRoasts: false,
    });
    expect(padel.total).toBe(5);
    expect(padel.mvpCount).toBe(2);
    expect(padel.mvpDecidedBy).toEqual({ vote: 1, organizer: 0, tie_break: 1 });
    expect(kindOf(padel, "clutch")?.count).toBe(2);
    expect(padel.kinds).toHaveLength(12);
    expect(padel.kindsNotYet).toBe(12 - 5);

    const football = cabinetView({
      entries,
      sport: "football",
      viewerIsOwner: false,
      hideRoasts: false,
    });
    expect(football.total).toBe(1);
    expect(football.mvpCount).toBe(1);
    expect(football.mvpDecidedBy).toEqual({
      vote: 0,
      organizer: 1,
      tie_break: 0,
    });
    expect(kindOf(football, "clutch")?.count).toBe(1);
    expect(kindOf(football, "mr_fumble")?.count).toBe(0);
    expect(football.kindsNotYet).toBe(10);
  });

  it("keeps the newest of each kind as the last one", () => {
    const padel = cabinetView({
      entries,
      sport: "padel",
      viewerIsOwner: true,
      hideRoasts: false,
    });
    expect(kindOf(padel, "clutch")?.last).toBe(entries[1]);
    expect(kindOf(padel, "mvp")?.last).toBe(entries[4]);
    expect(kindOf(padel, "good_game")).toMatchObject({ count: 0, last: null });
  });

  it("leaves hidden Roasts out entirely for another viewer", () => {
    const padel = cabinetView({
      entries,
      sport: "padel",
      viewerIsOwner: false,
      hideRoasts: true,
    });
    expect(padel.kinds.map((row) => row.kind)).not.toContain("mr_fumble");
    expect(padel.kinds.map((row) => row.kind)).not.toContain("sayed_malek");
    expect(padel.kinds).toHaveLength(10);
    expect(padel.total).toBe(3);
    expect(padel.kindsNotYet).toBe(10 - 3);
    expect(padel.kinds.every((row) => !row.hiddenFromOthers)).toBe(true);
  });

  it("shows the owner their hidden Roasts, flagged", () => {
    const padel = cabinetView({
      entries,
      sport: "padel",
      viewerIsOwner: true,
      hideRoasts: true,
    });
    expect(padel.total).toBe(5);
    expect(kindOf(padel, "mr_fumble")).toMatchObject({
      count: 1,
      hiddenFromOthers: true,
    });
    expect(kindOf(padel, "sayed_malek")?.hiddenFromOthers).toBe(true);
    expect(kindOf(padel, "dynamo")?.hiddenFromOthers).toBe(false);
  });

  it("flags nothing when the owner shows Roasts", () => {
    const padel = cabinetView({
      entries,
      sport: "padel",
      viewerIsOwner: true,
      hideRoasts: false,
    });
    expect(padel.kinds.some((row) => row.hiddenFromOthers)).toBe(false);
  });

  it("reads every kind as not yet for a User with nothing", () => {
    const empty = cabinetView({
      entries: [],
      sport: "football",
      viewerIsOwner: true,
      hideRoasts: false,
    });
    expect(empty).toMatchObject({ total: 0, mvpCount: 0, kindsNotYet: 12 });
    expect(empty.kinds.every((row) => row.count === 0)).toBe(true);
  });
});

describe("cabinet copy", () => {
  it("renders in English", () => {
    expect(markName("mvp", "en")).toBe("MVP");
    expect(markDescription("mvp", "en")).toBe(
      "Most valuable player, one per game.",
    );
    expect(cabinetReceivedCopy(11, "en")).toBe("11 received");
    expect(cabinetKindsNotYetCopy(4, 12, "en")).toBe("4 of 12 kinds not yet");
    expect(cabinetLastFromCopy("Ali", "Thursday padel", "en")).toBe(
      "Last from Ali, Thursday padel",
    );
    expect(markRelationCopy("teammate", "en")).toBe("Teammate");
    expect(markRelationCopy("opponent", "en")).toBe("Opponent");
  });

  it("renders in Arabic", () => {
    expect(markName("mvp", "ar")).toBe("نجم المباراة");
    expect(cabinetReceivedCopy(1, "ar")).toBe("وسام واحد");
    expect(cabinetReceivedCopy(11, "ar")).toBe("11 وسامًا");
    expect(cabinetKindsNotYetCopy(4, 12, "ar")).toContain("4");
    expect(cabinetLastFromCopy("Ali", "Thursday padel", "ar")).toContain("Ali");
    expect(markRelationCopy("teammate", "ar")).toBe("زميل");
    expect(markRelationCopy("opponent", "ar")).toBe("منافس");
  });
});
