import { generateRounds, seededRandom } from "@repo/domain/tournament-pairing";
import { poolRoundSlots } from "@repo/domain/tournament-schedule";
import type { TournamentFixture } from "@repo/domain/tournament-details-fixtures";
import {
  pointsForOutcome,
  scoreStandsAt,
  tournamentScoreOutcome,
} from "@repo/domain/tournament-round-state";
import {
  resolveRoundCount,
  suggestedRoundCount,
} from "@repo/domain/tournament-sizing";

import type {
  RoundsMatch,
  RoundsRound,
  TournamentRoundsData,
} from "~/components/games/tournament-round-parts";
import type { TournamentRoundsActions } from "~/components/games/use-tournament-rounds";

export type RoundsPreviewVariant = "empty" | "drafted" | "live" | "finished";

const SCORES: readonly [number, number][] = [
  [6, 3],
  [6, 4],
  [4, 6],
  [5, 5],
  [3, 6],
  [6, 2],
];

function stub<Output>(output: Output) {
  return {
    isPending: false,
    mutateAsync: () => Promise.resolve(output),
  };
}

export const previewRoundsActions: TournamentRoundsActions = {
  generate: stub({ roundNumbers: [], repeats: [] }),
  save: {
    isPending: false,
    mutateAsync: (input) => Promise.resolve({ pairings: input.pairings }),
  },
  swap: stub({ repeats: [] }),
  post: stub({ ok: true as const, matchCount: 0 }),
  enterScore: stub({ ok: true as const, final: false }),
  confirm: stub({ ok: true as const }),
  notFinished: stub({ ok: true as const }),
};

/**
 * The Rounds a fixture tournament would show in each state: nothing made,
 * every Round drafted, Round 1 played and Round 2 on court, or every Round
 * played.
 */
