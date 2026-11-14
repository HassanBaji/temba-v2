import { describe, expect, it } from "vitest";

import {
  clampTierAdjustDelta,
  formatTierDelta,
  tierAdjustSheet,
  tierStandingsOf,
  type TierAdjustMember,
} from "./tier-adjust";
import { tierAdjustPreview, tierTable } from "./tier-bands";

const JOINED = new Date("2026-01-01T00:00:00Z");

function member(
  userId: string,
  name: string,
  points: number,
  gamesCounted = 10,
): TierAdjustMember {
  return {
    userId,
    name,
    joinedAt: JOINED,
    tier: {
      band: null,
      place: null,
      points,
      provisional: gamesCounted < 5,
      gamesOfFive: Math.min(gamesCounted, 5),
      gamesCounted,
    },
  };
}

/** The Members design's Group: eleven ranked members and two still Provisional. */
const THURSDAY: TierAdjustMember[] = [
  member("hussain", "Hussain A", 1412),
  member("ali", "Ali M", 1356),
  member("yousif", "Yousif K", 1301),
  member("mahmood", "Mahmood S", 1248),
  member("jassim", "Jassim H", 1214),
  member("you", "You", 1201),
  member("salman", "Salman R", 1187),
  member("ahmed", "Ahmed N", 1160),
  member("bo", "Bo Fareed", 1122),
  member("noor", "Noor S", 1098),
  member("omar", "Omar T", 1064),
  member("khalid", "Khalid R", 1200, 3),
  member("majed", "Majed J", 1200, 1),
];

function sheet(
  userId: string,
  delta: number,
  reason: Parameters<typeof tierAdjustSheet>[0]["reason"] = null,
  locale: "en" | "ar" = "en",
) {
  const view = tierAdjustSheet({
    members: THURSDAY,
    userId,
    delta,
    reason,
    groupName: "Thursday Football",
    locale,
  });
  if (!view) {
    throw new Error("Expected a sheet");
  }
  return view;
}

describe("tierAdjustSheet (screen 2d)", () => {
  it("reads the member as they stand before any move", () => {
    const view = sheet("mahmood", 0);
    expect(view.subtitle).toBe(
      "Thursday Football. A manual change, on top of what the games did.",
    );
    expect(view.nowLine).toBe("Now 1,248, Kanaad, #4 of 13");
    expect(view.pointsLabel).toBe("1,248");
    expect(view.deltaLabel).toBe("no change");
    expect(view.placeLabel).toBe("#4");
    expect(view.bandLabel).toBe("Kanaad");
    expect(view.effect).toBe(
      "No change yet. Tiers are places in the group, so when one player moves, someone moves the other way.",
    );
    expect(view.why).toBe("Why? Mahmood will see this.");
    expect(view.canSave).toBe(false);
    expect(view.saveLabel).toBe("Move the points first");
    expect(view.steps.map((step) => step.label)).toEqual([
      "−50",
      "−10",
      "+10",
      "+50",
    ]);
    expect(view.reasons.map((reason) => reason.label)).toEqual([
      "New here, known level",
      "Back from a break",
      "Playing above this",
      "Playing below this",
      "Fixing a mistake",
    ]);
  });

  it("offers the jumps into Hamour and into Safi on a round ten", () => {
    expect(sheet("mahmood", 0).jumps).toEqual([
      { band: "hamour", label: "into Hamour", delta: 62 },
      { band: "safi", label: "into Safi", delta: -98 },
    ]);
  });

  it("says who moves the other way when a Kanaad passes the last Hamour", () => {
    const view = sheet("mahmood", 62);
    expect(view.pointsLabel).toBe("1,310");
    expect(view.deltaLabel).toBe("+62");
    expect(view.placeLabel).toBe("#3");
    expect(view.band).toBe("hamour");
    expect(view.bands.find((band) => band.current)?.band).toBe("hamour");
    expect(view.effect).toBe(
      "Mahmood passes Yousif K and takes a Hamour place. Yousif K becomes a Kanaad.",
    );
  });

  it("names only the player passed last when the drop passes many", () => {
    expect(sheet("mahmood", -98).effect).toBe(
      "Mahmood drops below Ahmed N into Safi. Ahmed N moves up to Kanaad.",
    );
  });

  it("keeps the band when the move stays inside it", () => {
    expect(sheet("mahmood", -40).effect).toBe(
      "Still a Kanaad, now #5 of 13. Nobody else changes tier.",
    );
  });

  it("ranks a Provisional member and names up to three movers", () => {
    const view = sheet("khalid", 300);
    expect(view.nowLine).toBe("Now 1,200, provisional, 3 of 5 games");
    expect(view.effect).toBe(
      "Khalid is ranked #1 of 13, a Shark. Hussain A becomes a Hamour. Yousif K becomes a Kanaad. Salman R becomes a Safi.",
    );
  });

  it("needs a reason before it saves", () => {
    expect(sheet("mahmood", 10).saveLabel).toBe("Pick a reason to save");
    const ready = sheet("mahmood", 10, "correcting_a_mistake");
    expect(ready.canSave).toBe(true);
    expect(ready.saveLabel).toBe("Save +10 and log it");
    expect(ready.reasons.find((reason) => reason.selected)?.value).toBe(
      "correcting_a_mistake",
    );
  });

  it("stops the steps at the limit", () => {
    const view = sheet("mahmood", 999);
    expect(view.delta).toBe(400);
    expect(view.steps.find((step) => step.delta === 10)?.disabled).toBe(true);
    expect(view.steps.find((step) => step.delta === -10)?.disabled).toBe(false);
  });

  it("matches tierAdjustPreview for every reachable point", () => {
    const table = tierTable(tierStandingsOf(THURSDAY));
    for (let delta = -400; delta <= 400; delta += 10) {
      const view = sheet("jassim", delta);
      const preview = tierAdjustPreview(table, "jassim", 1214 + delta);
      if (delta !== 0) {
        expect(view.band).toBe(preview.band);
        expect(view.placeLabel).toBe(`#${preview.place}`);
      }
    }
  });

  it("is null for someone not in the table", () => {
    expect(
      tierAdjustSheet({
        members: THURSDAY,
        userId: "stranger",
        delta: 0,
        reason: null,
        groupName: "Thursday Football",
        locale: "en",
      }),
    ).toBeNull();
  });

  it("reads in Arabic", () => {
    const view = sheet("mahmood", 62, "new_to_group", "ar");
    expect(view.bandLabel).toBe("هامور");
    expect(view.reasons[0]?.label).toBe("جديد هنا، مستواه معروف");
  });
});

