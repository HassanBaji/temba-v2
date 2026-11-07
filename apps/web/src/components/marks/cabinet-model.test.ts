import {
  cabinetView,
  type CabinetEntry,
  type CoinKind,
  type MvpDecidedBy,
} from "@repo/domain/marks";
import { SPORTS, type Sport } from "@repo/domain/sport";
import { isolate } from "@repo/i18n/bidi";
import { describe, expect, it } from "vitest";

import {
  cabinetGameLabel,
  cabinetRowModel,
  cabinetPageModel,
  cabinetTab,
  detailScore,
  markDetailModel,
  type KindDetail,
  type ShownCabinet,
} from "./cabinet-model";

const GAME = {
  name: null,
  hasCustomName: false,
  format: "friendly_game" as const,
  windowStart: new Date("2026-11-04T16:00:00Z"),
  windowEnd: new Date("2026-11-04T17:30:00Z"),
  groupName: "Gooz of Arad",
  venueName: "Fantasy Football Center",
};

const WED_4_NOV = new Date("2026-11-04T16:00:00Z");
const MON_2_NOV = new Date("2026-11-02T16:00:00Z");
const TUE_27_OCT = new Date("2026-10-27T16:00:00Z");
const TUE_20_OCT = new Date("2026-10-20T16:00:00Z");
const TUE_13_OCT = new Date("2026-10-13T16:00:00Z");

type Entry = CabinetEntry & {
  gameId: string;
  game: typeof GAME;
  giver: { userId: string; name: string; image: string | null } | null;
};

let gameCount = 0;

function coin(
  kind: CoinKind,
  playedAt: Date,
  options: { from?: string; sport?: Sport; decidedBy?: MvpDecidedBy } = {},
): Entry {
  gameCount += 1;
  return {
    kind,
    sport: options.sport ?? "football",
    playedAt,
    receivedAt: playedAt,
    decidedBy: kind === "mvp" ? (options.decidedBy ?? "vote") : null,
    gameId: `game-${gameCount}`,
    game: GAME,
    giver: options.from
      ? { userId: `user-${options.from}`, name: options.from, image: null }
      : null,
  };
}

function repeat(n: number, make: () => Entry): Entry[] {
  return Array.from({ length: n }, make);
}

/** The cabinet as `marks.cabinet` shapes it, from the same domain view. */
function cabinetOf(
  entries: Entry[],
  options: {
    isOwner?: boolean;
    hideRoasts?: boolean;
    sports?: Sport[];
  } = {},
): ShownCabinet {
  const isOwner = options.isOwner ?? true;
  const hideRoasts = options.hideRoasts ?? false;
  const perSport = Object.fromEntries(
    SPORTS.map((sport) => {
      const view = cabinetView({
        entries,
        sport,
        viewerIsOwner: isOwner,
        hideRoasts,
      });
      return [
        sport,
        {
          total: view.total,
          mvpCount: view.mvpCount,
          mvpDecidedBy: view.mvpDecidedBy,
          kindsNotYet: view.kindsNotYet,
          kinds: view.kinds.map(({ last, ...kind }) => ({
            ...kind,
            lastFrom: last && {
              giverUserId: last.giver?.userId ?? null,
              giverName: last.giver?.name ?? null,
              gameId: last.gameId,
              game: last.game,
              playedAt: last.playedAt,
            },
          })),
        },
      ];
    }),
  ) as ShownCabinet["perSport"];
  return {
    hidden: false,
    isOwner,
    hideRoasts: isOwner ? hideRoasts : null,
    sports: options.sports ?? ["padel", "football"],
    perSport,
  };
}

/** Hassan's football tab in the mockup (3a, 3c). */
function hassan(options: Parameters<typeof cabinetOf>[1] = {}) {
  return cabinetOf(
    [
      coin("mvp", WED_4_NOV, { decidedBy: "vote" }),
      coin("mvp", MON_2_NOV, { decidedBy: "vote" }),
      coin("mvp", TUE_27_OCT, { decidedBy: "organizer" }),
      coin("dynamo", WED_4_NOV, { from: "Ali M" }),
      coin("dynamo", TUE_27_OCT, { from: "Bo F" }),
      coin("let_him_cook", TUE_20_OCT, { from: "Noor S" }),
      coin("mr_fumble", TUE_13_OCT, { from: "Salman H" }),
      coin("clutch", WED_4_NOV, { from: "Ali M" }),
      ...repeat(2, () => coin("clutch", TUE_27_OCT, { from: "Khalid R" })),
      coin("mr_ice", MON_2_NOV, { from: "Hamad A" }),
      coin("mr_ice", TUE_27_OCT, { from: "Hamad A" }),
      coin("goal_machine", TUE_27_OCT, { from: "Bo F" }),
      coin("goal_machine", TUE_20_OCT, { from: "Bo F" }),
    ],
    options,
  );
}