export function roundsPreviewData(
  game: TournamentFixture,
  variant: RoundsPreviewVariant,
): TournamentRoundsData {
  const drawnTeams = game.gameTeams.filter((team) => team.poolIndex != null);
  const poolIndexes = [
    ...new Set(drawnTeams.map((team) => team.poolIndex ?? 0)),
  ].sort((a, b) => a - b);
  const pools = poolIndexes.map((poolIndex) => ({
    poolIndex,
    gameTeamIds: drawnTeams
      .filter((team) => team.poolIndex === poolIndex)
      .sort((a, b) => (a.sideIndex ?? 0) - (b.sideIndex ?? 0))
      .map((team) => team.id),
  }));
  const sizes = pools.map((pool) => pool.gameTeamIds.length);
  const suggested = suggestedRoundCount(sizes);
  const roundCount = resolveRoundCount(sizes, game.roundCount) ?? 0;
  const courts = game.recordedCourts.length
    ? game.recordedCourts.map((court) => court.name)
    : ["Court 1", "Court 2", "Court 3", "Court 4"];
  const windowStart = new Date(game.windowStart ?? Date.now());
  const windowEnd = new Date(
    game.windowEnd ?? windowStart.getTime() + 8 * 60 * 60 * 1000,
  );
  const slots = poolRoundSlots({
    poolSizes: sizes,
    roundCount,
    courtIds: courts,
    windowStart,
    windowEnd,
    matchMinutes: game.matchMinutes,
  });
  const made = generateRounds({
    pools,
    suggested,
    roundCount,
    roundNumbers: Array.from({ length: roundCount }, (_, index) => index + 1),
    madeRounds: [],
    random: seededRandom(game.id),
  });
  const viewerTeam = drawnTeams.find((team) =>
    team.members.some((member) => member.id === game.viewerUserId),
  );
  const points = new Map<string, number>();
  const postedThrough =
    variant === "live" ? 2 : variant === "finished" ? roundCount + 1 : 0;

  const rounds: RoundsRound[] = made.map((round) => {
    const roundSlots = slots.get(round.roundNumber) ?? [];
    const posted = round.roundNumber <= postedThrough;
    const drafted = !posted && variant === "drafted";
    const matches: RoundsMatch[] =
      posted || drafted
        ? round.pairings.map((pairing, position) => {
            const slot = roundSlots[position];
            const viewerSlot =
              viewerTeam?.id === pairing.slot1GameTeamId
                ? (1 as const)
                : viewerTeam?.id === pairing.slot2GameTeamId
                  ? (2 as const)
                  : null;
            const played = round.roundNumber < postedThrough;
            const live = round.roundNumber === postedThrough;
            const [first, second] = SCORES[
              (round.roundNumber + position) % SCORES.length
            ] ?? [6, 4];
            let state: RoundsMatch["state"] = drafted ? "draft" : "on_court";
            if (played || (live && position === 0 && viewerSlot == null)) {
              state = "confirmed";
            } else if (live && position === 2 && viewerSlot == null) {
              state = "awaiting_confirmation";
            }
            const scored =
              state === "confirmed" || state === "awaiting_confirmation";
            if (state === "confirmed") {
              const outcome = tournamentScoreOutcome(first, second);
              for (const [teamId, side] of [
                [pairing.slot1GameTeamId, 1],
                [pairing.slot2GameTeamId, 2],
              ] as const) {
                points.set(
                  teamId,
                  (points.get(teamId) ?? 0) + pointsForOutcome(outcome, side),
                );
              }
            }
            const enteredAt = slot?.endTime ?? windowStart;
            return {
              matchId: posted
                ? `${game.id}-r${round.roundNumber}-${position}`
                : null,
              position,
              poolIndex:
                pools.find((pool) =>
                  pool.gameTeamIds.includes(pairing.slot1GameTeamId),
                )?.poolIndex ?? null,
              courtName: slot?.courtId ?? null,
              startTime: slot?.startTime ?? null,
              slot1GameTeamId: pairing.slot1GameTeamId,
              slot2GameTeamId: pairing.slot2GameTeamId,
              state,
              slot1GamesWon: scored ? first : null,
              slot2GamesWon: scored ? second : null,
              enteredBySlot: state === "awaiting_confirmation" ? 2 : null,
              enteredByName: null,
              standsAt:
                state === "awaiting_confirmation"
                  ? scoreStandsAt(enteredAt)
                  : null,
              viewerSlot,
              canEnterScore:
                (game.isOrganizer && state !== "draft") ||
                (viewerSlot != null && state === "on_court"),
              canConfirm: false,
              canMarkNotFinished: viewerSlot != null && state === "on_court",
              canSwap: drafted,
            };
          })
        : [];
    const state: RoundsRound["state"] = drafted
      ? "draft"
      : !posted
        ? "not_made"
        : round.roundNumber < postedThrough
          ? "played"
          : "on_court";
    return {
      roundNumber: round.roundNumber,
      state,
      startTime: roundSlots[0]?.startTime ?? null,
      expectedMatchCount: round.pairings.length,
      slots: roundSlots.map((slot) => ({
        courtName: slot.courtId,
        startTime: slot.startTime,
      })),
      matches,
    };
  });

  return {
    isOrganizer: game.isOrganizer,
    roundCount,
    suggestedRoundCount: suggested,
    poolCount: pools.length,
    courtCount: courts.length,
    matchMinutes: game.matchMinutes ?? 45,
    viewerGameTeamId: viewerTeam?.id ?? null,
    currentRoundNumber:
      variant === "live" && postedThrough > 0 ? postedThrough : null,
    pools,
    teams: drawnTeams.map((team) => ({
      gameTeamId: team.id,
      poolIndex: team.poolIndex ?? 0,
      members: team.members.map((member) => ({
        id: member.id,
        name: member.name,
        image: member.image,
      })),
      points: points.get(team.id) ?? 0,
    })),
    rounds,
  };
}
