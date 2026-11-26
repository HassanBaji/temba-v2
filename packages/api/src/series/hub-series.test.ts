import { describe, expect, it } from "vitest";

import { asDb } from "#src/games/americano.test-support";
import { listMyGamesHubRows } from "#src/games/list-my-games";
import { cancelGame } from "#src/routers/games/cancel";
import { groupById } from "#src/routers/groups/byId";
import {
  SERIES_TEST_NOW,
  newSeries,
  padelGame,
  roundsSocial,
  seriesFixture,
} from "#src/series/series.test-support";

describe("the Series on a hub row", () => {
  it("carries the Series and the Edition number of each Game on the Games list and the Group's Scheduled list", async () => {
    const f = await seriesFixture();
    const seriesId = await newSeries(f, f.padel.id, "Sunday Social");
    const second = await roundsSocial(f, "2026-12-13", seriesId);
    const first = await roundsSocial(f, "2026-12-06", seriesId);
    const loose = await padelGame(f, "2026-12-07");
    const series = (edition: number) => ({
      id: seriesId,
      name: "Sunday Social",
      emblem: "cup",
      colour: "gold",
      edition,
    });

    const hub = await listMyGamesHubRows(
      asDb(f.db),
      f.owner.id,
      SERIES_TEST_NOW,
      "en",
      { groupTournaments: true },
    );
    const onHub = new Map(hub.map((row) => [row.id, row.series]));
    expect(onHub.get(first)).toEqual(series(1));
    expect(onHub.get(second)).toEqual(series(2));
    expect(onHub.get(loose)).toBeNull();

    const group = await groupById(asDb(f.db), {
      groupId: f.padel.id,
      userId: f.member.id,
      now: SERIES_TEST_NOW,
    });
    const onGroup = new Map(
      group.upcomingGames.map((row) => [row.id, row.series]),
    );
    expect(onGroup.get(first)).toEqual(series(1));
    expect(onGroup.get(second)).toEqual(series(2));
    expect(onGroup.get(loose)).toBeNull();
  });

  it("gives a cancelled Game no Series and closes the gap it leaves", async () => {
    const f = await seriesFixture();
    const seriesId = await newSeries(f, f.padel.id, "Sunday Social");
    const first = await roundsSocial(f, "2026-12-06", seriesId);
    const second = await roundsSocial(f, "2026-12-13", seriesId);
    await cancelGame(asDb(f.db), { gameId: first, userId: f.owner.id });

    const hub = await listMyGamesHubRows(
      asDb(f.db),
      f.owner.id,
      SERIES_TEST_NOW,
      "en",
      { groupTournaments: true },
    );
    const onHub = new Map(hub.map((row) => [row.id, row.series]));
    expect(onHub.get(first) ?? null).toBeNull();
    expect(onHub.get(second)?.edition).toBe(1);
  });
});