describe("cabinetRowModel", () => {
  it("is absent while loading and when Match history visibility hides it", () => {
    expect(cabinetRowModel(undefined, "football", "en")).toBeNull();
    expect(cabinetRowModel({ hidden: true }, "football", "en")).toBeNull();
  });

  it("shows the MVP first, then the most received, four at most (3c)", () => {
    const row = cabinetRowModel(hassan(), "football", "en");
    expect(row).toMatchObject({
      title: "Marks",
      meta: "11 received",
      empty: null,
    });
    expect(row?.coins).toEqual([
      {
        kind: "mvp",
        name: "MVP",
        count: { shown: "×3", spoken: "3 received" },
      },
      {
        kind: "clutch",
        name: "Clutch",
        count: { shown: "×3", spoken: "3 received" },
      },
      {
        kind: "dynamo",
        name: "Dynamo",
        count: { shown: "×2", spoken: "2 received" },
      },
      {
        kind: "mr_ice",
        name: "Mr Ice",
        count: { shown: "×2", spoken: "2 received" },
      },
    ]);
  });

  it("keeps the MVP first even when another kind has more (3d)", () => {
    const cabinet = cabinetOf(
      [
        coin("mvp", WED_4_NOV),
        ...repeat(4, () => coin("goal_machine", MON_2_NOV, { from: "Ali" })),
      ],
      { isOwner: false },
    );
    expect(
      cabinetRowModel(cabinet, "football", "en")?.coins.map((c) => c.kind),
    ).toEqual(["mvp", "goal_machine"]);
  });

  it("counts the tab of the profile's sport", () => {
    const cabinet = cabinetOf([
      coin("clutch", WED_4_NOV, { from: "Ali", sport: "padel" }),
    ]);
    expect(cabinetRowModel(cabinet, "padel", "en")?.meta).toBe("1 received");
    expect(cabinetRowModel(cabinet, "football", "en")).toMatchObject({
      meta: "0 received",
      coins: [],
      empty: "No marks yet",
    });
  });

  it("leaves out another player's hidden roasts (3d, E20)", () => {
    const cabinet = cabinetOf(
      [
        ...repeat(3, () => coin("mr_fumble", WED_4_NOV, { from: "Ali" })),
        coin("dynamo", WED_4_NOV, { from: "Ali" }),
      ],
      { isOwner: false, hideRoasts: true },
    );
    const row = cabinetRowModel(cabinet, "football", "en");
    expect(row?.meta).toBe("1 received");
    expect(row?.coins.map((c) => c.kind)).toEqual(["dynamo"]);
  });

  it("reads in Arabic", () => {
    expect(cabinetRowModel(hassan(), "football", "ar")).toMatchObject({
      title: "الأوسمة",
      meta: "11 وسامًا",
    });
  });
});

describe("cabinetTab", () => {
  it("opens on the requested sport when the cabinet has its tab", () => {
    expect(cabinetTab(hassan(), "football")).toBe("football");
    expect(cabinetTab(hassan({ sports: ["padel"] }), "football")).toBe("padel");
    expect(cabinetTab(hassan(), "chess")).toBe("padel");
    expect(cabinetTab(hassan(), undefined)).toBe("padel");
  });
});