describe("tierAdjustSheet in a small Group", () => {
  const pair = [
    member("p1", "Player One", 1200, 0),
    member("p2", "Player Two", 1250),
  ];
  const view = (delta: number) =>
    tierAdjustSheet({
      members: pair,
      userId: "p1",
      delta,
      reason: null,
      groupName: "First football",
      locale: "en",
    });

  it("lights the fish the move lands on with only two ranked", () => {
    const down = view(-130);
    expect(down?.band).toBe("safi");
    expect(down?.bands.filter((band) => band.current)).toEqual([
      { band: "safi", label: "Safi", current: true },
    ]);
    const up = view(100);
    expect(up?.band).toBe("shark");
    expect(up?.placeLabel).toBe("#1");
  });
});

describe("tierAdjustSheet start suggestion", () => {
  const withLevels = THURSDAY.map((entry) => ({
    ...entry,
    level: entry.userId === "khalid" ? "3.7" : "3.0",
    groupLevel: null,
  }));
  const view = (
    members: readonly TierAdjustMember[],
    userId: string,
    delta = 0,
  ) =>
    tierAdjustSheet({
      members,
      userId,
      delta,
      reason: null,
      groupName: "Thursday Football",
      locale: "en",
    });

  it("suggests a Provisional member's start from their Temba Level", () => {
    expect(view(withLevels, "khalid")?.suggestion).toEqual({
      delta: 60,
      label: "Suggested from Temba Level: 1,260",
    });
  });

  it("prefers a Group Level an Organizer set earlier", () => {
    const members = withLevels.map((entry) =>
      entry.userId === "khalid"
        ? { ...entry, groupLevel: { level: "2.3" } }
        : entry,
    );
    expect(view(members, "khalid")?.suggestion?.delta).toBe(-58);
  });

  it("suggests nothing for a ranked member or without a Level", () => {
    expect(view(withLevels, "mahmood")?.suggestion).toBeNull();
    expect(view(THURSDAY, "khalid")?.suggestion).toBeNull();
  });

  it("reads in Arabic", () => {
    const sheet = tierAdjustSheet({
      members: withLevels,
      userId: "khalid",
      delta: 0,
      reason: null,
      groupName: "Thursday Football",
      locale: "ar",
    });
    expect(sheet?.suggestion?.label).toBe(
      "مقترح من مستوى Temba: \u20681,260\u2069",
    );
  });
});

describe("clampTierAdjustDelta", () => {
  it("keeps a move within 400 and above zero points", () => {
    expect(clampTierAdjustDelta(450, 1200)).toBe(400);
    expect(clampTierAdjustDelta(-450, 1200)).toBe(-400);
    expect(clampTierAdjustDelta(-300, 120)).toBe(-120);
  });
});

describe("formatTierDelta", () => {
  it("signs with a true minus", () => {
    expect(formatTierDelta(1200)).toBe("+1,200");
    expect(formatTierDelta(-11)).toBe("−11");
  });
});
