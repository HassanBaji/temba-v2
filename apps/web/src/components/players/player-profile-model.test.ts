import { describe, expect, it } from "vitest";

import { createPlayerProfileFixtures } from "@repo/domain/player-profile-fixtures";

import type { RouterOutputs } from "~/trpc/react";

import {
  footballProfileModel,
  padelProfileModel,
} from "./player-profile-model";

const fixtures = createPlayerProfileFixtures();

const FOOTBALL: RouterOutputs["users"]["footballProfile"] = {
  player: { id: "player-1", name: "Bo Fareed", image: null, isViewer: false },
  historyHidden: false,
  sports: ["football", "padel"],
  venue: { name: "Fantasy Football Center" },
  rating: null,
  role: { role: "outfield", position: "mid" },
  overall: { played: 2, won: 1, lost: 1, drawn: 0, goals: 1 },
  streaks: { current: 1, best: 1, bestReachedAt: null },
  lastMatches: [
    {
      matchId: "match-2",
      gameId: "game-2",
      playedAt: "2026-11-04T16:00:00.000Z",
      outcome: "won",
      score: { us: 18, them: 9 },
      goals: 1,
      game: {
        name: null,
        hasCustomName: false,
        windowStart: null,
        windowEnd: null,
        groupName: "Gooz of Arad",
        venueName: "Fantasy Football Center",
      },
      canOpenGame: true,
    },
    {
      matchId: "match-1",
      gameId: "game-1",
      playedAt: "2026-11-02T16:00:00.000Z",
      outcome: "lost",
      score: { us: 9, them: 12 },
      goals: 0,
      game: {
        name: null,
        hasCustomName: false,
        windowStart: null,
        windowEnd: null,
        groupName: "Gooz of Arad",
        venueName: "Fantasy Football Center",
      },
      canOpenGame: false,
    },
  ],
  partners: [],
  withViewer: {
    together: { played: 0, won: 0, lost: 0, drawn: 0 },
    against: { played: 0, won: 0, lost: 0, drawn: 0 },
    sharedGroups: ["Gooz of Arad"],
  },
};

describe("padelProfileModel", () => {
  it("links the recent rows to the Match sheet and See all to the Last 10 page", () => {
    const model = padelProfileModel(fixtures.confirmed, "en");
    const userId = fixtures.confirmed.player.id;
    expect(model.rows).toHaveLength(3);
    expect(model.rows[0]).toMatchObject({
      title: "Tuesday Crew",
      sub: "Thu 1 Oct, with Jonas B",
      href: `/dashboard/players/${userId}/matches?match=match-2026-10-01`,
    });
    expect(model.seeAll).toEqual({
      label: "See all 10 games",
      href: `/dashboard/players/${userId}/matches`,
    });
    expect(model.partners?.rows[0]).toMatchObject({
      name: "Jonas Berg",
      record: "9–3",
    });
  });
});

describe("footballProfileModel", () => {
  it("reads an early football profile with the sport switch", () => {
    const model = footballProfileModel(FOOTBALL, "en");
    expect(model.subtitle).toBe("Midfield, plays at Fantasy Football Center");
    expect(model.level).toMatchObject({ kind: "none", label: "Level" });
    expect(model.early).toMatchObject({
      title: "2 games so far",
      since: "since 2 Nov",
    });
    expect(model.streaks).toBeNull();
    expect(model.form).toMatchObject({ title: "Games", record: "2 played" });
    expect(model.rows.map((row) => row.href)).toEqual([
      "/dashboard/games/game-2",
      null,
    ]);
    expect(model.withViewer).toMatchObject({
      title: "You and Bo",
      empty: "No games together yet.",
      groups: "Both in Gooz of Arad",
    });
  });
});
