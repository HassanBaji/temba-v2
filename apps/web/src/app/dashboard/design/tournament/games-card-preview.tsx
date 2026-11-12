"use client";

import { useMemo } from "react";

import {
  TournamentGamesCard,
  TournamentPlayedCard,
} from "~/components/games/tournament-games-card";
import { createTournamentGamesCardFixtures } from "@repo/domain/tournament-games-card-fixtures";

export function TournamentGamesCardPreview() {
  const fixtures = useMemo(
    () => createTournamentGamesCardFixtures(new Date()),
    [],
  );
  return (
    <section className="space-y-4">
      <h2 className="text-title font-semibold">One card per tournament</h2>
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <ul className="flex flex-col gap-3">
          <TournamentGamesCard game={fixtures.upcoming} lifted />
        </ul>
        <ul className="flex flex-col gap-3">
          <TournamentGamesCard game={fixtures.live} lifted />
        </ul>
        <ul className="flex flex-col gap-3">
          <TournamentGamesCard game={fixtures.upcoming} lifted={false} />
        </ul>
        <ul className="flex flex-col gap-3">
          <TournamentPlayedCard game={fixtures.played} />
        </ul>
        <ul className="flex flex-col gap-3">
          <TournamentPlayedCard game={fixtures.playedWon} />
        </ul>
        <ul className="flex flex-col gap-3">
          <TournamentPlayedCard game={fixtures.playedMissing} />
        </ul>
      </div>
    </section>
  );
}