describe("cabinetPageModel", () => {
  it("leads with the MVP, how each was decided and the last one (3a)", () => {
    const model = cabinetPageModel(hassan(), "football", 24, "en");
    expect(model.mvp).toMatchObject({
      count: { shown: "×3" },
      name: "MVP",
      earned: true,
      line: "Twice by vote, once by the organizer. Last one Wed 4 Nov, Gooz of Arad",
    });
    expect(model.summary).toEqual({
      received: "11 marks received in 24 games",
      notYet: "5 of 12 kinds not yet",
    });
    expect(model.tabs).toEqual([
      { sport: "padel", label: "Padel" },
      { sport: "football", label: "Football" },
    ]);
  });

  it("says only the marks received until the game count loads", () => {
    expect(
      cabinetPageModel(hassan(), "football", null, "en").summary.received,
    ).toBe("11 marks received");
  });

  it("shows a not-yet MVP on paper", () => {
    const model = cabinetPageModel(cabinetOf([]), "padel", 0, "en");
    expect(model.mvp).toMatchObject({
      count: null,
      earned: false,
      line: "Not yet",
    });
    expect(model.summary).toEqual({
      received: "0 marks received in 0 games",
      notYet: "12 of 12 kinds not yet",
    });
    expect(model.sections.flatMap((s) => s.rows)).toHaveLength(11);
  });

  it("groups the kinds by Giver group with counts and last-from lines", () => {
    const model = cabinetPageModel(hassan(), "football", 24, "en");
    expect(
      model.sections.map(({ group, title, meta }) => ({ group, title, meta })),
    ).toEqual([
      { group: "teammate", title: "From teammates", meta: "4 kinds" },
      { group: "anyone", title: "From anyone", meta: "3 kinds in football" },
      { group: "opponent", title: "From opponents", meta: "4 kinds" },
    ]);
    const [teammates, anyone] = model.sections;
    expect(teammates?.rows).toEqual([
      {
        kind: "dynamo",
        name: "Dynamo",
        sub: "Last from Ali M, 4 Nov",
        count: { shown: "×2", spoken: "2 received" },
        earned: true,
      },
      expect.objectContaining({
        kind: "let_him_cook",
        sub: "From Noor S, 20 Oct",
        count: { shown: "×1", spoken: "1 received" },
      }),
      expect.objectContaining({
        kind: "mr_fumble",
        sub: "From Salman H, 13 Oct",
      }),
      {
        kind: "sayed_malek",
        name: "Sayed Malek",
        sub: "Not yet",
        count: null,
        earned: false,
      },
    ]);
    expect(anyone?.rows.map((row) => row.kind)).toEqual([
      "clutch",
      "mr_ice",
      "goal_machine",
    ]);
  });

  it("captions the owner's hidden roasts and offers the toggle (D6)", () => {
    const model = cabinetPageModel(
      hassan({ hideRoasts: true }),
      "football",
      24,
      "en",
    );
    const teammates = model.sections[0]?.rows ?? [];
    expect(teammates.map((row) => row.sub)).toEqual([
      "Last from Ali M, 4 Nov",
      "From Noor S, 20 Oct",
      "From Salman H, 13 Oct. Hidden from others",
      "Not yet. Hidden from others",
    ]);
    expect(model.roasts).toEqual({
      title: "Hide roasts from my profile",
      help: "Mr Fumble and Sayed Malek. Still visible inside each game.",
      hidden: true,
    });
    expect(
      cabinetPageModel(hassan(), "football", 24, "en").roasts?.hidden,
    ).toBe(false);
  });

  it("gives another viewer no trace of hidden roasts and no toggle (3d)", () => {
    const model = cabinetPageModel(
      hassan({ isOwner: false, hideRoasts: true }),
      "football",
      24,
      "en",
    );
    expect(model.roasts).toBeNull();
    expect(model.sections[0]).toMatchObject({ meta: "2 kinds" });
    expect(model.sections[0]?.rows.map((row) => row.kind)).toEqual([
      "dynamo",
      "let_him_cook",
    ]);
    expect(model.summary).toEqual({
      received: "10 marks received in 24 games",
      notYet: "4 of 10 kinds not yet",
    });
  });

  it("names the padel-only kind on the padel tab", () => {
    const model = cabinetPageModel(hassan(), "padel", 31, "en");
    expect(model.sections[1]).toMatchObject({ meta: "3 kinds in padel" });
    expect(model.sections[1]?.rows.map((row) => row.kind)).toContain(
      "smash_machine",
    );
  });

  it("reads in Arabic", () => {
    const model = cabinetPageModel(hassan(), "football", 24, "ar");
    expect(model.summary.received).toBe("11 وسامًا في 24 مباراة");
    expect(model.mvp.line).toBe(
      `مرتان بالتصويت ومرة من المنظّم. آخرها الأربعاء 4 نوفمبر، ${isolate("Gooz of Arad")}`,
    );
    expect(model.sections.map((section) => section.meta)).toEqual([
      "4 أنواع",
      "3 أنواع في كرة القدم",
      "4 أنواع",
    ]);
    expect(model.sections[0]?.rows[0]?.sub).toBe(
      `آخرها من ${isolate("Ali M")}، ${isolate("4 نوفمبر")}`,
    );
  });
});

describe("cabinetGameLabel", () => {
  it("prefers the Game's own name, then its Group, then its window", () => {
    expect(cabinetGameLabel(GAME, "en")).toBe("Gooz of Arad");
    expect(
      cabinetGameLabel(
        { ...GAME, name: "Thursday padel", hasCustomName: true },
        "en",
      ),
    ).toBe("Thursday padel");
    expect(cabinetGameLabel({ ...GAME, groupName: null }, "en")).not.toBe(
      "Gooz of Arad",
    );
  });
});

function detailOf(
  kind: CoinKind,
  rows: Partial<KindDetail["rows"][number]>[],
  options: { sport?: Sport; hiddenFromOthers?: boolean } = {},
): KindDetail {
  const sport = options.sport ?? "football";
  return {
    kind,
    sport,
    isOwner: true,
    hiddenFromOthers: options.hiddenFromOthers ?? false,
    rows: rows.map((row, index) => ({
      gameId: `game-${index}`,
      matchId: `match-${index}`,
      game: GAME,
      playedAt: WED_4_NOV,
      sport,
      score: null,
      outcome: null,
      giver: null,
      relation: null,
      decidedBy: null,
      canOpenGame: false,
      ...row,
    })),
  };
}

describe("markDetailModel", () => {
  const clutch = detailOf("clutch", [
    {
      giver: { userId: "u1", name: "Ali Mansoor", image: null },
      relation: "teammate",
      score: [{ us: 18, them: 9 }],
      playedAt: WED_4_NOV,
      canOpenGame: true,
    },
    {
      giver: { userId: "u2", name: "Bo Fareed", image: null },
      relation: "opponent",
      score: [{ us: 12, them: 9 }],
      playedAt: MON_2_NOV,
    },
    {
      giver: { userId: "u3", name: "Khalid R", image: null },
      relation: "opponent",
      score: [{ us: 7, them: 7 }],
      playedAt: TUE_27_OCT,
    },
  ]);

  it("heads with the coin's name, count and who may give it (3b)", () => {
    expect(markDetailModel(clutch, ["padel", "football"], "en")).toMatchObject({
      kind: "clutch",
      name: "Clutch",
      count: { shown: "×3", spoken: "3 received" },
      description:
        "Won the points that mattered. Anyone in the game can give it.",
      caption: null,
      empty: null,
      footer: "First one Tue 27 Oct. Padel marks show under the Padel tab",
    });
  });

  it("lists giver, side, Game, score and date, newest first", () => {
    const [first, second] = markDetailModel(clutch, ["football"], "en").rows;
    expect(first).toEqual({
      key: "game-0-0",
      gameHref: "/dashboard/games/game-0",
      giver: { name: "Ali Mansoor", image: null },
      title: "Ali Mansoor",
      relation: "Teammate",
      sub: "Gooz of Arad, Fantasy Football Center",
      score: "18–9",
      date: "Wed 4 Nov",
    });
    expect(second).toMatchObject({
      relation: "Opponent",
      date: "Mon 2 Nov",
      gameHref: null,
    });
  });

  it("leaves out the other-tab note when the owner has no such tab", () => {
    expect(markDetailModel(clutch, ["football"], "en").footer).toBe(
      "First one Tue 27 Oct",
    );
    const smash = detailOf(
      "smash_machine",
      [{ giver: { userId: "u1", name: "Ali", image: null } }],
      { sport: "padel" },
    );
    expect(markDetailModel(smash, ["padel", "football"], "en").footer).toBe(
      "First one Wed 4 Nov",
    );
  });

  it("says how each MVP was decided", () => {
    const mvp = detailOf("mvp", [
      { decidedBy: "vote" },
      { decidedBy: "organizer" },
      { decidedBy: "tie_break" },
    ]);
    const model = markDetailModel(mvp, ["padel", "football"], "en");
    expect(model.description).toBe("Most valuable player, one per game.");
    expect(model.rows.map((row) => [row.giver, row.title])).toEqual([
      [null, "By vote"],
      [null, "Organizer’s pick"],
      [null, "Tied vote, Organizer’s pick"],
    ]);
    expect(model.footer).toBe(
      "First one Wed 4 Nov. Padel MVPs show under the Padel tab",
    );
  });

  it("captions a roast the owner hides and reads empty as not yet", () => {
    const model = markDetailModel(
      detailOf("sayed_malek", [], { hiddenFromOthers: true }),
      ["football"],
      "en",
    );
    expect(model).toMatchObject({
      count: { shown: "×0" },
      caption: "Hidden from others",
      empty: "Not yet",
      footer: null,
    });
  });

  it("reads in Arabic", () => {
    const model = markDetailModel(clutch, ["padel", "football"], "ar");
    expect(model.description).toBe(
      "فاز بالنقاط المهمة. يمكن لأي لاعب في المباراة منحه.",
    );
    expect(model.footer).toBe(
      "الأول الثلاثاء 27 أكتوبر. أوسمة البادل تظهر تحت تبويب بادل",
    );
  });
});

describe("detailScore", () => {
  it("writes each Set from the owner's side", () => {
    expect(
      detailScore([
        { us: 6, them: 4 },
        { us: 6, them: 3 },
      ]),
    ).toBe("6–4 6–3");
    expect(detailScore(null)).toBeNull();
    expect(detailScore([])).toBeNull();
  });
});
